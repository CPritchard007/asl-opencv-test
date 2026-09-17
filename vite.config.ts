import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

function githubPagesBase(): string {
  const explicit = process.env.BASE_PATH
  if (explicit) {
    return explicit.endsWith('/') ? explicit : `${explicit}/`
  }

  const repository = process.env.GITHUB_REPOSITORY
  if (process.env.GITHUB_ACTIONS && repository) {
    const name = repository.split('/')[1] ?? ''
    if (name.endsWith('.github.io')) {
      return '/'
    }
    return `/${name}/`
  }

  return '/'
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [
    vue(),
    {
      name: 'github-pages-404',
      closeBundle() {
        const dist = fileURLToPath(new URL('./dist', import.meta.url))
        const index = `${dist}/index.html`
        if (existsSync(index)) {
          copyFileSync(index, `${dist}/404.html`)
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
    },
  },
})
