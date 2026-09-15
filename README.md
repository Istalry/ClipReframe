# ClipReframe

Turn a 16:9 gameplay + webcam clip into a 1080×1920 vertical video for TikTok and YouTube Shorts.

- Drag & drop a clip, position the **webcam** and **gameplay** rectangles, watch the live 9:16 preview.
- Two layouts: **Split** (webcam on top, gameplay below, adjustable ratio) and **Fill** (one 9:16 crop).
- Save configurations, mark one as default (auto-applied on every new clip), delete the ones you no longer use.
- Optional subtitles: offline speech-to-text (whisper.cpp, French by default), automatic clean-up of Whisper
  hallucinations, editable cues, fully styled (font, size, colours, outline, box, position) and burned in.
- Optional call-to-action outro appended to every export.
- Export: single MP4 — H.264 High, yuv420p, AAC 48 kHz, `+faststart` — valid for both platforms.

Ships as a single portable Windows `.exe`; nothing to install.

## Requirements

- Windows 10/11 x64
- Node 22.12+ and pnpm (development only)

## Development

```bash
pnpm install
pnpm fetch-binaries     # downloads ffmpeg, ffprobe, whisper-cli and the whisper model (~350 MB, once)
pnpm dev -- --watch     # app with hot reload; main-process changes restart Electron
pnpm check              # lint + typecheck + tests
```

`WHISPER_MODEL=small pnpm fetch-binaries` swaps in the larger, more accurate model (~470 MB).

> If Electron starts as plain Node (errors like "does not provide an export named 'BrowserWindow'"),
> unset `ELECTRON_RUN_AS_NODE` in your shell first — some IDE terminals set it.

## Build the portable executable

```bash
pnpm dist
```

Produces `release/ClipReframe-<version>-portable.exe`. Copy that one file anywhere and run it. The
bundled binaries are extracted next to it on first launch (`ClipReframe/` folder).

## Project layout

See [CLAUDE.md](CLAUDE.md) for the architecture, coding standards and contribution rules.

```
src/shared/    pure logic (geometry, ffmpeg graph, subtitles, presets, IPC contract) — unit-tested
src/main/      Electron main: services (ffmpeg, whisper, presets store), IPC handlers, media protocol
src/preload/   typed contextBridge
src/renderer/  React UI (Zustand stores, components, hooks)
scripts/       fetch-binaries.mjs
resources/     app icon; resources/bin/ holds the downloaded binaries (git-ignored)
```

## Presets location

`%APPDATA%\ClipReframe\presets.json`. A corrupt file is backed up next to it and reset.

## Licence

MIT. FFmpeg (GPL build from BtbN) and whisper.cpp (MIT) are redistributed as separate executables.
