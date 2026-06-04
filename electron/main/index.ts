import { app, BrowserWindow, shell, protocol, net } from 'electron'
import path, { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { initDataPaths } from '@services/db'
import { registerIpc } from './ipc'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

protocol.registerSchemesAsPrivileged([
  { scheme: 'lumen-media', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true, corsEnabled: true } }
])

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDataPaths()
  protocol.handle('lumen-media', async (request) => {
    try {
      // raw URL: lumen-media:///C:/Users/... or lumen-media:///C%3A/Users/...
      let filePath = decodeURIComponent(request.url.replace(/^lumen-media:\/\/\/?/, ''))
      // Normalise forward slashes
      filePath = filePath.replace(/\//g, path.sep)
      const fileUrl = pathToFileURL(filePath)
      console.log('[lumen-media]', request.url, '->', fileUrl.href)
      return await net.fetch(fileUrl.href)
    } catch (err) {
      console.error('[lumen-media] error:', err)
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
    }
  })
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
