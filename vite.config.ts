import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build'
    ? (process.env.DEPLOY_BASE || '/118-Studio-Manager/vc/')
    : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
