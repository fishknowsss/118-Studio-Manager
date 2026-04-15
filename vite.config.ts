import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build'
    ? (process.env.DEPLOY_BASE || '/')
    : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
}))
