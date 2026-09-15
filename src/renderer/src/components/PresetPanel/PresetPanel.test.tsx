import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createDefaultSettings } from '@shared/presets/schema';
import type { Preset } from '@shared/types';

import { usePresetStore } from '../../store/presets';
import { useProjectStore } from '../../store/project';

import { PresetPanel } from './PresetPanel';

const invoke = vi.fn<(channel: string, request: unknown) => Promise<unknown>>();
vi.mock('../../api', () => ({
  invoke: (channel: string, request: unknown) => invoke(channel, request),
  subscribe: vi.fn(),
  getPathForFile: vi.fn(),
  newJobId: () => 'job',
}));

const makePreset = (id: string, name: string, patch: Partial<Preset> = {}): Preset => ({
  ...createDefaultSettings(),
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

beforeEach(() => {
  invoke.mockReset();
  usePresetStore.setState({ presets: [], defaultPresetId: null, loaded: true });
  useProjectStore.setState({
    settings: createDefaultSettings(),
    activePresetId: null,
    dirty: false,
    source: null,
  });
});

describe('PresetPanel', () => {
  it('shows an empty hint when there are no presets', () => {
    render(<PresetPanel />);
    expect(screen.getByText(/No configuration yet/)).toBeInTheDocument();
  });

  it('lists presets and applies one on click', async () => {
    const fill = makePreset('p1', 'Fill only', { layout: 'fill' });
    usePresetStore.setState({ presets: [fill] });
    render(<PresetPanel />);
    fireEvent.click(screen.getByTestId('preset-p1'));
    await waitFor(() => {
      expect(useProjectStore.getState().settings.layout).toBe('fill');
    });
    expect(useProjectStore.getState().activePresetId).toBe('p1');
    expect(useProjectStore.getState().dirty).toBe(false);
  });

  it('saves the current settings as a new preset', async () => {
    invoke.mockImplementation((_channel, request) =>
      Promise.resolve(makePreset('new', (request as { name: string }).name)),
    );
    render(<PresetPanel />);
    fireEvent.click(screen.getByRole('button', { name: /New/ }));
    fireEvent.change(screen.getByLabelText('Configuration name'), { target: { value: 'Shorts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(usePresetStore.getState().presets.map((p) => p.name)).toEqual(['Shorts']);
    });
    expect(invoke).toHaveBeenCalledWith(
      'presets:save',
      expect.objectContaining({ name: 'Shorts', settings: expect.any(Object) }),
    );
    expect(useProjectStore.getState().activePresetId).toBe('new');
  });

  it('asks for confirmation before deleting', async () => {
    usePresetStore.setState({ presets: [makePreset('p1', 'Old one')] });
    invoke.mockResolvedValue({ version: 1, defaultPresetId: null, presets: [] });
    render(<PresetPanel />);
    fireEvent.click(screen.getByLabelText('Delete preset'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete Old one?');
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(usePresetStore.getState().presets).toHaveLength(0);
    });
    expect(invoke).toHaveBeenCalledWith('presets:delete', { id: 'p1' });
  });

  it('toggles the default preset with the star', async () => {
    usePresetStore.setState({ presets: [makePreset('p1', 'Main')] });
    invoke.mockResolvedValue({ version: 1, defaultPresetId: 'p1', presets: [] });
    render(<PresetPanel />);
    fireEvent.click(screen.getByLabelText('Set as default'));
    await waitFor(() => {
      expect(usePresetStore.getState().defaultPresetId).toBe('p1');
    });
    expect(invoke).toHaveBeenCalledWith('presets:setDefault', { id: 'p1' });
    expect(screen.getByLabelText('Default preset')).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers to update the active preset once settings are modified', () => {
    usePresetStore.setState({ presets: [makePreset('p1', 'Main')] });
    useProjectStore.setState({ activePresetId: 'p1', dirty: true });
    render(<PresetPanel />);
    expect(screen.getByRole('button', { name: /Update “Main”/ })).toBeInTheDocument();
  });
});
