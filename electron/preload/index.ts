import { contextBridge, ipcRenderer } from 'electron'
import {
  Channels,
  type PingResponseT,
  type VersionResponseT,
  type ProjectMetaT,
  type ProjectSaveRequestT,
  type ProjectSaveResponseT,
  type ProjectLoadResponseT,
  type BackupMetaT,
  type AiChatRequestT,
  type AiChatResponseT,
  type AiChatStreamRequestT,
  type AiGenerateMediaRequestT,
  type AiGenerateMediaResponseT
} from '@shared/ipc'

const api = {
  ping: (message: string): Promise<PingResponseT> =>
    ipcRenderer.invoke(Channels.AppPing, { message }),
  getVersion: (): Promise<VersionResponseT> =>
    ipcRenderer.invoke(Channels.AppGetVersion),

  project: {
    list: (): Promise<ProjectMetaT[]> => ipcRenderer.invoke(Channels.ProjectList),
    save: (req: ProjectSaveRequestT): Promise<ProjectSaveResponseT> =>
      ipcRenderer.invoke(Channels.ProjectSave, req),
    load: (id: string): Promise<ProjectLoadResponseT> =>
      ipcRenderer.invoke(Channels.ProjectLoad, { id }),
    delete: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke(Channels.ProjectDelete, { id }),
    backup: (id: string): Promise<BackupMetaT> =>
      ipcRenderer.invoke(Channels.ProjectBackup, { id }),
    listBackups: (id: string): Promise<BackupMetaT[]> =>
      ipcRenderer.invoke(Channels.ProjectListBackups, { id }),
    restoreBackup: (id: string, backupId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke(Channels.ProjectRestoreBackup, { id, backupId }),
    openDir: (): Promise<{ ok: true; path: string }> =>
      ipcRenderer.invoke(Channels.ProjectOpenDir)
  },

  ai: {
    chat: (req: AiChatRequestT): Promise<AiChatResponseT> =>
      ipcRenderer.invoke(Channels.AiChat, req),
    chatStream: (req: AiChatStreamRequestT): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke(Channels.AiChatStream, req),
    generateMedia: (req: AiGenerateMediaRequestT): Promise<AiGenerateMediaResponseT> =>
      ipcRenderer.invoke(Channels.AiGenerateMedia, req),
    cancelStream: (requestId: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(Channels.AiChatStreamCancel, { requestId }),
    onStreamToken: (cb: (data: { requestId: string; token: string }) => void) => {
      const handler = (_evt: Electron.IpcRendererEvent, data: { requestId: string; token: string }) => cb(data)
      ipcRenderer.on('ai:stream-token', handler)
      return () => ipcRenderer.removeListener('ai:stream-token', handler)
    },
    onStreamDone: (cb: (data: { requestId: string; content: string }) => void) => {
      const handler = (_evt: Electron.IpcRendererEvent, data: { requestId: string; content: string }) => cb(data)
      ipcRenderer.on('ai:stream-done', handler)
      return () => ipcRenderer.removeListener('ai:stream-done', handler)
    },
    onStreamError: (cb: (data: { requestId: string; error: string }) => void) => {
      const handler = (_evt: Electron.IpcRendererEvent, data: { requestId: string; error: string }) => cb(data)
      ipcRenderer.on('ai:stream-error', handler)
      return () => ipcRenderer.removeListener('ai:stream-error', handler)
    }
  }
}

export type LumenApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('lumen', api)
  } catch (err) {
    console.error('[preload] exposeInMainWorld failed:', err)
  }
} else {
  ;(globalThis as unknown as { lumen: LumenApi }).lumen = api
}
