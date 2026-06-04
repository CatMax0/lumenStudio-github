import { app } from 'electron'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

let dataRoot: string | null = null
let projectsRoot: string | null = null

/**
 * Skeleton bootstrap: ensure project data directories exist.
 * SQLite (better-sqlite3) is intentionally deferred until the first
 * persisted entity exists, to avoid native build dependencies in skeleton.
 */
export async function initDataPaths(): Promise<void> {
  const userData = app.getPath('userData')
  const projects = join(userData, 'projects')
  await mkdir(projects, { recursive: true })
  dataRoot = userData
  projectsRoot = projects
}

export function getDataRoot(): string {
  if (!dataRoot) throw new Error('data paths not initialized')
  return dataRoot
}

export function getProjectsRoot(): string {
  if (!projectsRoot) throw new Error('data paths not initialized')
  return projectsRoot
}
