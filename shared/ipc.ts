import { z } from 'zod'

export const Channels = {
  AppPing: 'app:ping',
  AppGetVersion: 'app:get-version',
  // 项目文件
  ProjectList: 'project:list',
  ProjectSave: 'project:save',
  ProjectLoad: 'project:load',
  ProjectBackup: 'project:backup',
  ProjectListBackups: 'project:list-backups',
  ProjectRestoreBackup: 'project:restore-backup',
  ProjectDelete: 'project:delete',
  ProjectOpenDir: 'project:open-dir',
  // AI
  AiChat: 'ai:chat',
  AiChatStream: 'ai:chat-stream',
  AiChatStreamCancel: 'ai:chat-stream-cancel',
  AiGenerateMedia: 'ai:generate-media'
} as const

export type ChannelName = (typeof Channels)[keyof typeof Channels]

export const PingRequest = z.object({ message: z.string().min(1).max(1024) })
export const PingResponse = z.object({ pong: z.string(), time: z.number() })
export type PingRequestT = z.infer<typeof PingRequest>
export type PingResponseT = z.infer<typeof PingResponse>

export const VersionResponse = z.object({
  app: z.string(),
  electron: z.string(),
  chrome: z.string(),
  node: z.string()
})
export type VersionResponseT = z.infer<typeof VersionResponse>

// ===== 项目文件 =====
export const ProjectMeta = z.object({
  id: z.string(),
  name: z.string(),
  updatedAt: z.number(),
  createdAt: z.number()
})
export type ProjectMetaT = z.infer<typeof ProjectMeta>

export const ProjectSaveRequest = z.object({
  id: z.string(),
  name: z.string(),
  data: z.unknown(),  // 整个项目状态序列化, 主进程不解析具体结构
  createBackup: z.boolean().optional()
})
export type ProjectSaveRequestT = z.infer<typeof ProjectSaveRequest>

export const ProjectSaveResponse = z.object({
  ok: z.literal(true),
  id: z.string(),
  savedAt: z.number(),
  filePath: z.string()
})
export type ProjectSaveResponseT = z.infer<typeof ProjectSaveResponse>

export const ProjectLoadRequest = z.object({ id: z.string() })
export const ProjectRestoreBackupRequest = z.object({
  id: z.string(),
  backupId: z.string()
})
export const ProjectLoadResponse = z.object({
  meta: ProjectMeta,
  data: z.unknown()
})
export type ProjectLoadResponseT = z.infer<typeof ProjectLoadResponse>

export const ProjectListResponse = z.array(ProjectMeta)
export type ProjectListResponseT = z.infer<typeof ProjectListResponse>

export const BackupMeta = z.object({
  id: z.string(),       // 时间戳 ID
  projectId: z.string(),
  createdAt: z.number(),
  size: z.number()
})
export type BackupMetaT = z.infer<typeof BackupMeta>

export const ProjectBackupListResponse = z.array(BackupMeta)
export type ProjectBackupListResponseT = z.infer<typeof ProjectBackupListResponse>

// ===== AI =====
export const AiChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
})
export type AiChatMessageT = z.infer<typeof AiChatMessage>

export const AiChatRequest = z.object({
  provider: z.object({
    kind: z.string(),
    name: z.string(),
    baseUrl: z.string(),
    apiKey: z.string(),
    models: z.array(z.string()),
    defaultModel: z.string().optional(),
    headers: z.record(z.string()).optional()
  }),
  model: z.string().optional(),
  messages: z.array(AiChatMessage),
  temperature: z.number().optional(),
  maxTokens: z.number().optional()
})
export type AiChatRequestT = z.infer<typeof AiChatRequest>

export const AiChatResponse = z.object({
  content: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }).optional()
})
export type AiChatResponseT = z.infer<typeof AiChatResponse>

export const AiChatStreamRequest = z.object({
  requestId: z.string(),
  provider: AiChatRequest.shape.provider,
  model: z.string().optional(),
  messages: z.array(AiChatMessage),
  temperature: z.number().optional(),
  maxTokens: z.number().optional()
})
export type AiChatStreamRequestT = z.infer<typeof AiChatStreamRequest>

export const AiGenerateMediaRequest = z.object({
  provider: AiChatRequest.shape.provider,
  prompt: z.string(),
  kind: z.enum(['image', 'video']),
  model: z.string().optional(),
  shotId: z.string().optional(),
  projectId: z.string().optional(),
  ratio: z.string().optional(),
  duration: z.number().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional()
})
export type AiGenerateMediaRequestT = z.infer<typeof AiGenerateMediaRequest>

export const AiGenerateMediaResponse = z.object({
  path: z.string(),
  url: z.string().optional()
})
export type AiGenerateMediaResponseT = z.infer<typeof AiGenerateMediaResponse>
