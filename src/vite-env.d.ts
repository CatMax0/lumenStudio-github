/// <reference types="vite/client" />

import type { LumenApi } from '../electron/preload'

declare global {
  interface Window {
    lumen: LumenApi
  }
}

export {}
