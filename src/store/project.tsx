import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Chapter, Shot, AssetItem, ModelProvider, OutlineNode, WorldBuilding } from '../types/project'
import { EMPTY_WORLD_BUILDING } from '../types/project'
import { platformId, findPlatformApiKey } from '../utils/platform'

const uid = () => Math.random().toString(36).slice(2, 10)
const projectId = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface Snapshot {
  theme: string
  genre: string
  worldBuilding: WorldBuilding
  acts: OutlineNode[]
  chapters: Chapter[]
  shots: Shot[]
  assets: AssetItem[]
  providers: ModelProvider[]
  visualStyle?: string
}

interface ProjectState extends Snapshot {
  // 项目元信息
  id: string
  name: string
  projectLoaded: boolean
  selectedActId: string | null
  selectedChapterId: string | null
  selectedShotId: string | null
  // 保存状态
  saveStatus: SaveStatus
  lastSaveError: string | null
  lastSavedAt: number | null
}

interface ProjectActions {
  // 项目
  setName: (n: string) => void
  setTheme: (v: string) => void
  setGenre: (v: string) => void
  setVisualStyle: (v: string) => void
  saveNow: () => Promise<void>
  manualBackup: () => Promise<void>
  loadProjectById: (id: string) => Promise<void>
  createNewProject: (name: string) => Promise<void>
  deleteProjectById: (id: string) => Promise<void>
  closeProject: () => void
  // 世界观
  updateWorldBuilding: (patch: Partial<WorldBuilding>) => void
  // 大纲
  addAct: () => void
  updateAct: (id: string, patch: Partial<OutlineNode>) => void
  removeAct: (id: string) => void
  selectAct: (id: string | null) => void
  // 章节
  addChapter: (actId?: string) => string
  updateChapter: (id: string, patch: Partial<Chapter>) => void
  removeChapter: (id: string) => void
  selectChapter: (id: string | null) => void
  // 分镜
  addShot: (chapterId?: string) => void
  updateShot: (id: string, patch: Partial<Shot>) => void
  removeShot: (id: string) => void
  selectShot: (id: string | null) => void
  importShots: (chapterId: string, items: (Omit<Shot, 'id' | 'chapterId' | 'index'> & { id?: string })[]) => void
  // 大纲批量
  replaceActs: (items: { title: string; summary: string; goal?: string }[]) => OutlineNode[]
  // 素材
  addAsset: (a: Omit<AssetItem, 'id' | 'createdAt'>) => string
  updateAsset: (id: string, patch: Partial<AssetItem>) => void
  removeAsset: (id: string) => void
  // 模型 Provider
  addProvider: (p: Omit<ModelProvider, 'id'>) => string
  updateProvider: (id: string, patch: Partial<ModelProvider>) => void
  removeProvider: (id: string) => void
}

type Ctx = ProjectState & ProjectActions

const ProjectCtx = createContext<Ctx | null>(null)

const ACTIVE_KEY = 'lumen.activeProjectId'

