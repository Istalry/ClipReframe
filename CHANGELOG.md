# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/Istalry/ClipReframe/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Istalry/ClipReframe/releases/tag/v0.1.0
