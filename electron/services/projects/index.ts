/**
 * 项目文件管理 (本地)
 *
 * 目录结构:
 *   <userData>/projects/
 *     <projectId>/
 *       project.json          // 当前数据 (含 meta + data)
 *       backups/
 *         <ts>.json            // 时间戳备份
 *
 * 后期 OSS 备份: 在 saveProject 之后调用 oss 上传 hook (TODO)
 */

import { app } from 'electron'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type {
  ProjectMetaT,
  ProjectSaveRequestT,
  ProjectSaveResponseT,
  ProjectLoadResponseT,
  BackupMetaT
} from '@shared/ipc'

const PROJECT_FILE = 'project.json'
const BACKUP_DIR = 'backups'
const MAX_BACKUPS = 30

function getProjectsRoot(): string {
  return path.join(app.getPath('userData'), 'projects')
}

function getProjectDir(id: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`非法 projectId: ${id}`)
  }
  return path.join(getProjectsRoot(), id)
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function safeWrite(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath))
  const tmp = `${filePath}.tmp`
  await fs.writeFile(tmp, content, 'utf8')
  await fs.rename(tmp, filePath)
}

// ===== 列表 =====
export async function listProjects(): Promise<ProjectMetaT[]> {
  const root = getProjectsRoot()
  if (!(await fileExists(root))) return []
  const dirs = await fs.readdir(root, { withFileTypes: true })
  const out: ProjectMetaT[] = []
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const file = path.join(root, d.name, PROJECT_FILE)
    if (!(await fileExists(file))) continue
    try {
      const content = await fs.readFile(file, 'utf8')
      const parsed = JSON.parse(content) as { meta?: ProjectMetaT }
      if (parsed?.meta) out.push(parsed.meta)
    } catch (err) {
      console.warn('[projects] failed to read meta', file, err)
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

// ===== 保存 =====
export async function saveProject(req: ProjectSaveRequestT): Promise<ProjectSaveResponseT> {
  const dir = getProjectDir(req.id)
  await ensureDir(dir)

  const filePath = path.join(dir, PROJECT_FILE)
  const now = Date.now()

  // 读现有 meta (保留 createdAt)
  let createdAt = now
  if (await fileExists(filePath)) {
    try {
      const existing = JSON.parse(await fs.readFile(filePath, 'utf8')) as { meta?: ProjectMetaT }
      if (existing?.meta?.createdAt) createdAt = existing.meta.createdAt
    } catch (readErr) {
      console.warn(`[projects] corrupted project file for ${req.id}, triggering backup:`, readErr)
      req = { ...req, createBackup: true }
    }
  }

  const meta: ProjectMetaT = {
    id: req.id,
    name: req.name,
    createdAt,
    updatedAt: now
  }

  const payload = JSON.stringify({ meta, data: req.data }, null, 2)

  // 自动备份 (在覆盖之前)
  if (req.createBackup && (await fileExists(filePath))) {
    await backupProject(req.id, await fs.readFile(filePath, 'utf8'))
  }

  await safeWrite(filePath, payload)
  await trimBackups(req.id)

  return { ok: true, id: req.id, savedAt: now, filePath }
}

// ===== 加载 =====
export async function loadProject(id: string): Promise<ProjectLoadResponseT> {
  const filePath = path.join(getProjectDir(id), PROJECT_FILE)
  const content = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(content) as ProjectLoadResponseT
  return parsed
}

// ===== 删除 =====
export async function deleteProject(id: string): Promise<void> {
  const dir = getProjectDir(id)
  if (!(await fileExists(dir))) return
  await fs.rm(dir, { recursive: true, force: true })
}

// ===== 备份 =====
async function backupProject(id: string, content: string): Promise<BackupMetaT> {
  const dir = path.join(getProjectDir(id), BACKUP_DIR)
  await ensureDir(dir)
  const ts = Date.now()
  const backupId = String(ts)
  const filePath = path.join(dir, `${backupId}.json`)
  await fs.writeFile(filePath, content, 'utf8')
  const stat = await fs.stat(filePath)
  return { id: backupId, projectId: id, createdAt: ts, size: stat.size }
}

export async function manualBackup(id: string): Promise<BackupMetaT> {
  const file = path.join(getProjectDir(id), PROJECT_FILE)
  if (!(await fileExists(file))) throw new Error('项目尚未保存, 无法备份')
  const content = await fs.readFile(file, 'utf8')
  const meta = await backupProject(id, content)
  await trimBackups(id)
  return meta
}

export async function listBackups(id: string): Promise<BackupMetaT[]> {
  const dir = path.join(getProjectDir(id), BACKUP_DIR)
  if (!(await fileExists(dir))) return []
  const files = await fs.readdir(dir)
  const out: BackupMetaT[] = []
  for (const name of files) {
    if (!name.endsWith('.json')) continue
    const filePath = path.join(dir, name)
    const stat = await fs.stat(filePath)
    const backupId = name.replace(/\.json$/, '')
    out.push({
      id: backupId,
      projectId: id,
      createdAt: Number(backupId) || stat.mtimeMs,
      size: stat.size
    })
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

export async function restoreBackup(id: string, backupId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]+$/.test(backupId)) {
    throw new Error(`非法 backupId: ${backupId}`)
  }
  const backupFile = path.join(getProjectDir(id), BACKUP_DIR, `${backupId}.json`)
  if (!(await fileExists(backupFile))) throw new Error('备份不存在')
  // 先把当前文件做一次自动备份
  const cur = path.join(getProjectDir(id), PROJECT_FILE)
  if (await fileExists(cur)) {
    await backupProject(id, await fs.readFile(cur, 'utf8'))
  }
  const content = await fs.readFile(backupFile, 'utf8')
  await safeWrite(cur, content)
}

async function trimBackups(id: string): Promise<void> {
  const list = await listBackups(id)
  if (list.length <= MAX_BACKUPS) return
  const drop = list.slice(MAX_BACKUPS)
  await Promise.all(
    drop.map((b) =>
      fs
        .unlink(path.join(getProjectDir(id), BACKUP_DIR, `${b.id}.json`))
        .catch((unlinkErr) => console.warn(`[projects] failed to trim backup ${b.id}:`, unlinkErr))
    )
  )
}

export function getProjectsRootPath(): string {
  return getProjectsRoot()
}
