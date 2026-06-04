import { describe, it, expect } from 'vitest'
import {
  Channels,
  PingRequest,
  PingResponse,
  VersionResponse,
  ProjectMeta,
  ProjectSaveRequest,
  ProjectSaveResponse,
  ProjectLoadRequest,
  ProjectLoadResponse,
  ProjectListResponse,
  BackupMeta,
  ProjectBackupListResponse,
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiChatStreamRequest,
  AiGenerateMediaRequest,
  AiGenerateMediaResponse
} from './ipc'

describe('Channels', () => {
  it('has all expected channel names', () => {
    expect(Channels.AppPing).toBe('app:ping')
    expect(Channels.AppGetVersion).toBe('app:get-version')
    expect(Channels.ProjectList).toBe('project:list')
    expect(Channels.ProjectSave).toBe('project:save')
    expect(Channels.ProjectLoad).toBe('project:load')
    expect(Channels.ProjectBackup).toBe('project:backup')
    expect(Channels.ProjectListBackups).toBe('project:list-backups')
    expect(Channels.ProjectRestoreBackup).toBe('project:restore-backup')
    expect(Channels.ProjectDelete).toBe('project:delete')
    expect(Channels.ProjectOpenDir).toBe('project:open-dir')
    expect(Channels.AiChat).toBe('ai:chat')
    expect(Channels.AiChatStream).toBe('ai:chat-stream')
    expect(Channels.AiChatStreamCancel).toBe('ai:chat-stream-cancel')
    expect(Channels.AiGenerateMedia).toBe('ai:generate-media')
  })
})

describe('PingRequest', () => {
  it('accepts valid messages', () => {
    expect(PingRequest.parse({ message: 'hello' })).toEqual({ message: 'hello' })
  })

  it('rejects empty message', () => {
    expect(() => PingRequest.parse({ message: '' })).toThrow()
  })

  it('rejects missing message', () => {
    expect(() => PingRequest.parse({})).toThrow()
  })

  it('rejects message exceeding max length', () => {
    expect(() => PingRequest.parse({ message: 'x'.repeat(1025) })).toThrow()
  })

  it('accepts message at max length boundary', () => {
    const result = PingRequest.parse({ message: 'x'.repeat(1024) })
    expect(result.message).toHaveLength(1024)
  })
})

describe('PingResponse', () => {
  it('accepts valid response', () => {
    const data = { pong: 'pong: hello', time: 1700000000000 }
    expect(PingResponse.parse(data)).toEqual(data)
  })

  it('rejects missing fields', () => {
    expect(() => PingResponse.parse({ pong: 'test' })).toThrow()
    expect(() => PingResponse.parse({ time: 123 })).toThrow()
  })
})

describe('VersionResponse', () => {
  it('accepts valid version info', () => {
    const data = { app: '0.0.0', electron: '32.0.0', chrome: '128.0.0', node: '20.0.0' }
    expect(VersionResponse.parse(data)).toEqual(data)
  })

  it('rejects missing fields', () => {
    expect(() => VersionResponse.parse({ app: '1.0' })).toThrow()
  })
})

describe('ProjectMeta', () => {
  it('accepts valid project metadata', () => {
    const data = { id: 'proj-1', name: 'My Project', updatedAt: 1700000000, createdAt: 1699000000 }
    expect(ProjectMeta.parse(data)).toEqual(data)
  })

  it('rejects missing id', () => {
    expect(() => ProjectMeta.parse({ name: 'test', updatedAt: 1, createdAt: 1 })).toThrow()
  })
})

describe('ProjectSaveRequest', () => {
  it('accepts valid save request with required fields', () => {
    const data = { id: 'proj-1', name: 'My Project', data: { some: 'data' } }
    const result = ProjectSaveRequest.parse(data)
    expect(result.id).toBe('proj-1')
    expect(result.name).toBe('My Project')
    expect(result.createBackup).toBeUndefined()
  })

  it('accepts optional createBackup flag', () => {
    const data = { id: 'proj-1', name: 'My Project', data: null, createBackup: true }
    const result = ProjectSaveRequest.parse(data)
    expect(result.createBackup).toBe(true)
  })

  it('accepts unknown data (any structure)', () => {
    const data = { id: 'x', name: 'y', data: [1, 2, { nested: true }] }
    expect(() => ProjectSaveRequest.parse(data)).not.toThrow()
  })
})

describe('ProjectSaveResponse', () => {
  it('accepts valid save response', () => {
    const data = { ok: true as const, id: 'proj-1', savedAt: 1700000000, filePath: '/some/path' }
    expect(ProjectSaveResponse.parse(data)).toEqual(data)
  })

  it('rejects ok !== true', () => {
    expect(() => ProjectSaveResponse.parse({ ok: false, id: 'x', savedAt: 1, filePath: '/' })).toThrow()
  })
})

describe('ProjectLoadRequest / ProjectLoadResponse', () => {
  it('accepts valid load request', () => {
    expect(ProjectLoadRequest.parse({ id: 'proj-1' })).toEqual({ id: 'proj-1' })
  })

  it('accepts valid load response', () => {
    const meta = { id: 'p1', name: 'Test', updatedAt: 1, createdAt: 1 }
    const data = { meta, data: { state: 'restored' } }
    expect(ProjectLoadResponse.parse(data)).toEqual(data)
  })
})

