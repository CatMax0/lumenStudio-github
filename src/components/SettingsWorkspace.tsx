import { useState, useMemo } from 'react'
import { useProject } from '../store/project'
import { MODEL_KIND_LABELS } from '../types/project'
import type { ModelKind, ModelProvider } from '../types/project'
import { PROVIDER_TEMPLATES } from '../data/providerTemplates'
import { chatCompletion } from '../services/ai'

const KINDS: ModelKind[] = ['llm', 'image', 'tts', 'stt', 'video', 'translate']

type SettingsTab = ModelKind | 'general'

export function SettingsWorkspace() {
  const [tab, setTab] = useState<SettingsTab>('llm')

  return (
    <div className="flex-1 flex min-h-0 bg-panel text-ink overflow-hidden">
      {/* 左侧分类 */}
      <aside className="w-44 shrink-0 bg-panel-deep border-r border-line flex flex-col">
        <SectionLabel>模型接口</SectionLabel>
        {KINDS.map((k) => (
          <NavItem
            key={k}
            label={MODEL_KIND_LABELS[k]}
            active={tab === k}
            onClick={() => setTab(k)}
          />
        ))}
        <div className="h-px bg-line my-2" />
        <SectionLabel>通用设定</SectionLabel>
        <NavItem label="存储与备份" active={tab === 'general'} onClick={() => setTab('general')} />
      </aside>

      {/* 主区 */}
      <div className="flex-1 min-w-0 flex flex-col bg-panel">
        {tab === 'general' ? <GeneralSettings /> : <ProviderSection kind={tab} />}
      </div>
    </div>
  )
}

