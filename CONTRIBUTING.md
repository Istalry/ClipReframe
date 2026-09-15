# Contributing to ClipReframe

Thanks for taking the time to contribute. Bug reports, feature ideas and pull requests are all
welcome — please open an issue first for anything larger than a small fix so we can agree on the
approach before you spend time on it.

## Development setup

Requirements: Windows 10/11 x64, Node 22.12+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm fetch-binaries     # ffmpeg, ffprobe, whisper-cli and the whisper model (~700 MB, once)
pnpm dev -- --watch     # app with hot reload
pnpm check              # lint + typecheck + tests — must pass before every commit
```

If Electron starts as plain Node ("does not provide an export named 'BrowserWindow'"), your
terminal exports `ELECTRON_RUN_AS_NODE=1`; unset it first.

`build.bat` (or `pnpm dist`) produces the portable executable in `release/`.

## Project rules

[CLAUDE.md](CLAUDE.md) is the architecture and coding-standards document for the project — read
it before touching the code. In short:

- `src/shared/` is pure TypeScript with 100 % of exported functions unit-tested.
- Every IPC channel is declared once in `src/shared/ipc-contract.ts`; every child process goes
  through `src/main/services/process.ts`.
- TypeScript `strict`, no `any`, named exports, small pure functions; Prettier and ESLint decide
  formatting and import order.

## Pull requests

- One focused change per PR; keep the diff reviewable.
- Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`, `build:`, `ci:`.
- Add or update tests next to the code (`*.test.ts(x)`), and update `HOW-TO-USE.md` /
  `HOW-TO-USE.fr.md` when behaviour visible to users changes.
- `pnpm check` must be green; CI runs the same command on `windows-latest`.
- Add an entry under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).

## Releasing (maintainers)

1. Move the **Unreleased** section of `CHANGELOG.md` under a new version heading and bump
   `version` in `package.json`.
2. Commit, then tag: `git tag -a vX.Y.Z -m "ClipReframe X.Y.Z"` and push the tag.
3. The `release` workflow builds the portable exe and attaches it to the GitHub Release.
