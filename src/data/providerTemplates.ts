import type { ProviderTemplate } from '../types/project'

// 常见服务模板 (作为新增 Provider 的快速入口)
export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  // ===== 文本 / LLM =====
  {
    name: 'OpenAI',
    kind: 'llm',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com/docs'
  },
  {
    name: 'Anthropic Claude',
    kind: 'llm',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    docsUrl: 'https://docs.anthropic.com'
  },
  {
    name: 'Google Gemini',
    kind: 'llm',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    docsUrl: 'https://ai.google.dev/gemini-api/docs'
  },
  {
    name: 'DeepSeek',
    kind: 'llm',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
    docsUrl: 'https://api-docs.deepseek.com/zh-cn/'
  },
  {
    name: '302.AI',
    kind: 'llm',
    baseUrl: 'https://api.302.ai/v1',
    models: ['deepseek-v4-pro', 'gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.5-pro', 'qwen-max'],
    docsUrl: 'https://doc.302.ai'
  },
  {
    name: '硅基流动 SiliconFlow',
    kind: 'llm',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'meta-llama/Meta-Llama-3.1-405B-Instruct'],
    docsUrl: 'https://docs.siliconflow.cn'
  },
  {
    name: '通义千问 DashScope',
    kind: 'llm',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct'],
    docsUrl: 'https://help.aliyun.com/zh/dashscope/'
  },
  {
    name: '智谱 GLM',
    kind: 'llm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4', 'glm-4-flash'],
    docsUrl: 'https://open.bigmodel.cn/dev/api'
  },
  {
    name: 'Moonshot Kimi',
    kind: 'llm',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    docsUrl: 'https://platform.moonshot.cn'
  },
  {
    name: '豆包 Doubao (火山方舟)',
    kind: 'llm',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seed-2-0-pro-260215', 'doubao-1-5-pro-256k-250115', 'doubao-1-5-lite-32k-250115'],
    docsUrl: 'https://www.volcengine.com/docs/82379'
  },
  {
    name: 'Ollama (本地)',
    kind: 'llm',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1', 'qwen2.5', 'mistral'],
    docsUrl: 'https://ollama.com'
  },

  // ===== 图像 =====
  {
    name: '科大讯飞星辰图片生成',
    kind: 'image',
    baseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v2.1/tti',
    models: ['xopqwentti20b', 'qwen-img'],
    docsUrl: 'https://www.xfyun.cn/doc/spark/%E5%9B%BE%E7%89%87%E7%94%9F%E6%88%90.html'
  },
  {
    name: '硅基流动 SiliconFlow',
    kind: 'image',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/stable-diffusion-3-5-large',
      'stabilityai/stable-diffusion-3-5-large-turbo',
      'Pro/black-forest-labs/FLUX.1-schnell'
    ],
    docsUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/images'
  },
  {
    name: '302.AI',
    kind: 'image',
    baseUrl: 'https://api.302.ai/v1',
    models: ['dall-e-3', 'flux-schnell', 'stable-diffusion-3-5-large', 'midjourney'],
    docsUrl: 'https://doc.302.ai'
  },
  {
    name: 'OpenAI DALL·E',
    kind: 'image',
    baseUrl: 'https://api.openai.com/v1',
    models: ['dall-e-3', 'dall-e-2'],
    docsUrl: 'https://platform.openai.com/docs/guides/images'
  },
  {
    name: 'Stability AI',
    kind: 'image',
    baseUrl: 'https://api.stability.ai/v2beta',
    models: ['stable-image-ultra', 'stable-image-core', 'stable-diffusion-3.5-large'],
    docsUrl: 'https://platform.stability.ai/docs'
  },
  {
    name: 'ComfyUI (本地)',
    kind: 'image',
    baseUrl: 'http://127.0.0.1:8188',
    models: ['flux-dev', 'sdxl', 'sd-1.5'],
    docsUrl: 'https://github.com/comfyanonymous/ComfyUI'
  },
  {
    name: '即梦 Doubao',
    kind: 'image',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seedream-5-0-260128'],
    docsUrl: 'https://www.volcengine.com/docs/82379'
  },
  {
    name: 'Replicate',
    kind: 'image',
    baseUrl: 'https://api.replicate.com/v1',
    models: ['black-forest-labs/flux-schnell', 'black-forest-labs/flux-dev', 'stability-ai/sdxl'],
    docsUrl: 'https://replicate.com/docs'
  },

  // ===== TTS =====
  {
    name: '302.AI',
    kind: 'tts',
    baseUrl: 'https://api.302.ai/v1',
    models: ['tts-1', 'tts-1-hd'],
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    docsUrl: 'https://doc.302.ai'
  },
  {
    name: '硅基流动 SiliconFlow',
    kind: 'tts',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'FunAudioLLM/CosyVoice2-0.5B',
      'fishaudio/fish-speech-1.5'
    ],
    voices: [
      '中文女', '中文男', '英文女', '英文男',
      '日语男', '韩语女', '粤语女'
    ],
    supportsClone: true,
    docsUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/audio'
  },
  {
    name: 'OpenAI TTS',
    kind: 'tts',
    baseUrl: 'https://api.openai.com/v1',
    models: ['tts-1', 'tts-1-hd'],
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    docsUrl: 'https://platform.openai.com/docs/guides/text-to-speech'
  },
  {
    name: 'ElevenLabs',
    kind: 'tts',
    baseUrl: 'https://api.elevenlabs.io/v1',
    models: ['eleven_multilingual_v2', 'eleven_turbo_v2_5'],
    voices: [
      // 常用预制音色 (实际使用 voice_id)
      'Rachel', 'Drew', 'Clyde', 'Paul', 'Domi', 'Dave',
      'Fin', 'Sarah', 'Antoni', 'Charlie', 'Bella'
    ],
    supportsClone: true,
    docsUrl: 'https://elevenlabs.io/docs'
  },
  {
    name: 'Edge TTS (免费)',
    kind: 'tts',
    baseUrl: 'edge-tts',
    models: ['edge-tts'],
    voices: [
      // 中文女声
      'zh-CN-XiaoxiaoNeural', 'zh-CN-XiaoyiNeural', 'zh-CN-XiaohanNeural',
      'zh-CN-XiaomengNeural', 'zh-CN-XiaomoNeural', 'zh-CN-XiaoqiuNeural',
      'zh-CN-XiaoruiNeural', 'zh-CN-XiaoshuangNeural', 'zh-CN-XiaoxuanNeural',
      'zh-CN-XiaoyanNeural', 'zh-CN-XiaoyouNeural', 'zh-CN-XiaozhenNeural',
      // 中文男声
      'zh-CN-YunxiNeural', 'zh-CN-YunyangNeural', 'zh-CN-YunjianNeural',
      'zh-CN-YunfengNeural', 'zh-CN-YunhaoNeural', 'zh-CN-YunxiaNeural',
      // 方言
      'zh-CN-liaoning-XiaobeiNeural', 'zh-CN-shaanxi-XiaoniNeural',
      'zh-HK-HiuMaanNeural', 'zh-HK-WanLungNeural', 'zh-TW-HsiaoChenNeural'
    ],
    docsUrl: 'https://github.com/rany2/edge-tts'
  },
  {
    name: 'CosyVoice (本地)',
    kind: 'tts',
    baseUrl: 'http://localhost:50000',
    models: ['cosyvoice-300m', 'cosyvoice-300m-instruct'],
    voices: ['中文女', '中文男', '日语男', '英文女', '英文男', '韩语女', '粤语女'],
    supportsClone: true,
    docsUrl: 'https://github.com/FunAudioLLM/CosyVoice'
  },
  {
    name: 'Fish Speech (本地)',
    kind: 'tts',
    baseUrl: 'http://localhost:8080',
    models: ['fish-speech-1.5', 'fish-speech-1.4'],
    voices: ['default'],
    supportsClone: true,
    docsUrl: 'https://github.com/fishaudio/fish-speech'
  },
  {
    name: 'GPT-SoVITS (本地)',
    kind: 'tts',
    baseUrl: 'http://localhost:9880',
    models: ['gpt-sovits'],
    voices: ['default'],
    supportsClone: true,
    docsUrl: 'https://github.com/RVC-Boss/GPT-SoVITS'
  },
  {
    name: '火山引擎 TTS',
    kind: 'tts',
    baseUrl: 'https://openspeech.bytedance.com/api/v1/tts',
    models: ['volcano-tts'],
    voices: [
      'BV001_streaming',  // 通用女声
      'BV002_streaming',  // 通用男声
      'BV700_streaming',  // 灿灿
      'BV701_streaming',  // 擎苍
      'BV705_streaming'   // 炀炀
    ],
    docsUrl: 'https://www.volcengine.com/docs/6561/79817'
  },
  {
    name: '阿里云 CosyVoice',
    kind: 'tts',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts',
    models: ['cosyvoice-v1', 'sambert-v1'],
    voices: ['longxiaochun', 'longxiaobai', 'longxiaocheng', 'longxiaoxia', 'longwan'],
    supportsClone: true,
    docsUrl: 'https://help.aliyun.com/zh/dashscope/cosyvoice'
  },

  // ===== STT =====
  {
    name: '302.AI',
    kind: 'stt',
    baseUrl: 'https://api.302.ai/v1',
    models: ['whisper-1'],
    docsUrl: 'https://doc.302.ai'
  },
  {
    name: '硅基流动 SiliconFlow',
    kind: 'stt',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'FunAudioLLM/SenseVoiceSmall'
    ],
    docsUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/audio'
  },
  {
    name: 'OpenAI Whisper',
    kind: 'stt',
    baseUrl: 'https://api.openai.com/v1',
    models: ['whisper-1'],
    docsUrl: 'https://platform.openai.com/docs/guides/speech-to-text'
  },
  {
    name: 'Whisper.cpp (本地)',
    kind: 'stt',
    baseUrl: 'http://localhost:8089',
    models: ['large-v3', 'medium', 'base'],
    docsUrl: 'https://github.com/ggerganov/whisper.cpp'
  },

  // ===== 视频 =====
  {
    name: '302.AI',
    kind: 'video',
    baseUrl: 'https://api.302.ai/v1',
    models: ['kling-v2.1', 'kling-v1-6', 'runway-gen3a-turbo', 'luma-ray-2', 'minimax-video-01'],
    docsUrl: 'https://doc.302.ai'
  },
  {
    name: '硅基流动 SiliconFlow',
    kind: 'video',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      'Pro/Wan-AI/Wan2.1-T2V-14B',
      'Pro/Wan-AI/Wan2.1-I2V-14B-720P',
      'Wan-AI/Wan2.1-T2V-14B'
    ],
    docsUrl: 'https://docs.siliconflow.cn/cn/userguide/capabilities/video'
  },
  {
    name: '豆包 Doubao (火山方舟)',
    kind: 'video',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seedance-1-0-pro-fast-251015', 'doubao-seedance-2-0-260128'],
    docsUrl: 'https://www.volcengine.com/docs/82379'
  },
  {
    name: '可灵 Kling',
    kind: 'video',
    baseUrl: 'https://api.klingai.com',
    models: ['kling-v2.1', 'kling-v2', 'kling-v1-6', 'kling-v1-5', 'kling-v1'],
    docsUrl: 'https://docs.qingque.cn/d/home/eZQClD0w0_t06iikZTWRg9Ldj'
  },
  {
    name: 'Runway',
    kind: 'video',
    baseUrl: 'https://api.runwayml.com/v1',
    models: ['gen3a_turbo', 'gen3'],
    docsUrl: 'https://docs.dev.runwayml.com'
  },
  {
    name: 'MiniMax 海螺',
    kind: 'video',
    baseUrl: 'https://api.minimax.chat/v1',
    models: ['video-01', 'video-01-live2d'],
    docsUrl: 'https://platform.minimaxi.com'
  },
  {
    name: 'Luma Dream Machine',
    kind: 'video',
    baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
    models: ['ray-2', 'ray-1-6'],
    docsUrl: 'https://docs.lumalabs.ai'
  },

  // ===== 翻译 =====
  {
    name: 'DeepL',
    kind: 'translate',
    baseUrl: 'https://api-free.deepl.com/v2',
    models: ['default'],
    docsUrl: 'https://developers.deepl.com'
  },
  {
    name: '有道翻译',
    kind: 'translate',
    baseUrl: 'https://openapi.youdao.com',
    models: ['default'],
    docsUrl: 'https://ai.youdao.com'
  },
  {
    name: '腾讯翻译',
    kind: 'translate',
    baseUrl: 'https://tmt.tencentcloudapi.com',
    models: ['default'],
    docsUrl: 'https://cloud.tencent.com/document/product/551'
  }
]