const makeDefaultActs = (): OutlineNode[] => [
  { id: uid(), index: 1, title: '故事点 1 · 开端', summary: '', goal: '' },
  { id: uid(), index: 2, title: '故事点 2 · 冲突', summary: '', goal: '' },
  { id: uid(), index: 3, title: '故事点 3 · 高潮', summary: '', goal: '' },
  { id: uid(), index: 4, title: '故事点 4 · 结局', summary: '', goal: '' }
]

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null
    return saved ?? projectId()
  })
  const [name, setNameState] = useState<string>('未命名项目')
  const [theme, setThemeState] = useState<string>('')
  const [genre, setGenreState] = useState<string>('都市')
  const [visualStyle, setVisualStyleState] = useState<string>('realistic')
  const [worldBuilding, setWorldBuilding] = useState<WorldBuilding>(EMPTY_WORLD_BUILDING)
  const [acts, setActs] = useState<OutlineNode[]>(makeDefaultActs)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedActId, setSelectedActId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [lastSaveError, setLastSaveError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [projectLoaded, setProjectLoaded] = useState(false)
  const lastSerializedRef = useRef<string>('')
  const autosaveTimerRef = useRef<number | null>(null)

  const setName = useCallback((n: string) => setNameState(n), [])
  const setTheme = useCallback((v: string) => setThemeState(v), [])
  const setGenre = useCallback((v: string) => setGenreState(v), [])
  const setVisualStyle = useCallback((v: string) => setVisualStyleState(v), [])

  // ---- 初始加载: 仅标记 hydrated, 不自动加载项目 ----
  useEffect(() => {
    setHydrated(true)
  }, [])

  // ---- 自动保存 (变更后 1.5s 防抖) ----
  const buildSnapshot = useCallback((): Snapshot => ({
    theme, genre, worldBuilding, acts, chapters, shots, assets, providers, visualStyle
  }), [theme, genre, worldBuilding, acts, chapters, shots, assets, providers, visualStyle])

  const performSave = useCallback(async (): Promise<void> => {
    const lumen = (window as unknown as { lumen?: typeof window.lumen }).lumen
    if (!lumen?.project) return
    const snap = buildSnapshot()
    const serialized = JSON.stringify(snap)
    if (serialized === lastSerializedRef.current) return
    setSaveStatus('saving')
    try {
      const res = await lumen.project.save({
        id, name, data: snap, createBackup: false
      })
      lastSerializedRef.current = serialized
      setLastSavedAt(res.savedAt)
      setSaveStatus('saved')
      setLastSaveError(null)
      if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_KEY, id)
    } catch (err) {
      console.error('[project] save failed:', err)
      setLastSaveError(err instanceof Error ? err.message : String(err))
      setSaveStatus('error')
    }
  }, [id, name, buildSnapshot])

  // 标脏 + 调度保存 (仅在项目已加载后)
  useEffect(() => {
    if (!hydrated || !projectLoaded) return
    const snap = buildSnapshot()
    const serialized = JSON.stringify(snap)
    if (serialized === lastSerializedRef.current && lastSerializedRef.current !== '') return
    setSaveStatus((s) => (s === 'saving' ? s : 'dirty'))
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      performSave()
    }, 1500)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [hydrated, projectLoaded, name, theme, genre, worldBuilding, acts, chapters, shots, assets, providers, visualStyle, buildSnapshot, performSave])

  const saveNow = useCallback(async () => {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    await performSave()
  }, [performSave])

  const manualBackupAction = useCallback(async () => {
    const lumen = (window as unknown as { lumen?: typeof window.lumen }).lumen
    if (!lumen?.project) return
    try {
      await saveNow()
      await lumen.project.backup(id)
    } catch (err) {
      console.error('[project] manual backup failed:', err)
      throw err
    }
  }, [id, saveNow])

  const loadProjectById = useCallback(async (targetId: string) => {
    try {
      const lumen = (window as unknown as { lumen?: typeof window.lumen }).lumen
      if (!lumen?.project) return

      setSaveStatus('saving')
      const { meta, data } = await lumen.project.load(targetId)
      const snap = (data || {}) as Partial<Snapshot>

      const loadedActs = snap.acts && snap.acts.length ? snap.acts : makeDefaultActs()
      const loaded: Snapshot = {
        theme: snap.theme || '',
        genre: snap.genre || '都市',
        worldBuilding: snap.worldBuilding || EMPTY_WORLD_BUILDING,
        acts: loadedActs,
        chapters: snap.chapters || [],
        shots: snap.shots || [],
        assets: snap.assets || [],
        providers: snap.providers || [],
        visualStyle: snap.visualStyle || 'realistic'
      }

      setId(meta.id)
      setNameState(meta.name)
      setThemeState(loaded.theme)
      setGenreState(loaded.genre)
      setVisualStyleState(loaded.visualStyle || 'realistic')
      setWorldBuilding(loaded.worldBuilding)
      setActs(loaded.acts)
      setChapters(loaded.chapters)
      setShots(loaded.shots)
      setAssets(loaded.assets)
      setProviders(loaded.providers)
      setSelectedActId(null)
      setSelectedChapterId(null)
      setSelectedShotId(null)

      // 与 performSave 的序列化一致, 避免加载后立即触发一次冗余写盘
      lastSerializedRef.current = JSON.stringify(loaded)
      setLastSavedAt(meta.updatedAt)
      setProjectLoaded(true)
      setSaveStatus('saved')
      if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_KEY, meta.id)
    } catch (err) {
      console.error('[project] load failed:', err)
      setSaveStatus('error')
      throw err
    }
  }, [])

  const createNewProject = useCallback(async (newName: string) => {
    const lumen = (window as unknown as { lumen?: typeof window.lumen }).lumen
    const newId = projectId()
    const snap: Snapshot = {
      theme: '',
      genre: '都市',
      worldBuilding: EMPTY_WORLD_BUILDING,
      acts: makeDefaultActs(),
      chapters: [],
      shots: [],
      assets: [],
      // 模型配置沿用当前已配置的 Provider, 避免每个新项目都要重新配置
      providers,
      visualStyle: 'realistic'
    }

    if (lumen?.project) {
      const res = await lumen.project.save({ id: newId, name: newName, data: snap, createBackup: false })
      setLastSavedAt(res.savedAt)
    }

    setId(newId)
    setNameState(newName)
    setThemeState(snap.theme)
    setGenreState(snap.genre)
    setVisualStyleState('realistic')
    setWorldBuilding(snap.worldBuilding)
    setActs(snap.acts)
    setChapters(snap.chapters)
    setShots(snap.shots)
    setAssets(snap.assets)
    setSelectedActId(null)
    setSelectedChapterId(null)
    setSelectedShotId(null)

    lastSerializedRef.current = JSON.stringify(snap)
    setProjectLoaded(true)
    setSaveStatus('saved')
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_KEY, newId)
  }, [providers])

  const deleteProjectById = useCallback(async (targetId: string) => {
    const lumen = (window as unknown as { lumen?: typeof window.lumen }).lumen
    if (lumen?.project) {
      await lumen.project.delete(targetId)
    }
    if (targetId === id) {
      setProjectLoaded(false)
      if (typeof localStorage !== 'undefined') localStorage.removeItem(ACTIVE_KEY)
    }
  }, [id])

  const closeProject = useCallback(() => {
    setProjectLoaded(false)
    setSelectedActId(null)
    setSelectedChapterId(null)
    setSelectedShotId(null)
    setSaveStatus('idle')
    lastSerializedRef.current = ''
    if (typeof localStorage !== 'undefined') localStorage.removeItem(ACTIVE_KEY)
  }, [])

  // ---- 世界观 ----
  const updateWorldBuilding = useCallback((patch: Partial<WorldBuilding>) => {
    setWorldBuilding((wb) => ({ ...wb, ...patch }))
  }, [])

  // ---- 大纲 ----
  const addAct = useCallback(() => {
    setActs((xs) => [...xs, { id: uid(), index: xs.length + 1, title: '', summary: '', goal: '' }])
  }, [])
  const updateAct = useCallback((id: string, patch: Partial<OutlineNode>) => {
    setActs((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])
  const removeAct = useCallback((id: string) => {
    setActs((xs) => xs.filter((x) => x.id !== id))
    setSelectedActId((cur) => (cur === id ? null : cur))
  }, [])
  const selectAct = useCallback((id: string | null) => setSelectedActId(id), [])

  // ---- 章节 ----
  const addChapter = useCallback((actId?: string) => {
    const aId = actId ?? selectedActId ?? acts[0]?.id ?? ''
    const act = acts.find((a) => a.id === aId)
    const actIdx = act?.index ?? 1
    const newId = uid()
    setChapters((xs) => {
      const chaptersInAct = xs.filter((c) => c.actId === aId)
      const newCh: Chapter = {
        id: newId,
        actId: aId,
        actIndex: actIdx,
        chapterIndex: chaptersInAct.length + 1,
        title: '',
        synopsis: '',
        chapterSummary: '',
        characterStates: '',
        currentTask: '',
        chapterGoal: '',
        scenes: [],
        assetRefs: []
      }
      return [...xs, newCh]
    })
    return newId
  }, [selectedActId, acts])
  const updateChapter = useCallback((id: string, patch: Partial<Chapter>) => {
    setChapters((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])
  const removeChapter = useCallback((id: string) => {
    setChapters((xs) => xs.filter((x) => x.id !== id))
    setSelectedChapterId((cur) => (cur === id ? null : cur))
    setShots((xs) => xs.filter((s) => s.chapterId !== id))
  }, [])
  const selectChapter = useCallback((id: string | null) => setSelectedChapterId(id), [])

  // ---- 分镜 ----
  const addShot = useCallback((chapterId?: string) => {
    setShots((xs) => {
      const cid = chapterId ?? selectedChapterId ?? ''
      const indexInCh = xs.filter((s) => s.chapterId === cid).length
      const newShot: Shot = {
        id: uid(),
        chapterId: cid,
        index: indexInCh + 1,
        scene: '',
        characters: [],
        action: '',
        dialogue: '',
        camera: 'medium',
        visualPrompt: '',
        duration: 3
      }
      return [...xs, newShot]
    })
  }, [selectedChapterId])
  const updateShot = useCallback((id: string, patch: Partial<Shot>) => {
    setShots((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])
  const removeShot = useCallback((id: string) => {
    setShots((xs) => xs.filter((x) => x.id !== id))
    setSelectedShotId((cur) => (cur === id ? null : cur))
  }, [])
  const selectShot = useCallback((id: string | null) => setSelectedShotId(id), [])
  const importShots = useCallback((chapterId: string, items: (Omit<Shot, 'id' | 'chapterId' | 'index'> & { id?: string })[]) => {
    // 1. Gather scene and character names that need auto-creation in Library
    const addedAssets: AssetItem[] = []

    items.forEach((item) => {
      // Scene auto-creation
      if (item.scene) {
        const trimmedScene = item.scene.trim()
        const exists = assets.some(a => a.category === 'scene' && a.name.toLowerCase() === trimmedScene.toLowerCase())
          || addedAssets.some(a => a.category === 'scene' && a.name.toLowerCase() === trimmedScene.toLowerCase())
        if (!exists && trimmedScene) {
          addedAssets.push({
            id: uid(),
            name: trimmedScene,
            category: 'scene',
            group: '默认分组',
            tags: ['自动生成'],
            createdAt: Date.now(),
            description: `${trimmedScene} 的默认背景、视觉外观与环境光影设定`
          })
        }
      }

      // Characters auto-creation
      if (item.characters && item.characters.length > 0) {
        item.characters.forEach((charName) => {
          const trimmedChar = charName.trim()
          const exists = assets.some(a => a.category === 'character' && a.name.toLowerCase() === trimmedChar.toLowerCase())
            || addedAssets.some(a => a.category === 'character' && a.name.toLowerCase() === trimmedChar.toLowerCase())
          if (!exists && trimmedChar) {
            addedAssets.push({
              id: uid(),
              name: trimmedChar,
              category: 'character',
              group: '默认分组',
              tags: ['自动生成'],
              createdAt: Date.now(),
              character: {
                appearance: `${trimmedChar} 俊朗清秀、面部轮廓分明、黑色发髻，默认外貌细节。`,
                personality: '沉稳内敛',
                background: '系统生成关联角色人设'
              }
            })
          }
        })
      }
    })

    // Batch add the newly created assets to state
    if (addedAssets.length > 0) {
      setAssets((existing) => [...existing, ...addedAssets])
    }

    // Combine existing and newly created library assets for immediate shot-binding inside this render cycle
    const combinedAssets = [...assets, ...addedAssets]

    setShots((xs) => {
      const existing = xs.filter((s) => s.chapterId === chapterId)
      const startIndex = existing.length
      const newShots: Shot[] = items.map((item, i) => {
        // Auto-associate sceneAssetId
        let sceneAssetId = item.sceneAssetId
        if (!sceneAssetId && item.scene) {
          const matchedScene = combinedAssets.find(a => a.category === 'scene' && a.name.toLowerCase() === item.scene.toLowerCase())
          if (matchedScene) sceneAssetId = matchedScene.id
        }

        // Auto-associate characterAssetIds
        let characterAssetIds = item.characterAssetIds || []
        if (characterAssetIds.length === 0 && item.characters && item.characters.length > 0) {
          const ids: string[] = []
          item.characters.forEach(charName => {
            const matchedChar = combinedAssets.find(a => a.category === 'character' && a.name.toLowerCase() === charName.toLowerCase())
            if (matchedChar) ids.push(matchedChar.id)
          })
          characterAssetIds = ids
        }

        return {
          ...item,
          id: item.id || uid(),
          chapterId,
          index: startIndex + i + 1,
          sceneAssetId,
          characterAssetIds
        }
      })
      return [...xs, ...newShots]
    })
  }, [assets])

  const replaceActs = useCallback((items: { title: string; summary: string; goal?: string }[]) => {
    const newActs = items.map((item, i) => ({ id: uid(), index: i + 1, title: item.title, summary: item.summary, goal: item.goal ?? '' }))
    setActs(newActs)
    return newActs
  }, [])

  // ---- 素材 ----
  const addAsset = useCallback((a: Omit<AssetItem, 'id' | 'createdAt'>): string => {
    const id = uid()
    setAssets((xs) => [...xs, { ...a, id, createdAt: Date.now() }])
    return id
  }, [])
  const updateAsset = useCallback((id: string, patch: Partial<AssetItem>) => {
    setAssets((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])
  const removeAsset = useCallback((id: string) => {
    setAssets((xs) => xs.filter((x) => x.id !== id))
  }, [])

  // ---- Provider ----
  const addProvider = useCallback((p: Omit<ModelProvider, 'id'>): string => {
    const id = uid()
    setProviders((xs) => {
      // 同平台（聚合平台）的模型默认共用已配置的 Key
      const apiKey = p.apiKey || findPlatformApiKey(xs, p.baseUrl)
      return [...xs, { ...p, apiKey, id }]
    })
    return id
  }, [])
  const updateProvider = useCallback((id: string, patch: Partial<ModelProvider>) => {
    const clean = { ...patch }
    if (clean.apiKey !== undefined) clean.apiKey = clean.apiKey.trim()
    if (clean.baseUrl !== undefined) clean.baseUrl = clean.baseUrl.trim().replace(/\/+$/, '')
    setProviders((xs) => {
      const target = xs.find((x) => x.id === id)
      if (!target) return xs
      const merged = { ...target, ...clean }
      // baseUrl 改成已知平台、且本模型还没填 Key 时，自动继承同平台的 Key
      const baseUrlChanged = clean.baseUrl !== undefined
      if (baseUrlChanged && clean.apiKey === undefined && !merged.apiKey) {
        const inherited = findPlatformApiKey(xs, merged.baseUrl, id)
        if (inherited) merged.apiKey = inherited
      }
      let next = xs.map((x) => (x.id === id ? merged : x))
      // Key 变化时同步到同平台的其它模型，保持「同平台同 Key」
      const keySourceChanged = clean.apiKey !== undefined || (baseUrlChanged && !target.apiKey)
      const pid = platformId(merged.baseUrl)
      if (merged.apiKey && keySourceChanged && pid) {
        next = next.map((x) =>
          x.id !== id && platformId(x.baseUrl) === pid ? { ...x, apiKey: merged.apiKey } : x
        )
      }
      return next
    })
  }, [])
  const removeProvider = useCallback((id: string) => {
    setProviders((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const value: Ctx = {
    id, name, projectLoaded, theme, genre, worldBuilding, saveStatus, lastSaveError, lastSavedAt,
    acts, chapters, selectedActId, selectedChapterId, shots, selectedShotId, assets, providers, visualStyle,
    setName, setTheme, setGenre, setVisualStyle, saveNow, manualBackup: manualBackupAction,
    loadProjectById, createNewProject, deleteProjectById, closeProject,
    updateWorldBuilding,
    addAct, updateAct, removeAct, selectAct,
    addChapter, updateChapter, removeChapter, selectChapter,
    addShot, updateShot, removeShot, selectShot, importShots, replaceActs,
    addAsset, updateAsset, removeAsset,
    addProvider, updateProvider, removeProvider
  }

  return <ProjectCtx.Provider value={value}>{children}</ProjectCtx.Provider>
}

export function useProject() {
  const v = useContext(ProjectCtx)
  if (!v) throw new Error('useProject must be inside ProjectProvider')
  return v
}
