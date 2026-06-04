# Lumen Studio

AI 短剧创作桌面端 (skeleton)。流水线: Theme → Outline → Chapter → Storyboard → Compose。

## Stack

- Electron 33 + electron-vite 2 + Vite 5
- React 18 + TypeScript 5
- TailwindCSS 3 (dark, dense, Premiere/DaVinci-leaning tokens)
- Zod for typed IPC contracts
- (Deferred) better-sqlite3, ffmpeg-static, AI providers

## Layout

```
electron/
  main/        Electron main process
  preload/     contextBridge → window.lumen
  services/
    db/        Data path bootstrap (SQLite to be added)
shared/        Cross-process Zod schemas + channel names
src/           Renderer (React)
  layout/      Three-panel pro shell + status bar
  ipc/         Typed renderer-side IPC client
```

## Dev

```powershell
npm install
npm run dev
```

## Conventions

See `.windsurf/rules/ui.md` (visual) and `.windsurf/rules/code.md` (code).
