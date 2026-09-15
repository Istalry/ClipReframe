import { AudioLines, Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatTrackList } from '@shared/audio';
import {
  SUBTITLE_LANGUAGE_CODES,
  SUBTITLE_LANGUAGE_LABELS,
  type SubtitleLanguage,
} from '@shared/constants';

import { useJobStore } from '../../store/jobs';
import { useProjectStore } from '../../store/project';
import { Button } from '../ui/Button';
import { Field, SectionTitle, Select, Toggle } from '../ui/Field';

import { CueList } from './CueList';
import { StyleEditor } from './StyleEditor';

const LANGUAGE_OPTIONS = SUBTITLE_LANGUAGE_CODES.map((code) => ({
  value: code,
  label: SUBTITLE_LANGUAGE_LABELS[code],
}));

const PHASE_LABEL = {
  extracting: 'Extracting audio…',
  transcribing: 'Transcribing…',
  cleaning: 'Cleaning up…',
} as const;

export function SubtitlePanel(): ReactNode {
  const subtitles = useProjectStore((s) => s.settings.subtitles);
  const cues = useProjectStore((s) => s.cues);
  const hasSource = useProjectStore((s) => s.source !== null);
  const trackCount = useProjectStore((s) => s.source?.audioTracks.length ?? 0);
  const audio = useProjectStore((s) => s.audio);
  const openAudioChoice = useProjectStore((s) => s.openAudioChoice);
  const updateSubtitles = useProjectStore((s) => s.updateSubtitles);

  const job = useJobStore((s) => s.transcribeJob);
  const start = useJobStore((s) => s.startTranscription);
  const cancel = useJobStore((s) => s.cancelTranscription);

  const percent = job?.progress ? Math.round(job.progress.fraction * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Subtitles</SectionTitle>
        <Toggle
          label="Enable subtitles"
          checked={subtitles.enabled}
          onChange={(enabled) => {
            updateSubtitles({ enabled });
          }}
        />
      </div>

      {subtitles.enabled && (
        <>
          <Field label="Spoken language">
            <Select<SubtitleLanguage>
              value={subtitles.language}
              options={LANGUAGE_OPTIONS}
              disabled={job !== null}
              onChange={(language) => {
                updateSubtitles({ language });
              }}
            />
          </Field>

          {trackCount > 1 && (
            <div className="text-muted flex items-center gap-1 text-xs">
              <AudioLines size={12} />
              <span>
                Audio: subtitles from tracks {formatTrackList(audio.transcribeTracks)} · export{' '}
                {formatTrackList(audio.exportTracks)}
              </span>
              <button
                type="button"
                className="text-accent hover:underline"
                disabled={job !== null}
                onClick={openAudioChoice}
              >
                change
              </button>
            </div>
          )}

          {job ? (
            <div className="bg-panel-2 flex flex-col gap-1 rounded-md p-2">
              <div className="flex items-center justify-between text-xs">
                <span>{job.progress ? PHASE_LABEL[job.progress.phase] : 'Starting…'}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X size={12} />}
                  onClick={() => {
                    void cancel();
                  }}
                >
                  Cancel
                </Button>
              </div>
              <div className="bg-border h-1.5 overflow-hidden rounded">
                <div className="bg-accent h-full transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              icon={<Sparkles size={14} />}
              disabled={!hasSource}
              onClick={() => {
                void start();
              }}
            >
              {cues.length > 0 ? 'Regenerate subtitles' : 'Generate subtitles'}
            </Button>
          )}

          <CueList />
          <StyleEditor />
        </>
      )}
    </div>
  );
}
