import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'electron/main'),
      '@services': resolve(__dirname, 'electron/services')
    }
  },
  test: {
    globals: true,
    include: ['**/*.test.ts']
  }
})
