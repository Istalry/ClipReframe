@echo off
setlocal
REM Builds the portable ClipReframe executable into release\.
REM Usage:  build.bat            (install deps, fetch binaries if missing, check, package)
REM         build.bat --skip-check   skip lint/typecheck/tests
REM         set WHISPER_MODEL=medium before running to bundle a different model.

cd /d "%~dp0"

REM Some IDE terminals set this and make Electron start as plain Node.
set ELECTRON_RUN_AS_NODE=

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [build] pnpm not found. Install Node 22+ and run: npm install -g pnpm
  exit /b 1
)

echo [build] Installing dependencies...
call pnpm install --frozen-lockfile
if errorlevel 1 exit /b 1

if not exist "node_modules\electron\dist\electron.exe" (
  echo [build] Downloading the Electron runtime...
  pushd node_modules\electron
  call node install.js
  popd
  if errorlevel 1 exit /b 1
)

echo [build] Fetching ffmpeg / whisper binaries if missing...
call pnpm fetch-binaries
if errorlevel 1 exit /b 1

if /i "%~1"=="--skip-check" (
  echo [build] Skipping lint / typecheck / tests.
) else (
  echo [build] Running lint, typecheck and tests...
  call pnpm check
  if errorlevel 1 (
    echo [build] Checks failed. Fix them or rerun with --skip-check.
    exit /b 1
  )
)

echo [build] Packaging...
if exist release rmdir /s /q release
call pnpm dist
if errorlevel 1 exit /b 1

echo.
echo [build] Done:
dir /b release\*.exe
endlocal
