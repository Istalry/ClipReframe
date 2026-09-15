# Security policy

## Scope

ClipReframe is an offline desktop application. It never sends your videos or any telemetry over
the network. The only network access happens at **build time**, when `pnpm fetch-binaries`
downloads ffmpeg, whisper.cpp and the speech model from their official release pages; those
downloads are pinned to exact versions and verified against SHA-256 digests recorded in
`scripts/fetch-binaries.mjs`.

The application processes untrusted media files with ffmpeg/ffprobe and whisper.cpp. A
vulnerability in those upstream projects can affect ClipReframe; we bump the pinned versions when
fixes are released.

## Supported versions

Only the latest release receives fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use GitHub's private vulnerability
reporting on this repository (**Security → Report a vulnerability**). Include the steps to
reproduce and, if relevant, a minimal media file that triggers the problem.

You will get an acknowledgement within a week. Once a fix is available it is released as a new
version and the advisory is published.
