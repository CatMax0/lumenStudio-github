
# AI 短剧工具 UI 设计规范（桌面端）


## 项目定位

中文桌面端 AI 短剧创作工具。

设计方向：

* Adobe Premiere Pro
* After Effects
* DaVinci Resolve

产品核心：

* 专业影视工具
* AI 辅助剪辑
* Timeline First
* 高信息密度
* 工业化工作流

---

# 整体视觉风格

## 核心气质

关键词：

* 深色
* 克制
* 精密
* 工具化
* 高效率
* 专业创作软件

界面应该像：

```txt id="1h0bwi"
专业后期工作站
```

而不是：

```txt id="w5q2jk"
AI聊天网站
```

---

# 禁止项

严禁：

* Emoji 图标
* 聊天气泡 UI
* 大面积渐变
* 卡通插画
* 玻璃拟态
* 彩色霓虹
* 超大圆角
* 花哨动画
* AI 助手头像
* 对话式布局

不要出现：

```txt id="dqz8fj"
“你好，我可以帮你剪视频”
```

AI 必须像：

```txt id="2f4y9q"
后台分析引擎
```

---

# 色彩规范

## 主背景

```css id="tqjwd5"
#1E1E1E
```

## 面板背景

```css id="z7z4m9"
#252526
```

## 卡片背景

```css id="1q5wvm"
#2D2D30
```

## 边框

```css id="6kcx7r"
#3F3F46
```

## 主强调色

```css id="vv7eik"
#0090F1
```

用途：

* 激活状态
* 当前轨道
* 选中元素
* Focus

---

# 字体规范

中文：

* 思源黑体
* HarmonyOS Sans

英文：

* Inter

原则：

* 高可读性
* 偏窄
* 专业感
* 不使用圆润字体

---

# 字号规范

| 类型       | 大小 |
| -------- | -- |
| 一级标题     | 20 |
| 面板标题     | 14 |
| 正文       | 13 |
| Timeline | 12 |
| metadata | 11 |

整体偏紧凑。

---

# 圆角规范

| 元素 | 圆角  |
| -- | --- |
| 按钮 | 4px |
| 面板 | 6px |
| 弹窗 | 8px |

禁止：

```txt id="u2mwd9"
16px / 24px 大圆角
```

---

# 阴影规范

轻阴影即可：

```css id="y5l2hx"
box-shadow:
0 0 0 1px rgba(255,255,255,.03),
0 8px 24px rgba(0,0,0,.35);
```

不要：

* 发光
* 漂浮感
* 卡片悬空

---

# 主布局

```txt id="8klv0s"
┌────────────────────────────┐
│ Top Toolbar                │
├─────────┬──────────┬───────┤
│ Media   │ Preview  │ AI    │
├─────────┴──────────┴───────┤
│ Timeline                      │
└────────────────────────────┘
```

---

# 顶部工具栏

高度：

```txt id="9jyk4j"
44px
```

包含：

* Logo
* 项目名
* 保存状态
* 导入
* 导出
* Undo / Redo
* AI 分析
* GPU 状态

风格：

* 扁平
* 高密度
* 小图标
* 小按钮

---

# 左侧素材区

模块：

* 视频
* 音频
* 字幕
* OCR
* AI 分析
* 模板

推荐：

```txt id="6yl6k4"
Tabs + 文件树
```

避免：

* 超大素材卡片
* 瀑布流
* 大缩略图

---

# 中间预览区

背景纯黑：

```css id="8i5izn"
#000
```

支持：

* 视频预览
* 字幕层
* OCR 标记
* AI 检测框
* 安全框

底部控制栏：

* 播放
* 倍速
* 音量
* 帧控制
* 截图

---

# 右侧 AI 面板

宽度：

```txt id="fhx84h"
320~420px
```

AI 面板不是聊天框。

必须是：

```txt id="uw2e2x"
结构化工作流
```

---

## AI 模块

### Prompt 区

支持：

* system/user 分离
* Prompt 模板
* token 统计
* 变量插入

---

### 输出区

支持：

* JSON 高亮
* cuts 列表
* narration 编辑
* regenerate

---

### 状态区

显示：

* 当前模型
* token/s
* GPU 占用
* 队列状态

---

# Timeline（核心）

Timeline 必须是主角。

高度：

```txt id="wwcc8z"
260~340px
```

推荐轨道：

```txt id="2s4tn0"
V1 视频
V2 AI Cuts
V3 字幕
A1 原声
A2 narration
A3 bgm
```

---

# Timeline 风格

特点：

* 高密度
* 细轨道
* 强网格感
* 专业 NLE 风格

支持：

* 波形
* Trim
* Ripple Delete
* 多轨
* AI 标记
* Scene Detect

---

# AI Cut 可视化

颜色：

| 类型       | 颜色 |
| -------- | -- |
| bedding  | 灰  |
| conflict | 黄  |
| climax   | 红  |
| twist    | 紫  |

卡片风格：

```txt id="3bh44z"
紧凑矩形
小标题
小时间码
```

不要：

* 大卡片
* 气泡
* 聊天块

---

# 动效规范

原则：

* 快
* 轻
* 不抢注意力

动画时长：

```txt id="iqr8lq"
120~180ms
```

避免：

* 弹簧动画
* 大范围位移
* 缩放过度

---

# 图标规范

推荐：

* Lucide
* Remix Icon
* Fluent

要求：

* 线性
* 单色
* 小尺寸清晰
* 统一线宽

禁止：

* Emoji
* 彩色插画
* 卡通图标
* 3D 图标

---

# AI UI 核心思想

AI 只是：

```txt id="t0r3cn"
创作辅助系统
```

不是：

```txt id="t9j9f7"
聊天机器人
```

整个 UI 必须围绕：

```txt id="yv6nqh"
Timeline + Workflow
```

构建。

---

# 推荐技术栈

前端：

* React 18
* TypeScript
* Zustand
* Tailwind
* shadcn/ui

桌面端：

* Electron

视频：

* FFmpeg
* WebCodecs

Timeline：

* Canvas
* PixiJS

不要纯 DOM Timeline。
