# Third-party software

ClipReframe itself is released under the MIT licence (see [LICENSE](LICENSE)). The portable
executable additionally bundles the following third-party components, unmodified, in its
`resources/bin` folder. They are downloaded at build time by `scripts/fetch-binaries.mjs` and are
run as **separate processes**; the ClipReframe code does not link against them.

## FFmpeg (ffmpeg.exe, ffprobe.exe and the av\*/sw\*/postproc DLLs)

- Project: https://ffmpeg.org
- Build: BtbN FFmpeg-Builds, `win64-gpl-shared` variant — https://github.com/BtbN/FFmpeg-Builds
- Licence: **GNU General Public License version 3** (the build enables GPL components such as
  libx264). The full licence text is at https://www.gnu.org/licenses/gpl-3.0.html.
- Source code: every BtbN release page links the exact FFmpeg commit and the sources of all
  enabled libraries; FFmpeg's own source is at https://git.ffmpeg.org/ffmpeg.git. The build tag
  used for a given ClipReframe release is recorded in `scripts/fetch-binaries.mjs`.

Because the redistributed executable contains a GPL-licensed FFmpeg build, anyone who
redistributes ClipReframe must keep this notice and the GPL text available with it.

## whisper.cpp (whisper-cli.exe, whisper.dll, ggml\*.dll)

- Project: https://github.com/ggml-org/whisper.cpp — Copyright (c) 2023-2024 The ggml authors
- Licence: MIT — https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE
- Includes ggml (MIT) — https://github.com/ggml-org/ggml

## Whisper model weights (ggml-\*.bin)

- Original model: OpenAI Whisper — https://github.com/openai/whisper (MIT)
- ggml conversion hosted at https://huggingface.co/ggerganov/whisper.cpp (MIT)

## Electron and npm dependencies

Electron (MIT, https://github.com/electron/electron) and the JavaScript dependencies listed in
`package.json` are bundled in the application archive. Run `pnpm licenses list` in the repository
to print every package and its licence.

## Application icon

`resources/icon.ico` was generated for this project by its author and is covered by the project's
MIT licence.
