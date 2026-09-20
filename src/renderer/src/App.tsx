import { AlertTriangle, Film, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { invoke } from './api';
import { AudioTrackDialog } from './components/AudioTrackDialog/AudioTrackDialog';
import { DropZone } from './components/DropZone/DropZone';
import { ExportBar } from './components/ExportBar/ExportBar';
import { LayoutPanel } from './components/LayoutControls/LayoutPanel';
import { SegmentsPanel } from './components/LayoutControls/SegmentsPanel';
import { Transport } from './components/LayoutControls/Transport';
import { OutroPanel } from './components/OutroPanel/OutroPanel';
import { PresetPanel } from './components/PresetPanel/PresetPanel';
import { SourceStage } from './components/SourceStage/SourceStage';
import { SubtitlePanel } from './components/SubtitlePanel/SubtitlePanel';
import { Toasts } from './components/Toasts/Toasts';
import { Button } from './components/ui/Button';
import { VerticalPreview } from './components/VerticalPreview/VerticalPreview';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePreviewMix } from './hooks/usePreviewMix';
import { useProxy } from './hooks/useProxy';
import { useWindowFileDrop } from './hooks/useWindowFileDrop';
import { useAppStore } from './store/app';
import { usePresetStore } from './store/presets';
import { useProjectStore } from './store/project';
import { useProxyStore } from './store/proxy';

function BinaryWarning({ missing }: { missing: string[] }): ReactNode {
  return (
    <div className="bg-danger/15 text-danger flex items-center gap-2 px-4 py-2 text-xs">
      <AlertTriangle size={14} />
      Missing runtime files: {missing.join(', ')}. Run <code>pnpm fetch-binaries</code> or reinstall
      the app.
    </div>
  );
}

export function App(): ReactNode {
  const source = useProjectStore((s) => s.source);
  const clearSource = useProjectStore((s) => s.clearSource);
  const audio = useProjectStore((s) => s.audio);
  const pendingAudioChoice = useProjectStore((s) => s.pendingAudioChoice);
  const setAudioSelection = useProjectStore((s) => s.setAudioSelection);
  const dismissAudioChoice = useProjectStore((s) => s.dismissAudioChoice);
  const loadPresets = usePresetStore((s) => s.load);
  const loadCapabilities = useAppStore((s) => s.loadCapabilities);
  const [missingBinaries, setMissingBinaries] = useState<string[]>([]);

  useKeyboardShortcuts();
  usePreviewMix();
  useProxy();
  const proxyJob = useProxyStore((s) => s.jobId !== null);
  const proxyFraction = useProxyStore((s) => s.fraction);
  const proxyReady = useProxyStore((s) => s.path !== null);
  const dragging = useWindowFileDrop();

  useEffect(() => {
    void loadPresets();
    void loadCapabilities();
    invoke('app:checkBinaries', undefined)
      .then((r) => {
        setMissingBinaries(r.missing);
      })
      .catch(() => {
        setMissingBinaries(['(could not check)']);
      });
  }, [loadPresets, loadCapabilities]);

  // Apply the default preset the first time a video is loaded.
  const sourcePath = source?.path;
  useEffect(() => {
    if (!sourcePath) {
      return;
    }
    const { defaultPresetId, apply } = usePresetStore.getState();
    if (defaultPresetId && useProjectStore.getState().activePresetId === null) {
      void apply(defaultPresetId);
    }
  }, [sourcePath]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-border bg-panel flex h-11 items-center gap-3 border-b px-4">
        <Film size={18} className="text-accent" />
        <span className="font-semibold">ClipReframe</span>
        <span className="text-muted text-xs">16:9 → 9:16</span>
        {source && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-muted truncate" title={source.path}>
              {source.fileName} · {source.width}×{source.height} · {Math.round(source.fps)} fps
            </span>
            <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={clearSource}>
              Close
            </Button>
          </div>
        )}
      </header>
      {missingBinaries.length > 0 && <BinaryWarning missing={missingBinaries} />}

      <div className="flex min-h-0 flex-1">
        <aside className="border-border bg-panel w-64 shrink-0 border-r p-3">
          <PresetPanel />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          {source ? (
            <>
              <div className="flex min-h-0 flex-1 items-stretch gap-4">
                <div className="min-h-0 min-w-0 flex-1 py-6">
                  <SourceStage source={source} />
                </div>
                <div className="min-h-0 w-[30%] max-w-[420px] shrink-0">
                  <VerticalPreview source={source} />
                </div>
              </div>
              {(proxyJob || proxyReady) && (
                <p className="text-muted text-xs">
                  {proxyJob
                    ? `Preparing a preview for this video… ${Math.round(proxyFraction * 100)}%`
                    : 'Preview uses a lower-quality copy; the export uses the original.'}
                </p>
              )}
              <Transport />
            </>
          ) : (
            <DropZone dragging={dragging} />
          )}
        </main>

        <aside className="border-border bg-panel flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l p-3">
          <LayoutPanel />
          {source && <SegmentsPanel />}
          <SubtitlePanel />
          <OutroPanel />
        </aside>
      </div>

      <ExportBar />
      <Toasts />
      {pendingAudioChoice && source && (
        <AudioTrackDialog
          source={source}
          initial={audio}
          onConfirm={setAudioSelection}
          onCancel={dismissAudioChoice}
        />
      )}
      {dragging && source && (
        // Covers everything except the right sidebar, so the outro panel stays a drop target.
        <div className="bg-bg/70 border-accent pointer-events-none fixed inset-y-0 left-0 z-40 flex w-[calc(100%-20rem)] items-center justify-center border-4 border-dashed text-lg font-semibold">
          Drop to replace the current clip
        </div>
      )}
    </div>
  );
}
