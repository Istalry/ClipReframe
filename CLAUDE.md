# ClipReframe — Development Guidelines

ClipReframe is a Windows desktop app that reframes a 16:9 gameplay + webcam clip into a
1080×1920 (9:16) vertical video for TikTok / YouTube Shorts. It ships as a single portable `.exe`.

## Commands

| Command                    | Purpose                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm install`             | Install dependencies                                                                  |
| `pnpm fetch-binaries`      | Download ffmpeg / ffprobe / whisper-cli / model into `resources/bin/` (required once) |
| `pnpm dev`                 | Run the app with hot reload                                                           |
| `pnpm check`               | `lint` + `typecheck` + `test` — must pass before every commit                         |
| `pnpm lint` / `lint:fix`   | ESLint (strict type-checked rules)                                                    |
| `pnpm typecheck`           | `tsc --noEmit` for both the Node and the web tsconfig                                 |
| `pnpm test` / `test:watch` | Vitest                                                                                |
| `pnpm format`              | Prettier                                                                              |
| `pnpm build`               | Bundle main / preload / renderer into `out/`                                          |
| `pnpm dist`                | Build + package the portable `.exe` into `release/`                                   |

## Architecture

Electron has three isolated processes; each has its own folder under `src/`:

- `src/main/` — Node. App lifecycle, windows, IPC handlers, and **services** that spawn
  `ffmpeg` / `ffprobe` / `whisper-cli` and read/write disk.
- `src/preload/` — the only bridge. Exposes a typed `window.api` through `contextBridge`.
- `src/renderer/` — React UI. **Never** imports Node modules; it only talks to `window.api`.
- `src/shared/` — **pure** TypeScript used by all three: geometry, ffmpeg filtergraph builder,
  ASS subtitle generator, Whisper JSON parser + clean-up, preset schema, IPC contract.
  No `node:*`, no `electron`, no DOM access, no side effects. Everything here is unit-tested.

Data flow: renderer → `window.api.<domain>.<method>()` → preload → `ipcRenderer.invoke` →
`src/main/ipc/<domain>.ts` → service → back. Long-running work (export, transcription) reports
progress through `webContents.send` events declared in the IPC contract.

### Hard rules

1. `src/shared/` stays pure. If it needs Node or DOM it does not belong there.
2. `main` never imports from `renderer`; `renderer` never imports from `main`.
3. Every IPC channel is declared once in `src/shared/ipc-contract.ts` (name + zod request/response
   schema). Handlers parse their input with that schema. Preload exposes exactly that surface.
4. Every file read from disk (presets, whisper output, progress) is parsed through a zod schema.
5. Every child process is spawned through `src/main/services/process.ts` (cancellable, stderr
   captured, typed errors). Never call `child_process` directly elsewhere.
6. Rectangles are stored **normalized** (0..1 relative to the source frame). Convert to pixels only
   in the export builder and the preview drawing code.

## Coding standards

- TypeScript `strict` everywhere. No `any`. No non-null assertion `!` without a comment explaining
  why it is safe. Prefer `unknown` + narrowing.
- Named exports only (except React lazy entry points). One concept per file; keep files under
  ~300 lines — split when they grow.
- Functions are small and pure where possible. Business logic lives in `shared/` or in hooks /
  store actions, **not** inside JSX components. Components are presentational.
- State: one Zustand slice per domain in `src/renderer/src/store/`. Components subscribe with
  selectors; never pass the whole store around.
- Errors: throw `AppError` (`src/shared/errors.ts`) with a stable `code`. Never swallow errors;
  never `console.log` in production paths — use the logger in `main` and toasts in `renderer`.
- Async: every long operation accepts an `AbortSignal` and cleans up temp files on cancel/failure.
- Windows specifics that bite: ffmpeg filter paths need forward slashes and `\:` escaping; crop
  width/height/x/y must be even (yuv420p); the `subtitles` filter needs `fontsdir`.
- Formatting is Prettier's job. Import order is ESLint's job. Do not hand-format.
- Comments explain _why_, not _what_. Keep the density similar to surrounding code.

## Testing

- Vitest. Tests live next to the code as `*.test.ts(x)`.
- `shared/` modules: 100 % of exported functions covered, including edge cases (odd dimensions,
  empty cue lists, Windows paths with spaces and accents).
- `main/services`: tested with a mocked `process.ts` — never spawn real binaries in tests.
- Renderer: Testing Library for behaviour-heavy components (TransformRect, PresetPanel).
- Run `pnpm check` before committing. CI runs the same command.

## Git

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
- Never commit `resources/bin/`, `out/`, `dist/`, `release/`, `node_modules/`.
- Small, focused commits; one milestone feature per PR.

## Adding an IPC endpoint (checklist)

1. Add schemas + channel name in `src/shared/ipc-contract.ts`.
2. Implement the handler in `src/main/ipc/<domain>.ts` and register it in `src/main/ipc/index.ts`.
3. Expose it in `src/preload/index.ts` (types come from the contract — no duplication).
4. Call it from a store action or hook in the renderer, never directly from JSX.
5. Add a test for the pure logic; mock the process layer for the service.
