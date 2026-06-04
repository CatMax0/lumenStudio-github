import { resolve } from 'node:path'
import { existsSync, createReadStream } from 'node:fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function mediaServePlugin(): Plugin {
  const dirs = [
    resolve(process.env.APPDATA || '', 'lumen-studio', 'generated'),
    resolve(__dirname, 'test-output')
  ]
  return {
    name: 'lumen-media-serve',
    configureServer(server) {
      server.middlewares.use('/media', (req, res, next) => {
        const filename = decodeURIComponent((req.url || '').replace(/^\//, '').split('?')[0])
        if (!filename) return next()
        for (const dir of dirs) {
          const full = resolve(dir, filename)
          if (existsSync(full)) {
            const ext = filename.split('.').pop()?.toLowerCase()
            const mime = ext === 'mp4' ? 'video/mp4' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'application/octet-stream'
            res.setHeader('Content-Type', mime)
            createReadStream(full).pipe(res)
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main/index.ts') }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'shared'),
        '@main': resolve(__dirname, 'electron/main'),
        '@services': resolve(__dirname, 'electron/services')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload/index.ts') }
      }
    },
    resolve: {
      alias: { '@shared': resolve(__dirname, 'shared') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/index.html') }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'shared')
      }
    },
    plugins: [react(), mediaServePlugin()]
  }
})
