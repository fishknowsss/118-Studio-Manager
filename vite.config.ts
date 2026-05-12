import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PDFJS_CMAP_ROUTE = '/pdfjs/cmaps/'
const PDFJS_WORKER_ROUTE = '/pdfjs/pdf.worker.mjs'

function pdfjsCMapPlugin(): Plugin {
  const cMapDir = join(__dirname, 'node_modules/pdfjs-dist/cmaps')
  const workerFilePath = join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')

  return {
    name: 'local-pdfjs-cmaps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = decodeURIComponent((req.url || '').split('?')[0] || '')
        const basePath = server.config.base.replace(/\/?$/, '/')
        const workerPaths = Array.from(new Set([PDFJS_WORKER_ROUTE, `${basePath}pdfjs/pdf.worker.mjs`]))
        if (workerPaths.includes(requestPath)) {
          res.setHeader('Content-Type', 'text/javascript')
          res.end(readFileSync(workerFilePath))
          return
        }

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

      this.emitFile({
        type: 'asset',
        fileName: 'pdfjs/pdf.worker.mjs',
        source: readFileSync(workerFilePath),
      })
    },
  }
}

function manualChunks(id: string) {
  if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler')) {
    return 'vendor-react'
  }
  if (id.includes('/node_modules/pdfjs-dist')) {
    return 'pdfjs'
  }
  if (id.includes('/src/views/')) {
    return `view-${basename(id).replace(/\.[^.]+$/, '').toLowerCase()}`
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
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./tests/setup.ts'],
  },
}))
