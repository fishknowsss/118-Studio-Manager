import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PDFJS_CMAP_ROUTE = '/pdfjs/cmaps/'

function pdfjsCMapPlugin(): Plugin {
  const cMapDir = join(__dirname, 'node_modules/pdfjs-dist/cmaps')

  return {
    name: 'local-pdfjs-cmaps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = decodeURIComponent((req.url || '').split('?')[0] || '')
        const basePath = server.config.base.replace(/\/?$/, '/')
        const routePrefixes = Array.from(new Set([PDFJS_CMAP_ROUTE, `${basePath}pdfjs/cmaps/`]))
        const routePrefix = routePrefixes.find((prefix) => requestPath.startsWith(prefix))

        if (!routePrefix) {
          next()
          return
        }

        const fileName = requestPath.slice(routePrefix.length)
        if (!fileName || fileName.includes('/') || fileName.includes('..')) {
          res.statusCode = 404
          res.end()
          return
        }

        const filePath = join(cMapDir, fileName)
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          res.statusCode = 404
          res.end()
          return
        }

        res.setHeader('Content-Type', 'application/octet-stream')
        res.end(readFileSync(filePath))
      })
    },
    generateBundle() {
      for (const fileName of readdirSync(cMapDir)) {
        const filePath = join(cMapDir, fileName)
        if (!statSync(filePath).isFile()) continue

        this.emitFile({
          type: 'asset',
          fileName: `pdfjs/cmaps/${fileName}`,
          source: readFileSync(filePath),
        })
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build'
    ? (process.env.DEPLOY_BASE || '/')
    : '/',
  plugins: [react(), pdfjsCMapPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./tests/setup.ts'],
  },
}))
