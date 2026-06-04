import { createContext, useContext, useState, useCallback } from 'react'
import type { Stage } from '../types/project'

interface StageCtx {
  stage: Stage
  setStage: (s: Stage) => void
}

const Ctx = createContext<StageCtx>({ stage: 'projects', setStage: () => {} })

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStageRaw] = useState<Stage>('projects')
  const setStage = useCallback((s: Stage) => setStageRaw(s), [])

  return <Ctx.Provider value={{ stage, setStage }}>{children}</Ctx.Provider>
}

export function useStage() {
  return useContext(Ctx)
}
