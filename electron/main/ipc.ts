import { app, ipcMain, shell } from 'electron'
import { ZodError } from 'zod'
import {
  Channels,
  PingRequest,
  ProjectSaveRequest,
  ProjectLoadRequest,
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

function formatIpcError(channel: string, err: unknown): Error {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    console.error(`[ipc][${channel}] validation error:`, details)
    return new Error(`参数校验失败: ${details}`)
  }
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[ipc][${channel}] error:`, msg)
  return err instanceof Error ? err : new Error(msg)
}

export function registerIpc(): void {
  ipcMain.handle(Channels.AppPing, async (_evt, raw): Promise<PingResponseT> => {
    try {
      const { message } = PingRequest.parse(raw)
      return { pong: `pong: ${message}`, time: Date.now() }
    } catch (err) {
      throw formatIpcError(Channels.AppPing, err)
    }
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
  ipcMain.handle(Channels.ProjectList, async () => {
    try {
      return await listProjects()
    } catch (err) {
      throw formatIpcError(Channels.ProjectList, err)
    }
  })

  ipcMain.handle(Channels.ProjectSave, async (_evt, raw) => {
    try {
      const req = ProjectSaveRequest.parse(raw)
      return await saveProject(req)
    } catch (err) {
      throw formatIpcError(Channels.ProjectSave, err)
    }
  })

  ipcMain.handle(Channels.ProjectLoad, async (_evt, raw) => {
    try {
      const { id } = ProjectLoadRequest.parse(raw)
      return await loadProject(id)
    } catch (err) {
      throw formatIpcError(Channels.ProjectLoad, err)
    }
  })

  ipcMain.handle(Channels.ProjectDelete, async (_evt, raw) => {
    try {
      const { id } = ProjectLoadRequest.parse(raw)
      await deleteProject(id)
      return { ok: true }
    } catch (err) {
      throw formatIpcError(Channels.ProjectDelete, err)
    }
  })

  ipcMain.handle(Channels.ProjectBackup, async (_evt, raw) => {
    try {
      const { id } = ProjectLoadRequest.parse(raw)
      return await manualBackup(id)
    } catch (err) {
      throw formatIpcError(Channels.ProjectBackup, err)
    }
  })

  ipcMain.handle(Channels.ProjectListBackups, async (_evt, raw) => {
    try {
      const { id } = ProjectLoadRequest.parse(raw)
      return await listBackups(id)
    } catch (err) {
      throw formatIpcError(Channels.ProjectListBackups, err)
    }
  })

  ipcMain.handle(
    Channels.ProjectRestoreBackup,
    async (_evt, raw: { id: string; backupId: string }) => {
      try {
        await restoreBackup(raw.id, raw.backupId)
        return { ok: true }
      } catch (err) {
        throw formatIpcError(Channels.ProjectRestoreBackup, err)
      }
    }
  )

  ipcMain.handle(Channels.ProjectOpenDir, async () => {
    try {
      const p = getProjectsRootPath()
      await shell.openPath(p)
      return { ok: true, path: p }
    } catch (err) {
      throw formatIpcError(Channels.ProjectOpenDir, err)
    }
  })

  // ===== AI =====
  ipcMain.handle(Channels.AiChat, async (_evt, raw): Promise<AiChatResponseT> => {
    try {
      const req = AiChatRequest.parse(raw)
      return await aiChatCompletion(req)
    } catch (err) {
      throw formatIpcError(Channels.AiChat, err)
    }
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
      console.error(`[ipc][${Channels.AiChatStream}] error:`, message)
      sender.send('ai:stream-error', { requestId, error: message })
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(Channels.AiChatStreamCancel, async (_evt, raw: { requestId: string }) => {
    activeStreams.set(raw.requestId, false)
    return { ok: true }
  })

  ipcMain.handle(Channels.AiGenerateMedia, async (_evt, raw) => {
    try {
      const req = AiGenerateMediaRequest.parse(raw)
      return await generateMedia(req)
    } catch (err) {
      throw formatIpcError(Channels.AiGenerateMedia, err)
    }
  })
}
