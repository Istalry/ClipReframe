# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.1.1] - 2026-09-16

Configurations saved by 0.1.0 load unchanged (the new word highlight defaults to the purple box).

### Added

- GPU video encoding: NVIDIA NVENC, AMD AMF and Intel Quick Sync are probed at start-up and the
  first working one encodes the export (several times faster than x264 at a matching quality).
  A selector in the export bar forces the CPU; a GPU failure falls back to x264 automatically.
- Sources the built-in player cannot decode (ProRes, some HEVC / 10-bit) are previewed through
  a 720p proxy transcoded on load; the export still reads the original.
- Trim: in/out points set at the playhead (`[` / `]` buttons or `I` / `O` keys) restrict the
  export to that range; the preview loops inside it and subtitles are shifted to match.
- The player plays the export audio mix for multi-track clips (the ticked export tracks summed
  like the export does) instead of the file's default track only.
- Outro videos are copied into `%APPDATA%\ClipReframe\outros` when picked, so configurations
  keep working after the original file is moved or deleted; unreferenced copies are removed at
  start-up.
- Current-word highlight in subtitles: the word being spoken is emphasised with a rounded
  **box** (default), a **text colour** or an **outline colour**, in a colour of your choice
  (default `#a970ff`). Shown in the live preview and burned into the export; stored in
  configurations. Word timings come from whisper.cpp; edited cues keep them when the word count
  is unchanged, otherwise the cue duration is spread evenly over its words.

## [0.1.0] - 2026-09-15

First public release.

### Added

- Drag & drop a 16:9 clip anywhere on the window (or browse), with live 9:16 preview.
- **Split** layout (webcam on top, gameplay below, adjustable ratio) and **Fill** layout
  (single 9:16 crop); draggable, resizable rectangles locked to the output aspect ratio.
- Configurations (presets): save, update, set as default (auto-applied on every new clip),
  delete; stored in `%APPDATA%\ClipReframe\presets.json`.
- Offline subtitles with whisper.cpp (`small` model, auto-detect by default or one of
  6 fixed languages), automatic clean-up of repetitions and hallucinated cues, editable cue list, full
  styling (font, size, colours, outline, box, position) burned into the export.
- Multi-track audio: for clips with several audio tracks (OBS mic / Discord / game), choose
  which tracks feed speech recognition and which are mixed into the export.
- Optional call-to-action outro video appended to every export, letter-boxed to 1080×1920.
- Export to a single MP4 — H.264 High, CRF 17 / preset slow, AAC 48 kHz, `+faststart` — with
  progress and cancellation.
- Portable Windows executable bundling ffmpeg, whisper.cpp and the speech model; `build.bat`
  one-click packaging; binaries pinned and checksum-verified at fetch time.
- English and French user guides.

[Unreleased]: https://github.com/Istalry/ClipReframe/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Istalry/ClipReframe/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Istalry/ClipReframe/releases/tag/v0.1.0