describe('ProjectListResponse', () => {
  it('accepts an array of project metas', () => {
    const list = [
      { id: '1', name: 'A', updatedAt: 2, createdAt: 1 },
      { id: '2', name: 'B', updatedAt: 3, createdAt: 1 }
    ]
    expect(ProjectListResponse.parse(list)).toEqual(list)
  })

  it('accepts empty array', () => {
    expect(ProjectListResponse.parse([])).toEqual([])
  })
})

describe('BackupMeta', () => {
  it('accepts valid backup metadata', () => {
    const data = { id: '1700000000', projectId: 'proj-1', createdAt: 1700000000, size: 4096 }
    expect(BackupMeta.parse(data)).toEqual(data)
  })
})

describe('ProjectBackupListResponse', () => {
  it('accepts array of backup metas', () => {
    const list = [{ id: '1', projectId: 'p1', createdAt: 1, size: 100 }]
    expect(ProjectBackupListResponse.parse(list)).toHaveLength(1)
  })
})

describe('AiChatMessage', () => {
  it('accepts valid roles', () => {
    expect(AiChatMessage.parse({ role: 'system', content: 'hi' })).toEqual({ role: 'system', content: 'hi' })
    expect(AiChatMessage.parse({ role: 'user', content: 'hi' })).toEqual({ role: 'user', content: 'hi' })
    expect(AiChatMessage.parse({ role: 'assistant', content: 'hi' })).toEqual({ role: 'assistant', content: 'hi' })
  })

  it('rejects invalid role', () => {
    expect(() => AiChatMessage.parse({ role: 'tool', content: 'hi' })).toThrow()
  })
})

describe('AiChatRequest', () => {
  const validProvider = {
    kind: 'llm',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test',
    models: ['gpt-4o'],
    defaultModel: 'gpt-4o'
  }

  it('accepts valid chat request', () => {
    const req = {
      provider: validProvider,
      messages: [{ role: 'user' as const, content: 'Hello' }]
    }
    const result = AiChatRequest.parse(req)
    expect(result.provider.kind).toBe('llm')
    expect(result.messages).toHaveLength(1)
  })

  it('accepts optional fields', () => {
    const req = {
      provider: validProvider,
      model: 'gpt-4o-mini',
      messages: [{ role: 'user' as const, content: 'Hello' }],
      temperature: 0.5,
      maxTokens: 2048
    }
    const result = AiChatRequest.parse(req)
    expect(result.model).toBe('gpt-4o-mini')
    expect(result.temperature).toBe(0.5)
    expect(result.maxTokens).toBe(2048)
  })

  it('accepts provider with custom headers', () => {
    const req = {
      provider: { ...validProvider, headers: { 'X-Custom': 'value' } },
      messages: [{ role: 'user' as const, content: 'hi' }]
    }
    const result = AiChatRequest.parse(req)
    expect(result.provider.headers).toEqual({ 'X-Custom': 'value' })
  })
})

describe('AiChatResponse', () => {
  it('accepts response with usage', () => {
    const data = {
      content: 'Hello!',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
    }
    expect(AiChatResponse.parse(data)).toEqual(data)
  })

  it('accepts response without usage', () => {
    const data = { content: 'Hello!' }
    expect(AiChatResponse.parse(data)).toEqual(data)
  })
})

describe('AiChatStreamRequest', () => {
  it('requires requestId', () => {
    const req = {
      requestId: 'req-123',
      provider: {
        kind: 'llm',
        name: 'Test',
        baseUrl: 'http://localhost',
        apiKey: 'key',
        models: ['m1']
      },
      messages: [{ role: 'user' as const, content: 'stream me' }]
    }
    const result = AiChatStreamRequest.parse(req)
    expect(result.requestId).toBe('req-123')
  })
})

describe('AiGenerateMediaRequest', () => {
  const validProvider = {
    kind: 'image',
    name: 'DALL-E',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test',
    models: ['dall-e-3']
  }

  it('accepts valid image generation request', () => {
    const req = {
      provider: validProvider,
      prompt: 'A cat sitting on a chair',
      kind: 'image' as const
    }
    const result = AiGenerateMediaRequest.parse(req)
    expect(result.kind).toBe('image')
    expect(result.prompt).toBe('A cat sitting on a chair')
  })

  it('accepts video generation with optional fields', () => {
    const req = {
      provider: validProvider,
      prompt: 'A video of a sunset',
      kind: 'video' as const,
      model: 'gen-3',
      shotId: 'shot-1',
      projectId: 'proj-1',
      ratio: '16:9',
      duration: 5,
      imageUrl: 'https://example.com/img.png',
      imageUrls: ['https://example.com/a.png', 'https://example.com/b.png']
    }
    const result = AiGenerateMediaRequest.parse(req)
    expect(result.duration).toBe(5)
    expect(result.imageUrls).toHaveLength(2)
  })

  it('rejects invalid kind', () => {
    expect(() => AiGenerateMediaRequest.parse({
      provider: validProvider,
      prompt: 'test',
      kind: 'audio'
    })).toThrow()
  })
})

describe('AiGenerateMediaResponse', () => {
  it('accepts response with path only', () => {
    expect(AiGenerateMediaResponse.parse({ path: '/tmp/img.png' })).toEqual({ path: '/tmp/img.png' })
  })

  it('accepts response with path and url', () => {
    const data = { path: '/tmp/img.png', url: 'https://cdn.example.com/img.png' }
    expect(AiGenerateMediaResponse.parse(data)).toEqual(data)
  })
})
