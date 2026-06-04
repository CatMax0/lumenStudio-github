// ===== 工作流阶段 =====
export const STAGES = ['projects', 'worldbuilding', 'outline', 'chapter', 'storyboard', 'generate', 'library', 'settings'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  projects: '项目',
  worldbuilding: '故事背景',
  outline: '大纲',
  chapter: '章节',
  storyboard: '分镜',
  generate: '生成',
  library: '素材',
  settings: '设置'
}

// ===== 世界观 =====
export interface WorldBuilding {
  synopsis: string       // 故事梗概
  characters: string     // 角色设定
  pace: string           // 节奏
  episodeMinutes: number // 每集时长（分钟）- 仅作参考
  totalEpisodes: number  // 总集数 - 仅作参考
}

export const EMPTY_WORLD_BUILDING: WorldBuilding = {
  synopsis: '',
  characters: '',
  pace: '快节奏',
  episodeMinutes: 2,
  totalEpisodes: 12
}

// ===== 大纲 (故事点) =====
export interface OutlineNode {
  id: string
  index: number           // 故事点序号 (1, 2, 3...)
  title: string           // 故事点标题
  summary: string         // 故事点摘要
  goal: string            // 本故事点目标
  children?: OutlineNode[]
}

// ===== 章节 =====
export interface Chapter {
  id: string
  actId: string           // 所属大纲故事点 ID
  actIndex: number        // 故事点序号 (冗余, 方便显示)
  chapterIndex: number    // 在故事点内的章序 (1, 2, 3...)
  title: string
  synopsis: string
  chapterSummary: string  // 本章摘要 (用于后续章节上下文)
  characterStates: string // 角色状态变化
  currentTask: string     // 当前任务
  chapterGoal: string     // 本章目标
  scenes: Scene[]
  assetRefs: string[]     // 引用公共素材库 ID
  characterRefId?: string  // 角色一致性参考素材 ID
  sceneRefId?: string      // 场景一致性参考素材 ID
  propRefId?: string       // 道具一致性参考素材 ID
}

export interface Scene {
  id: string
  location: string
  characters: string[]    // 引用角色 ID
  description: string
}

// 层级编号工具
export function chapterLabel(ch: Chapter): string {
  return `${ch.actIndex}-${ch.chapterIndex}`
}

export function shotLabel(ch: Chapter, shotIndex: number): string {
  return `${ch.actIndex}-${ch.chapterIndex}-${shotIndex}`
}

// ===== 分镜头 =====
export interface Shot {
  id: string
  chapterId: string
  index: number
  // 场景描述: 什么场景
  scene: string
  // 角色: 什么人
  characters: string[]
  // 动作/事件: 发生了什么
  action: string
  // 对白
  dialogue: string
  // 镜头语言
  camera: CameraType
  // 画面描述 (用于生图)
  visualPrompt: string
  // 生成的图片路径
  imagePath?: string
  // 图片原始远程 URL (用于图生视频)
  imageRemoteUrl?: string
  // 生成的视频路径 (i2v / t2v 输出)
  videoPath?: string
  // 配音音频路径 (TTS 输出)
  audioPath?: string
  // 时长 (秒)
  duration: number
  // 关联的场景素材 ID
  sceneAssetId?: string
  // 关联的角色素材 ID 数组
  characterAssetIds?: string[]
}

export type CameraType =
  | 'wide'       // 全景
  | 'medium'     // 中景
  | 'close-up'   // 特写
  | 'over-shoulder' // 过肩
  | 'pov'        // 主观
  | 'aerial'     // 俯瞰
  | 'tracking'   // 跟拍

export const CAMERA_LABELS: Record<CameraType, string> = {
  wide: '全景',
  medium: '中景',
  'close-up': '特写',
  'over-shoulder': '过肩',
  pov: '主观',
  aerial: '俯瞰',
  tracking: '跟拍'
}

// ===== 素材库 =====
export type AssetCategory =
  | 'character'  // 人物 (三视图)
  | 'scene'      // 场景 (三视图)
  | 'prop'       // 道具 (三视图)
  | 'text'       // 文本/知识 (历史、道家、咒语、六爻、紫微、专业资料)
  | 'sfx'        // 音效
  | 'bgm'        // BGM

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  character: '人物',
  scene: '场景',
  prop: '道具',
  text: '文本',
  sfx: '音效',
  bgm: 'BGM'
}

// 文本素材子分类
export type TextSubcategory =
  | 'history'    // 历史资料
  | 'taoism'     // 道家秘术
  | 'mantra'     // 口诀咒语
  | 'iching'     // 六爻 / 易经
  | 'astrology'  // 紫微斗数 / 占星
  | 'science'    // 理工科专业
  | 'lore'       // 世界观设定
  | 'custom'     // 自定义

export const TEXT_SUBCATEGORY_LABELS: Record<TextSubcategory, string> = {
  history: '历史资料',
  taoism: '道家秘术',
  mantra: '口诀咒语',
  iching: '六爻易经',
  astrology: '紫微斗数',
  science: '理工专业',
  lore: '世界观设定',
  custom: '自定义'
}

// ===== 人物专属: 音色配置 =====
export type VoiceMode = 'preset' | 'clone'

