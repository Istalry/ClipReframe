import { fireEvent, render, screen } from '@testing-library/react';

import { defaultAudioSelection } from '@shared/audio';
import type { AudioSelection, VideoInfo } from '@shared/types';

import { AudioTrackDialog } from './AudioTrackDialog';

const source: VideoInfo = {
  path: 'C:\\clips\\stream.mkv',
  fileName: 'stream.mkv',
  width: 1920,
  height: 1080,
  duration: 30,
  fps: 60,
  videoCodec: 'h264',
  audioTracks: [
    { index: 0, codec: 'aac', channels: 2, sampleRate: 48000, label: 'Mic' },
    { index: 1, codec: 'aac', channels: 2, sampleRate: 48000, label: null },
    { index: 2, codec: 'opus', channels: 1, sampleRate: 48000, label: 'Game' },
  ],
};

function setup(): { onConfirm: ReturnType<typeof vi.fn>; onCancel: ReturnType<typeof vi.fn> } {
  const onConfirm = vi.fn<(s: AudioSelection) => void>();
  const onCancel = vi.fn();
  render(
    <AudioTrackDialog
      source={source}
      initial={defaultAudioSelection(source)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe('AudioTrackDialog', () => {
  it('renders one row per track with its label and everything ticked', () => {
    setup();
    expect(screen.getByText('Mic')).toBeInTheDocument();
    expect(screen.getByText('Game')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeChecked();
    }
  });

  it('confirms the edited selection', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByLabelText('Track 3 subtitles'));
    fireEvent.click(screen.getByLabelText('Track 1 export'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith({ transcribeTracks: [0, 1], exportTracks: [1, 2] });
  });

  it('header checkbox toggles a whole column and warns about a silent export', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByLabelText('All tracks for export'));
    expect(screen.getByRole('status')).toHaveTextContent(/silent/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith({ transcribeTracks: [0, 1, 2], exportTracks: [] });
  });

  it('"Use all tracks" ignores edits and Escape cancels', () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByLabelText('Track 2 subtitles'));
    fireEvent.click(screen.getByRole('button', { name: 'Use all tracks' }));
    expect(onConfirm).toHaveBeenCalledWith(defaultAudioSelection(source));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
