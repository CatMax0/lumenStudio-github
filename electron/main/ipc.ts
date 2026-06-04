import { app, ipcMain, shell } from 'electron'
import {
  Channels,
  PingRequest,
  ProjectSaveRequest,
  ProjectLoadRequest,
  ProjectRestoreBackupRequest,
  AiChatRequest,
  AiChatStreamRequest,
  AiGenerateMediaRequest,
  type PingResponseT,
  type VersionResponseT,
  type AiChatResponseT
} from '@shared/ipc'
import {
  listProjects,
  saveProject,
  loadProject,
  deleteProject,
  manualBackup,
  listBackups,
  restoreBackup,
  getProjectsRootPath
} from '../services/projects'
import {
  chatCompletion as aiChatCompletion,
  chatCompletionStream as aiChatStream
} from '../services/ai'
import { generateMedia } from '../services/ai/media'

export function registerIpc(): void {
  ipcMain.handle(Channels.AppPing, async (_evt, raw): Promise<PingResponseT> => {
    const { message } = PingRequest.parse(raw)
    return { pong: `pong: ${message}`, time: Date.now() }
  })

  ipcMain.handle(Channels.AppGetVersion, async (): Promise<VersionResponseT> => {
    return {
      app: app.getVersion(),
      electron: process.versions.electron ?? '',
      chrome: process.versions.chrome ?? '',
      node: process.versions.node ?? ''
    }
  })

  // ===== 项目文件 =====
  ipcMain.handle(Channels.ProjectList, async () => listProjects())

  ipcMain.handle(Channels.ProjectSave, async (_evt, raw) => {
    const req = ProjectSaveRequest.parse(raw)
    return saveProject(req)
  })

  ipcMain.handle(Channels.ProjectLoad, async (_evt, raw) => {
    const { id } = ProjectLoadRequest.parse(raw)
    return loadProject(id)
  })

  ipcMain.handle(Channels.ProjectDelete, async (_evt, raw) => {
    const { id } = ProjectLoadRequest.parse(raw)
    await deleteProject(id)
    return { ok: true }
  })

  ipcMain.handle(Channels.ProjectBackup, async (_evt, raw) => {
    const { id } = ProjectLoadRequest.parse(raw)
    return manualBackup(id)
  })

  ipcMain.handle(Channels.ProjectListBackups, async (_evt, raw) => {
    const { id } = ProjectLoadRequest.parse(raw)
    return listBackups(id)
  })

  ipcMain.handle(
    Channels.ProjectRestoreBackup,
    async (_evt, raw) => {
      const { id, backupId } = ProjectRestoreBackupRequest.parse(raw)
      await restoreBackup(id, backupId)
      return { ok: true }
    }
  )

  ipcMain.handle(Channels.ProjectOpenDir, async () => {
    const p = getProjectsRootPath()
    await shell.openPath(p)
    return { ok: true, path: p }
  })

  // ===== AI =====
  ipcMain.handle(Channels.AiChat, async (_evt, raw): Promise<AiChatResponseT> => {
    const req = AiChatRequest.parse(raw)
    return aiChatCompletion(req)
  })

  // 流式: 用 webContents.send 逐 token 推送
  const activeStreams = new Map<string, boolean>()

  ipcMain.handle(Channels.AiChatStream, async (evt, raw) => {
    const req = AiChatStreamRequest.parse(raw)
    const { requestId, ...chatReq } = req
    activeStreams.set(requestId, true)

    const sender = evt.sender
    try {
      const result = await aiChatStream(chatReq, (token) => {
        if (!activeStreams.get(requestId)) return
        sender.send('ai:stream-token', { requestId, token })
      })
      activeStreams.delete(requestId)
      sender.send('ai:stream-done', { requestId, content: result.content })
      return { ok: true }
    } catch (err: unknown) {
      activeStreams.delete(requestId)
      const message = err instanceof Error ? err.message : String(err)
      sender.send('ai:stream-error', { requestId, error: message })
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(Channels.AiChatStreamCancel, async (_evt, raw: { requestId: string }) => {
    activeStreams.set(raw.requestId, false)
    return { ok: true }
  })

  ipcMain.handle(Channels.AiGenerateMedia, async (_evt, raw) => {
    const req = AiGenerateMediaRequest.parse(raw)
    return generateMedia(req)
  })
}
