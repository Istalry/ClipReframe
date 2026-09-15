# How to use ClipReframe

> 🇫🇷 [Version française](HOW-TO-USE.fr.md)

ClipReframe turns a 16:9 stream clip (gameplay + webcam) into a 1080×1920 vertical video ready for
TikTok and YouTube Shorts. No install: run `ClipReframe-<version>-portable.exe`.

> First launch takes ~20 s while the app unpacks itself into `%TEMP%\ClipReframe`.
> Later launches are instant. You can delete that folder at any time; it is recreated.

## 1. Open a clip

- **Drag & drop** a video anywhere onto the window, or click **Browse…**.
- Supported: `.mp4`, `.mov`, `.mkv`, `.webm`, `.m4v`. Any resolution works; 16:9 is what the layout
  is designed for (you get a notice for other aspect ratios).
- Dropping another file while a clip is open **replaces** the clip (a purple "Drop to replace"
  overlay confirms it). The right-hand panel is excluded from that overlay so you can still drop
  an outro there.

### Multi-track audio

If the clip carries **several audio tracks** (typical OBS recording: mix / mic / Discord / game), an
**Audio tracks** popup opens right after loading. It has two checkbox columns, all ticked by default:

| Column        | What the ticked tracks are used for                                                            |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Subtitles** | Mixed together and fed to speech recognition — tick only the voice tracks for cleaner results. |
| **Export**    | Summed into the exported video's single stereo track — usually everything.                     |

Track names come from the file's stream titles when the recorder wrote them. The choice is per clip
(not saved in configurations) and is summarised in the Subtitles panel as
"Audio: subtitles from tracks 1+2 · export 1+2+3"; click **change** to reopen the popup.
Generating subtitles with no track ticked shows an error; exporting with no track ticked produces a
silent video (the popup warns you). Single-track clips never show the popup. The in-app player only
plays the file's default track; the export and the subtitles follow your selection.

## 2. Frame the two rectangles

The centre shows your source; the right shows the vertical result live.

| Rectangle    | Goes to                | Colour |
| ------------ | ---------------------- | ------ |
| **Webcam**   | top of the vertical    | cyan   |
| **Gameplay** | bottom of the vertical | pink   |

- Drag inside a rectangle to move it. Drag a handle to resize (the aspect ratio is locked so the
  crop always fills its band without distortion).
- Click a rectangle to select it; a rule-of-thirds grid appears.
- **Webcam height** slider — or drag the purple line in the preview — changes how much of the
  vertical frame the webcam gets (20 %–60 %). The rectangles re-fit automatically.
- **Layout → Fill** switches to a single 9:16 crop of the gameplay (no webcam band).

Playback: **Space** play/pause · **← / →** ±1 s (**Shift** = ±5 s) · **M** mute · drag the scrub bar.

## 3. Configurations (presets)

Left sidebar. A configuration stores the layout, both rectangles, the split ratio, the subtitle
settings/style and the outro.

- **New** → name it → **Save**: stores the current settings.
- Click a configuration to **apply** it to the current clip.
- **★** marks the **default**: it is applied automatically every time you open a new clip.
- Change something after applying and an **Update "name"** button appears; the row shows a **●**
  while you have unsaved changes.
- **🗑** deletes (asks for confirmation).

Presets live in `%APPDATA%\ClipReframe\presets.json`; copy that file to move them to another PC.

## 4. Subtitles (optional)

1. Turn on **Subtitles**.
2. Pick the **spoken language** (`Auto-detect` by default; fixing the language is more reliable on short clips).
3. Click **Generate subtitles**. Speech recognition runs locally (nothing is uploaded). Expect
   roughly half the clip's duration on a modern CPU.
4. A clean-up pass removes common recognition artefacts (repeated words, `[Musique]`-style
   markers, looped phrases) — the toast tells you how many were removed.
5. Edit any cue: text, start/end (seconds). Click into a cue to jump the player there; the active
   cue is highlighted while playing. The **🗑** on a row deletes it.
6. **Style**: font (all installed fonts), size, bold/italic/caps, colour, outline or background
   box, shadow, position (bottom / centre / top) and margin, max characters per line (auto-wrap).
   The preview on the right shows the result live.
7. **Current word**: emphasise the word being spoken — **Box** (default, a rounded pill behind
   it), **Text colour**, **Outline colour** (not offered with a background box) or **None** —
   and pick the **highlight colour**. Word timings come from speech recognition; a cue you edit
   keeps them as long as it still has the same number of words, otherwise its duration is spread
   evenly over the words.

Subtitles are **burned into** the video (they are part of the picture), which is what TikTok and
Shorts need for autoplay-without-sound.

## 5. Outro / call to action (optional)

Drop a vertical video onto the **Outro** panel or click **Choose outro…**. It is appended
unchanged after the clip. If it is not 9:16 it is letterboxed, never stretched. Subtitles never
appear on the outro. The outro is saved in the configuration, so a "Shorts" preset can carry its
own end card.

The app keeps its **own copy** of the outro in `%APPDATA%\ClipReframe\outros`, so you can move or
delete the original afterwards. Copies nobody references any more are cleaned up at the next
start. Configurations saved by 0.1.0 still point at the original file: pick the outro again once
and save the configuration to switch them to a copy.

## 6. Export

Click **Export**, choose a folder. The file is named `<clip>_vertical.mp4` (the folder is
remembered). A progress bar shows speed; **Cancel** stops and removes the partial file. When done
the path in the bottom bar opens the folder.

Output: 1080×1920, H.264 High profile, CRF 17 (visually lossless), yuv420p, source frame rate
(capped at 60), AAC 192 kbps 48 kHz, `faststart` — accepted as-is by TikTok and YouTube Shorts.

**GPU encoding.** On start-up the app tests the GPU encoders (NVIDIA NVENC, AMD AMF, Intel Quick
Sync) and uses the first one that works — several times faster than the CPU at an equivalent
constant-quality setting. The selector next to **Export** switches between **GPU** and
**CPU (x264)**; it is remembered per PC. If the GPU encoder fails mid-way the export is redone
on the CPU automatically and a notice tells you. Speech recognition always runs on the CPU.

## Troubleshooting

| Symptom                                                     | Cause / fix                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Red banner "Missing runtime files"                          | The `%TEMP%\ClipReframe                                                                                                  |
| esourcesin` folder was deleted — relaunch the exe.          |
| Video loads but shows black / won't play                    | Codec unsupported by Chromium (e.g. some HEVC/10-bit). Re-encode to H.264 first.                                         |
| "Outro video not found" after applying a preset             | The outro file moved. Pick it again.                                                                                     |
| Subtitles in the wrong language                             | Set the spoken language before generating; `Auto-detect` can misfire on short clips.                                     |
| Exported subtitles look slightly different from the preview | The preview is a CSS approximation of the renderer; sizes and positions match, outline rasterisation differs marginally. |
