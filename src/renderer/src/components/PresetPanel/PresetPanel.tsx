import { Captions, Clapperboard, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import type { Preset } from '@shared/types';

import { usePresetStore } from '../../store/presets';
import { useProjectStore } from '../../store/project';
import { Button } from '../ui/Button';

import { PresetThumbnail } from './PresetThumbnail';

interface PresetRowProps {
  preset: Preset;
  active: boolean;
  isDefault: boolean;
  dirty: boolean;
  onApply: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}

function PresetRow({
  preset,
  active,
  isDefault,
  dirty,
  onApply,
  onSetDefault,
  onDelete,
}: PresetRowProps): ReactNode {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`preset-${preset.id}`}
      onClick={onApply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onApply();
        }
      }}
      className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${active ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-panel-2'}`}
    >
      <PresetThumbnail settings={preset} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-sm">
          <span className="truncate">{preset.name}</span>
          {active && dirty && (
            <span title="Modified since applied" className="text-accent">
              ●
            </span>
          )}
        </div>
        <div className="text-muted flex items-center gap-1.5 text-[10px]">
          <span>{preset.layout === 'split' ? 'Split' : 'Fill'}</span>
          {preset.subtitles.enabled && <Captions size={11} aria-label="Subtitles" />}
          {preset.outro && <Clapperboard size={11} aria-label="Outro" />}
        </div>
      </div>
      <button
        type="button"
        title={isDefault ? 'Default preset (applied on load)' : 'Set as default'}
        aria-label={isDefault ? 'Default preset' : 'Set as default'}
        aria-pressed={isDefault}
        onClick={(e) => {
          e.stopPropagation();
          onSetDefault();
        }}
        className={`rounded p-1 ${isDefault ? 'text-yellow-400' : 'text-muted opacity-0 group-hover:opacity-100 hover:text-yellow-400'}`}
      >
        <Star size={14} fill={isDefault ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        title="Delete preset"
        aria-label="Delete preset"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-muted hover:text-danger rounded p-1 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function PresetPanel(): ReactNode {
  const presets = usePresetStore((s) => s.presets);
  const defaultPresetId = usePresetStore((s) => s.defaultPresetId);
  const apply = usePresetStore((s) => s.apply);
  const saveAs = usePresetStore((s) => s.saveAs);
  const update = usePresetStore((s) => s.update);
  const remove = usePresetStore((s) => s.remove);
  const setDefault = usePresetStore((s) => s.setDefault);

  const settings = useProjectStore((s) => s.settings);
  const activePresetId = useProjectStore((s) => s.activePresetId);
  const dirty = useProjectStore((s) => s.dirty);

  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Preset | null>(null);

  const activePreset = presets.find((p) => p.id === activePresetId);

  const commitSaveAs = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    void saveAs(trimmed, settings);
    setName('');
    setNaming(false);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase">Configurations</h2>
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus size={14} />}
          title="Save current settings as a new configuration"
          onClick={() => {
            setNaming(true);
          }}
        >
          New
        </Button>
      </div>

      {naming && (
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            commitSaveAs();
          }}
        >
          <input
            autoFocus
            aria-label="Configuration name"
            value={name}
            maxLength={60}
            placeholder="Name…"
            onChange={(e) => {
              setName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNaming(false);
              }
            }}
            className="bg-panel-2 border-border h-8 min-w-0 flex-1 rounded-md border px-2 text-sm"
          />
          <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
            Save
          </Button>
        </form>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {presets.length === 0 && !naming && (
          <p className="text-muted px-2 py-4 text-center text-xs">
            No configuration yet. Position the rectangles, then click <strong>New</strong>.
          </p>
        )}
        {presets.map((p) => (
          <PresetRow
            key={p.id}
            preset={p}
            active={p.id === activePresetId}
            isDefault={p.id === defaultPresetId}
            dirty={dirty}
            onApply={() => {
              void apply(p.id);
            }}
            onSetDefault={() => {
              void setDefault(p.id === defaultPresetId ? null : p.id);
            }}
            onDelete={() => {
              setConfirmDelete(p);
            }}
          />
        ))}
      </div>

      {activePreset && dirty && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Save size={14} />}
          onClick={() => {
            void update(activePreset.id, settings);
          }}
        >
          Update “{activePreset.name}”
        </Button>
      )}

      {confirmDelete && (
        <div role="alertdialog" className="bg-panel-2 border-border rounded-md border p-2 text-xs">
          <p>
            Delete <strong>{confirmDelete.name}</strong>?
          </p>
          <div className="mt-2 flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirmDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                void remove(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