// ===== Provider 列表区 =====
function ProviderSection({ kind }: { kind: ModelKind }) {
  const { providers, addProvider, updateProvider, removeProvider } = useProject()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const list = useMemo(() => providers.filter((p) => p.kind === kind), [providers, kind])
  const templates = PROVIDER_TEMPLATES.filter((t) => t.kind === kind)
  const editing = list.find((p) => p.id === editingId) ?? null

  const handleAddFromTemplate = (idx: number) => {
    const t = templates[idx]
    const id = addProvider({
      kind: t.kind,
      name: t.name,
      baseUrl: t.baseUrl,
      apiKey: '',
      models: t.models,
      defaultModel: t.models[0],
      enabled: false,
      voices: t.voices,
      supportsClone: t.supportsClone
    })
    setEditingId(id)
    setShowTemplates(false)
  }

  const handleAddBlank = () => {
    const id = addProvider({
      kind,
      name: '新 Provider',
      baseUrl: '',
      apiKey: '',
      models: [],
      enabled: false
    })
    setEditingId(id)
  }

  return (
    <div className="flex-1 min-w-0 flex">
      {/* Provider 列表 */}
      <div className="w-72 shrink-0 border-r border-line flex flex-col bg-panel-deep">
        <div className="h-10 shrink-0 flex items-center px-4 border-b border-line bg-panel-raised">
          <span className="text-xs font-bold text-ink">{MODEL_KIND_LABELS[kind]}</span>
          <span className="text-2xs bg-panel px-1.5 py-0.5 rounded-sm text-ink-dim ml-2 font-mono">{list.length}</span>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="ml-auto h-6 px-2 bg-accent text-white text-2xs hover:bg-accent/80 font-bold rounded-sm"
          >
            + 添加
          </button>
        </div>

        {showTemplates && (
          <div className="border-b border-line bg-panel-raised">
            <div className="px-4 py-2 text-2xs text-ink-dim font-bold">从预设模板创建</div>
            <div className="max-h-64 overflow-auto">
              {templates.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => handleAddFromTemplate(i)}
                  className="w-full text-left px-4 py-2 text-xs text-ink hover:bg-panel-hover flex justify-between items-center"
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-[10px] text-ink-dim bg-panel px-1.5 py-0.5 rounded-sm font-mono">{t.models.length} 默认模型</span>
                </button>
              ))}
              <button
                onClick={handleAddBlank}
                className="w-full text-left px-4 py-2 text-xs text-ink-mute hover:bg-panel-hover border-t border-line-soft font-medium"
              >
                + 自定义 Provider (空白)
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {list.length === 0 && !showTemplates && (
            <div className="p-4 text-center text-2xs text-ink-dim">
              尚未配置 {MODEL_KIND_LABELS[kind]}
            </div>
          )}
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditingId(p.id)}
              className={[
                'w-full text-left px-3 py-2 border border-transparent rounded-sm transition-colors',
                editingId === p.id ? 'bg-accent/10 border-accent/20' : 'hover:bg-panel-hover'
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    p.enabled ? 'bg-accent' : 'bg-line-hard'
                  ].join(' ')}
                />
                <span className="text-xs text-ink font-semibold truncate flex-1">{p.name}</span>
                <span className="text-[10px] text-ink-dim shrink-0 font-mono">
                  {p.apiKey ? '已配置 Key' : '无 Key'}
                </span>
              </div>
              <div className="text-[10px] text-ink-dim mt-1 truncate font-mono">{p.baseUrl || '待填写接口 URL'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 编辑表单 */}
      <div className="flex-1 min-w-0 overflow-auto bg-panel-deep p-4">
        {editing ? (
          <div className="bg-panel border border-line p-6 rounded-md shadow-sm">
            <ProviderEditor
              provider={editing}
              onUpdate={(patch) => updateProvider(editing.id, patch)}
              onRemove={() => {
                removeProvider(editing.id)
                setEditingId(null)
              }}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-xs text-ink-dim border border-line border-dashed rounded-md bg-panel">
            <span className="text-xl mb-1">⚙️</span>
            选择左侧的 API 提供商(Provider) 即可在此处进行接口和模型细节的配置。
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Provider 编辑器 =====
function ProviderEditor({
  provider,
  onUpdate,
  onRemove
}: {
  provider: ModelProvider
  onUpdate: (patch: Partial<ModelProvider>) => void
  onRemove: () => void
}) {
  const [showKey, setShowKey] = useState(false)
  const [modelInput, setModelInput] = useState('')
  const [voiceInput, setVoiceInput] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const isTts = provider.kind === 'tts'
  
  const isKling = provider.baseUrl?.includes('klingai.com') || provider.baseUrl?.includes('kling.ai') || provider.name?.toLowerCase().includes('kling') || provider.name?.includes('可灵')
  const [accessKey, secretKey] = provider.apiKey?.includes(':') 
    ? provider.apiKey.split(':') 
    : [provider.apiKey || '', '']

  const isXunfei = provider.baseUrl?.includes('xf-yun.com') || provider.baseUrl?.includes('xfyun.cn') || provider.baseUrl?.includes('maas-api') || provider.baseUrl?.includes('/tti') || provider.name?.toLowerCase().includes('xunfei') || provider.name?.includes('讯飞')
  const xfParts = provider.apiKey?.split(':') || []
  const xfAppId = xfParts[0] || ''
  const xfApiKey = xfParts[1] || ''
  const xfApiSecret = xfParts[2] || ''
  const xfPatchId = xfParts[3] || ''

  const handleTest = async () => {
    if (!provider.baseUrl || !provider.apiKey) {
      setTestStatus('fail')
      setTestMsg('请先填写 Base URL 和 API Key')
      return
    }
    if (provider.kind !== 'llm') {
      setTestStatus('fail')
      setTestMsg('当前仅支持 LLM 类型连接测试')
      return
    }
    setTestStatus('testing')
    setTestMsg('')
    const trimmedProvider = {
      ...provider,
      apiKey: provider.apiKey.trim(),
      baseUrl: provider.baseUrl.trim()
    }
    try {
      const result = await chatCompletion({
        provider: trimmedProvider,
        messages: [
          { role: 'user', content: 'ping' }
        ],
        maxTokens: 8
      })
      setTestStatus('ok')
      setTestMsg(result.content ? `响应: ${result.content.slice(0, 40)}` : '连接正常')
    } catch (err: unknown) {
      setTestStatus('fail')
      const msg = err instanceof Error ? err.message : '未知错误'
      setTestMsg(msg.slice(0, 200))
      console.error('[Settings] test connection failed:', msg)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3 pb-3 border-b border-line">
        <input
          value={provider.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="text-sm font-bold text-ink bg-transparent border-b border-transparent hover:border-line focus:border-accent focus:outline-none flex-1 py-0.5"
        />
        <label className="flex items-center gap-1.5 text-xs text-ink-mute cursor-pointer font-semibold">
          <input
            type="checkbox"
            checked={provider.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="accent-accent w-3.5 h-3.5"
          />
          启用该服务
        </label>
        <button
          onClick={onRemove}
          className="h-6 px-2.5 text-xs border border-line hover:border-accent-danger hover:text-accent-danger rounded-sm transition-colors text-ink-dim"
        >
          删除
        </button>
      </div>

      <Field label="API Base URL">
        <input
          value={provider.baseUrl}
          onChange={(e) => onUpdate({ baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
        />
      </Field>

      {isXunfei ? (
        <div className="space-y-4">
          <Field label="APPID">
            <input
              type="text"
              value={xfAppId}
              onChange={(e) => {
                const appid = e.target.value.trim()
                onUpdate({ apiKey: `${appid}:${xfApiKey}:${xfApiSecret}:${xfPatchId}` })
              }}
              placeholder="请输入讯飞 APPID"
              className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
          </Field>
          <Field label="APIKey">
            <input
              type="text"
              value={xfApiKey}
              onChange={(e) => {
                const apikey = e.target.value.trim()
                onUpdate({ apiKey: `${xfAppId}:${apikey}:${xfApiSecret}:${xfPatchId}` })
              }}
              placeholder="请输入讯飞 APIKey"
              className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
          </Field>
          <Field label="APISecret">
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={xfApiSecret}
                onChange={(e) => {
                  const apisecret = e.target.value.trim()
                  onUpdate({ apiKey: `${xfAppId}:${xfApiKey}:${apisecret}:${xfPatchId}` })
                }}
                placeholder="请输入讯飞 APISecret"
                className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="h-8 px-3 bg-panel-deep border border-line text-2xs text-ink-mute hover:bg-panel-hover rounded-sm transition-colors"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </Field>
          <Field label="Patch ID (资源包 ID / 仅星辰 MaaS 平台必填，开放平台留空)">
            <input
              type="text"
              value={xfPatchId}
              onChange={(e) => {
                const patchid = e.target.value.trim()
                onUpdate({ apiKey: `${xfAppId}:${xfApiKey}:${xfApiSecret}:${patchid}` })
              }}
              placeholder="请输入星辰 MaaS 专属 patch_id（使用普通开放平台 spark-api 时请留空）"
              className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
            <div className="text-[10px] mt-1.5 flex items-center gap-2">
              <span className="text-ink-dim">注：如果您使用的 URL 属于 <b>maas-api</b>，平台强制要求订购套餐对应的 <b>patch_id</b>；如果是普通的 <b>spark-api</b> 开放平台，请保持此项留空。</span>
            </div>
          </Field>
        </div>
      ) : isKling ? (
        <div className="space-y-4">
          <Field label="Access Key (AK)">
            <input
              type="text"
              value={accessKey}
              onChange={(e) => {
                const ak = e.target.value.trim()
                onUpdate({ apiKey: `${ak}:${secretKey}` })
              }}
              placeholder="请输入可灵 Access Key"
              className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
          </Field>
          <Field label="Secret Key (SK)">
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => {
                  const sk = e.target.value.trim()
                  onUpdate({ apiKey: `${accessKey}:${sk}` })
                }}
                placeholder="请输入可灵 Secret Key"
                className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="h-8 px-3 bg-panel-deep border border-line text-2xs text-ink-mute hover:bg-panel-hover rounded-sm transition-colors"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <div className="text-[10px] mt-1.5 flex items-center gap-2">
              <span className="text-ink-dim">可灵 API 采用 JWT 动态安全签名，密钥仅保存在您的本地，绝不上传</span>
            </div>
          </Field>
        </div>
      ) : (
        <Field label="API Key">
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={provider.apiKey}
              onChange={(e) => onUpdate({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="h-8 px-3 bg-panel-deep border border-line text-2xs text-ink-mute hover:bg-panel-hover rounded-sm transition-colors"
            >
              {showKey ? '隐藏' : '显示'}
            </button>
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="h-8 px-3 bg-panel-deep border border-line text-2xs text-ink hover:bg-panel-hover disabled:opacity-50 rounded-sm transition-colors"
            >
              {testStatus === 'testing' ? '测试中…' : '测试连接'}
            </button>
          </div>
          <div className="text-[10px] mt-1.5 flex items-center gap-2">
            <span className="text-ink-dim">密钥仅在本地安全加密存储，永不向第三方泄露</span>
            {testStatus === 'ok' && (
              <span className="text-accent ml-auto truncate max-w-[60%] font-semibold" title={testMsg}>
                ✓ {testMsg}
              </span>
            )}
            {testStatus === 'fail' && (
              <span className="text-accent-danger ml-auto truncate max-w-[60%] font-semibold" title={testMsg}>
                ✗ {testMsg}
              </span>
            )}
          </div>
        </Field>
      )}

      <Field label="模型别名/列表">
        <div className="space-y-1.5">
          {provider.models.map((m, i) => (
            <div
              key={i}
              className="h-8 flex items-center gap-2 px-2 bg-panel-deep border border-line group rounded-sm"
            >
              <input
                type="radio"
                name="defaultModel"
                checked={provider.defaultModel === m}
                onChange={() => onUpdate({ defaultModel: m })}
                className="accent-accent w-3 h-3"
                title="设为默认"
              />
              <span className="text-xs text-ink font-mono flex-1 truncate">{m}</span>
              {provider.defaultModel === m && (
                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm font-bold">默认</span>
              )}
              <button
                onClick={() => {
                  onUpdate({ models: provider.models.filter((_, j) => j !== i) })
                }}
                className="text-[10px] text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                移除
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              placeholder="输入模型 ID 后按 Enter 添加"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && modelInput.trim()) {
                  onUpdate({ models: [...provider.models, modelInput.trim()] })
                  setModelInput('')
                }
              }}
              className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
            />
          </div>
        </div>
      </Field>

      {isTts && (
        <>
          <Field label="声音克隆支持">
            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={provider.supportsClone ?? false}
                onChange={(e) => onUpdate({ supportsClone: e.target.checked })}
                className="accent-accent w-3.5 h-3.5"
              />
              该 Provider 支持极速声音克隆 (Clone Voice) 功能
            </label>
          </Field>

          <Field label={`内置预制音色列表 (${provider.voices?.length ?? 0})`}>
            <div className="space-y-1.5">
              {(provider.voices ?? []).map((v, i) => (
                <div
                  key={i}
                  className="h-8 flex items-center gap-2 px-2 bg-panel-deep border border-line group rounded-sm"
                >
                  <span className="text-xs text-ink font-mono flex-1 truncate">{v}</span>
                  <button
                    onClick={() => {
                      onUpdate({ voices: (provider.voices ?? []).filter((_, j) => j !== i) })
                    }}
                    className="text-[10px] text-ink-dim hover:text-accent-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    移除
                  </button>
                </div>
              ))}
              <input
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && voiceInput.trim()) {
                    onUpdate({ voices: [...(provider.voices ?? []), voiceInput.trim()] })
                    setVoiceInput('')
                  }
                }}
                placeholder="输入音色 ID 后按 Enter 添加 (如 zh-CN-XiaoxiaoNeural)"
                className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
              />
            </div>
          </Field>
        </>
      )}

      <Field label="服务备注说明">
        <textarea
          value={provider.note ?? ''}
          onChange={(e) => onUpdate({ note: e.target.value })}
          placeholder="填写关于该 Provider 的备注..."
          className="w-full h-16 p-2 bg-panel-deep border border-line text-xs text-ink resize-none focus:border-accent focus:outline-none rounded-sm leading-relaxed"
        />
      </Field>
    </div>
  )
}

// ===== 通用设置 =====
function GeneralSettings() {
  const [path, setPath] = useState<string>('')

  const handleOpen = async () => {
    const lumen = (window as unknown as { lumen?: { project: { openDir: () => Promise<{ ok: true; path: string }> } } }).lumen
    if (!lumen) return
    const res = await lumen.project.openDir()
    setPath(res.path)
  }

  return (
    <div className="p-6 max-w-2xl bg-panel border border-line rounded-md shadow-sm m-4 space-y-4">
      <h3 className="text-sm font-bold text-ink mb-4 border-b border-line pb-2">📂 系统存储与网络设定</h3>
      
      <Field label="本地项目文件存储位置">
        <div className="flex gap-2">
          <input
            readOnly
            value={path || '%APPDATA%/lumen-studio/projects'}
            className="flex-1 h-8 px-2 bg-panel-deep border border-line text-xs text-ink-mute font-mono rounded-sm"
          />
          <button
            onClick={handleOpen}
            className="h-8 px-3 bg-panel-deep border border-line text-xs text-ink hover:bg-panel-hover rounded-sm transition-colors font-medium"
          >
            打开目录
          </button>
        </div>
      </Field>
      
      <Field label="安全机制与自动备份">
        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer font-medium">
          <input type="checkbox" defaultChecked className="accent-accent w-3.5 h-3.5" />
          每次在剧本/分镜中保存时自动生成安全快照备份 (保留最近 30 份)
        </label>
      </Field>
      
      <Field label="网络全局代理 (Proxy)">
        <input
          placeholder="http://127.0.0.1:7890 (国内调用 OpenRouter / OpenAI 等推荐配置，留空默认直连)"
          className="w-full h-8 px-2 bg-panel-deep border border-line text-xs text-ink font-mono focus:border-accent focus:outline-none rounded-sm"
        />
      </Field>
      
      <Field label="系统全局语言">
        <select className="w-40 h-8 px-2 bg-panel-deep border border-line text-xs text-ink focus:border-accent focus:outline-none rounded-sm font-medium">
          <option>简体中文</option>
          <option>English</option>
        </select>
      </Field>
    </div>
  )
}

// ===== 通用组件 =====
function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-9 flex items-center px-4 text-xs text-left border-l-2 transition-colors',
        active
          ? 'bg-accent/10 text-ink border-l-accent font-semibold'
          : 'text-ink-mute hover:bg-panel-hover hover:text-ink border-l-transparent'
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1 text-2xs text-ink-dim tracking-wide font-bold">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-dim mb-1.5">{label}</div>
      {children}
    </div>
  )
}
