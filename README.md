# ClipReframe

Turn a 16:9 gameplay + webcam clip into a 1080×1920 vertical video for TikTok and YouTube Shorts.

See **[HOW-TO-USE.md](HOW-TO-USE.md)** for the user guide (**[version française](HOW-TO-USE.fr.md)**).

- Drag & drop a clip anywhere on the window, position the **webcam** and **gameplay** rectangles, watch the live 9:16 preview.
- Two layouts: **Split** (webcam on top, gameplay below, adjustable ratio) and **Fill** (one 9:16 crop).
- Save configurations, mark one as default (auto-applied on every new clip), delete the ones you no longer use.
- Optional subtitles: offline speech-to-text (whisper.cpp `small` model, French by default), automatic clean-up
  of Whisper hallucinations, editable cues, fully styled (font, size, colours, outline, box, position) and burned in.
- Optional call-to-action outro (drop or pick a vertical video) appended to every export.
- Export: single MP4 — H.264 High, CRF 17 / preset slow, yuv420p, AAC 48 kHz, `+faststart` — valid for both platforms.

Ships as a single portable Windows `.exe`; nothing to install.

## Requirements

- Windows 10/11 x64
- Node 22.12+ and pnpm (development only)

## Development

```bash
pnpm install
pnpm fetch-binaries     # downloads ffmpeg, ffprobe, whisper-cli and the whisper model (~700 MB, once)
pnpm dev -- --watch     # app with hot reload; main-process changes restart Electron
pnpm check              # lint + typecheck + tests
```

The default model is `small` (best accuracy/speed trade-off on CPU). `WHISPER_MODEL=medium pnpm fetch-binaries`
swaps in the larger model (1.5 GB, ~3x slower, marginally better); `base` is faster but noticeably worse in French.
The app picks the largest `ggml-*.bin` present in `resources/bin`.

> If Electron starts as plain Node (errors like "does not provide an export named 'BrowserWindow'"),
> unset `ELECTRON_RUN_AS_NODE` in your shell first — some IDE terminals set it.

## Build the portable executable

```bash
pnpm dist          # or double-click build.bat (installs, fetches binaries, runs checks, packages)
```

`build.bat --skip-check` skips lint/typecheck/tests.

Produces `release/ClipReframe-<version>-portable.exe` (~600 MB with the `small` model). Copy that one
file anywhere and run it. The bundled binaries are extracted next to it on first launch (`ClipReframe/`
folder, kept between runs).

## Limitations

- Windows x64 only.
- CPU encoding (libx264) and CPU speech recognition; no GPU acceleration yet.
- Preview playback relies on Chromium decoders: H.264 / VP9 / AV1 play; some HEVC or 10-bit sources
  will not preview (export still works). No proxy transcoding yet.
- The whole clip is exported; no in-app trimming.
- Subtitle preview is a CSS approximation of libass; the burned-in result can differ marginally.
- Presets store the outro by absolute path; moving the file requires re-picking it.

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
