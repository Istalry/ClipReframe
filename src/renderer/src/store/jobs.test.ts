import type { VideoInfo } from '@shared/types';

import { useJobStore } from './jobs';
import { useProjectStore } from './project';
import { useToastStore } from './toasts';

const invoke = vi.fn<(channel: string, request: unknown) => Promise<unknown>>();
vi.mock('../api', () => ({
  invoke: (channel: string, request: unknown) => invoke(channel, request),
  subscribe: () => () => undefined,
  getPathForFile: vi.fn(),
  newJobId: () => 'job',
}));

const source: VideoInfo = {
  path: 'C:\\clips\\in.mp4',
  fileName: 'in.mp4',
  width: 1920,
  height: 1080,
  duration: 10,
  fps: 30,
  videoCodec: 'h264',
  audioTracks: [
    { index: 0, codec: 'aac', channels: 2, sampleRate: 48000, label: null },
    { index: 1, codec: 'aac', channels: 2, sampleRate: 48000, label: null },
  ],
};

beforeEach(() => {
  invoke.mockReset();
  useToastStore.setState({ toasts: [] });
  useJobStore.setState({ transcribeJob: null, exportJob: null });
  useProjectStore.setState({
    source,
    cues: [],
    audio: { transcribeTracks: [0, 1], exportTracks: [0, 1] },
  });
});

describe('startTranscription', () => {
  it('passes the selected tracks to the main process', async () => {
    invoke.mockResolvedValue({ cues: [], removedCount: 0, detectedLanguage: 'fr' });
    useProjectStore.setState({ audio: { transcribeTracks: [1], exportTracks: [0, 1] } });
    await useJobStore.getState().startTranscription();
    expect(invoke).toHaveBeenCalledWith(
      'subtitles:transcribe',
      expect.objectContaining({ audioTracks: [1] }),
    );
  });

  it('shows an error and does not start when no track is selected', async () => {
    useProjectStore.setState({ audio: { transcribeTracks: [], exportTracks: [0, 1] } });
    await useJobStore.getState().startTranscription();
    expect(invoke).not.toHaveBeenCalled();
    const [toast] = useToastStore.getState().toasts;
    expect(toast?.kind).toBe('error');
    expect(toast?.title).toMatch(/at least one audio track/);
  });

  it('shows an error for a clip without audio', async () => {
    useProjectStore.setState({ source: { ...source, audioTracks: [] } });
    await useJobStore.getState().startTranscription();
    expect(invoke).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts[0]?.title).toMatch(/no audio/);
  });
});

describe('startExport', () => {
  it('sends the export track selection', async () => {
    invoke.mockResolvedValue({ outputPath: 'D:\\out.mp4' });
    await useJobStore.getState().startExport('D:\\out.mp4');
    expect(invoke).toHaveBeenCalledWith(
      'export:start',
      expect.objectContaining({ audio: { transcribeTracks: [0, 1], exportTracks: [0, 1] } }),
    );
  });
});
