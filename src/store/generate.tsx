import { createContext, useContext, useState, useCallback } from 'react'
import type { GenerateTask, GenerateTaskType } from '../types/project'
import { uid } from '../utils/uid'

interface GenerateState {
  tasks: GenerateTask[]
  runningId: string | null
}

interface GenerateActions {
  enqueue: (type: GenerateTaskType, meta?: { shotId?: string; assetId?: string; providerId?: string }) => string
  updateTask: (id: string, patch: Partial<GenerateTask>) => void
  removeTask: (id: string) => void
  clearDone: () => void
  setRunning: (id: string | null) => void
}

type Ctx = GenerateState & GenerateActions

const GenerateCtx = createContext<Ctx | null>(null)

export function GenerateProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<GenerateTask[]>([])
  const [runningId, setRunningId] = useState<string | null>(null)

  const enqueue = useCallback((type: GenerateTaskType, meta?: { shotId?: string; assetId?: string; providerId?: string }): string => {
    const id = uid()
    const task: GenerateTask = {
      id,
      type,
      shotId: meta?.shotId,
      assetId: meta?.assetId,
      providerId: meta?.providerId,
      status: 'queued',
      progress: 0
    }
    setTasks((xs) => [...xs, task])
    return id
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<GenerateTask>) => {
    setTasks((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((xs) => xs.filter((t) => t.id !== id))
  }, [])

  const clearDone = useCallback(() => {
    setTasks((xs) => xs.filter((t) => t.status !== 'done' && t.status !== 'error'))
  }, [])

  const setRunning = useCallback((id: string | null) => {
    setRunningId(id)
  }, [])

  const value: Ctx = {
    tasks,
    runningId,
    enqueue,
    updateTask,
    removeTask,
    clearDone,
    setRunning
  }

  return <GenerateCtx.Provider value={value}>{children}</GenerateCtx.Provider>
}

export function useGenerate() {
  const v = useContext(GenerateCtx)
  if (!v) throw new Error('useGenerate must be inside GenerateProvider')
  return v
}

export function getAbortController() {
  return new AbortController()
}