export interface CharacterVoice {
  mode: VoiceMode
  // === preset (预制音色) ===
  providerId?: string      // 引用 ModelProvider.id (kind=tts)
  voiceId?: string         // provider 的预制音色 ID
  // === clone (声音克隆) ===
  sampleUrl?: string       // 参考音频文件路径
  sampleText?: string      // 参考音频对应文本 (零样本克隆通常需要)
  cloneProviderId?: string // 用于克隆推理的 provider (如 GPT-SoVITS / Fish Speech)
  // === 通用调整 ===
  speed?: number           // 0.5 ~ 2.0, 默认 1.0
  pitch?: number           // -12 ~ 12 半音, 默认 0
  emotion?: string         // 情感倾向: 中性/冷静/激动/悲伤...
  note?: string            // 备注
}

// ===== 人物专属: 完整人设 =====
export type Gender = 'male' | 'female' | 'neutral' | 'unknown'

export const GENDER_LABELS: Record<Gender, string> = {
  male: '男',
  female: '女',
  neutral: '中性',
  unknown: '未定'
}

export interface CharacterProfile {
  // 基本资料
  alias?: string           // 别名/外号/称呼
  age?: string             // 年龄/年龄段 (如 "二十出头" / "约 30")
  gender?: Gender
  identity?: string        // 身份/职业 (如 "御史中丞" / "山门弟子")
  // 外貌
  appearance?: string      // 体型/五官/发型/肤色...
  outfit?: string          // 服饰/配饰/标志物
  // 性格 / 背景
  personality?: string     // 性格/习性/口头禅
  background?: string      // 出身/经历/动机
  relations?: string       // 与其他角色的关系网
  // 音色
  voice?: CharacterVoice
}

export interface AssetItem {
  id: string
  name: string
  category: AssetCategory
  group: string         // 分组名
  tags: string[]
  // 三视图路径 (人物/场景/道具)
  views?: {
    front?: string
    side?: string
    back?: string
    sheetPath?: string // 合集三视图 (无关身材服饰)
  }
  // 音频路径 (音效/BGM)
  audioPath?: string
  // 描述 (场景/道具等)
  description?: string
  // 全景图路径
  panoramaPath?: string
  // 文本内容 (text 类专用)
  text?: {
    subcategory: TextSubcategory
    content: string
    source?: string       // 来源出处
  }
  // 人设资料 (character 类专用)
  character?: CharacterProfile
  // 缩略图
  thumbnail?: string
  // 是否 AI 生成
  generated?: boolean
  createdAt: number
}

// ===== 生成任务 =====
export type GenerateTaskType = 'image' | 'video' | 'tts' | 'stitch' | 'three-view' | 'text'

export interface GenerateTask {
  id: string
  type: GenerateTaskType
  shotId?: string
  assetId?: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number // 0~100
  result?: string  // 输出路径
  error?: string
  providerId?: string
}

// ===== 模型 Provider 配置 =====
export type ModelKind =
  | 'llm'        // 大语言模型 (文本/对话)
  | 'image'      // 图像生成 / 三视图
  | 'tts'        // 文字转语音
  | 'stt'        // 语音转文字
  | 'video'      // 图生视频 / 视频生成
  | 'translate'  // 翻译

export const MODEL_KIND_LABELS: Record<ModelKind, string> = {
  llm: '文本模型',
  image: '图像模型',
  tts: '语音合成',
  stt: '语音识别',
  video: '视频模型',
  translate: '翻译模型'
}

export interface ModelProvider {
  id: string
  kind: ModelKind
  name: string           // 显示名 (e.g. "OpenAI", "硅基流动")
  baseUrl: string        // API base URL
  apiKey: string         // 密钥 (主进程加密存储)
  models: string[]       // 可用模型列表
  defaultModel?: string
  enabled: boolean
  // TTS 预制音色列表 (kind=tts 时有意义)
  voices?: string[]
  // 是否支持声音克隆 (kind=tts 时有意义)
  supportsClone?: boolean
  // 自定义请求头
  headers?: Record<string, string>
  // 备注
  note?: string
}

// 预设 Provider 模板 (常见服务)
export interface ProviderTemplate {
  name: string
  kind: ModelKind
  baseUrl: string
  models: string[]
  voices?: string[]        // TTS 预制音色
  supportsClone?: boolean  // TTS 是否支持克隆
  docsUrl?: string
}

// ===== 素材生成工具 =====
export type AssetGenTool =
  | 'three-view-character'  // 人物三视图生成
  | 'three-view-scene'      // 场景三视图生成
  | 'three-view-prop'       // 道具三视图生成
  | 'tts-preview'           // TTS 试听
  | 'sfx-search'            // 音效搜索
  | 'text-extract'          // 从资料提取文本素材

export const ASSET_GEN_TOOL_LABELS: Record<AssetGenTool, string> = {
  'three-view-character': '人物三视图生成',
  'three-view-scene': '场景三视图生成',
  'three-view-prop': '道具三视图生成',
  'tts-preview': 'TTS 试听',
  'sfx-search': '音效搜索',
  'text-extract': '资料文本提取'
}
