import { useEffect, useState, type ReactNode } from 'react';

import type { SubtitleAlignment } from '@shared/types';

import { invoke } from '../../api';
import { useProjectStore } from '../../store/project';
import { ColorInput, Field, SectionTitle, Select, Slider, Toggle } from '../ui/Field';

const ALIGNMENTS: { value: SubtitleAlignment; label: string }[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Centre' },
  { value: 'top', label: 'Top' },
];

let fontsCache: string[] | null = null;

export function StyleEditor(): ReactNode {
  const style = useProjectStore((s) => s.settings.subtitles.style);
  const updateStyle = useProjectStore((s) => s.updateStyle);
  const [fonts, setFonts] = useState<string[]>(fontsCache ?? [style.fontFamily]);

  useEffect(() => {
    if (fontsCache) {
      return;
    }
    let cancelled = false;
    invoke('fonts:list', undefined)
      .then((list) => {
        fontsCache = list;
        if (!cancelled) {
          setFonts(list);
        }
      })
      .catch(() => {
        /* fallback list already shown; main logged the failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fontOptions = (fonts.includes(style.fontFamily) ? fonts : [style.fontFamily, ...fonts]).map(
    (f) => ({ value: f, label: f }),
  );

  return (
    <div className="flex flex-col">
      <SectionTitle>Style</SectionTitle>
      <Field label="Font">
        <Select
          value={style.fontFamily}
          options={fontOptions}
          onChange={(fontFamily) => {
            updateStyle({ fontFamily });
          }}
        />
      </Field>
      <Field label="Size">
        <Slider
          value={style.fontSize}
          min={24}
          max={140}
          onChange={(fontSize) => {
            updateStyle({ fontSize });
          }}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Bold" inline>
          <Toggle
            checked={style.bold}
            onChange={(bold) => {
              updateStyle({ bold });
            }}
          />
        </Field>
        <Field label="Italic" inline>
          <Toggle
            checked={style.italic}
            onChange={(italic) => {
              updateStyle({ italic });
            }}
          />
        </Field>
        <Field label="Caps" inline>
          <Toggle
            checked={style.uppercase}
            onChange={(uppercase) => {
              updateStyle({ uppercase });
            }}
          />
        </Field>
      </div>
      <Field label="Text colour" inline>
        <ColorInput
          value={style.primaryColor}
          onChange={(primaryColor) => {
            updateStyle({ primaryColor });
          }}
        />
      </Field>
      <Field label="Background box" inline>
        <Toggle
          checked={style.backgroundBox}
          onChange={(backgroundBox) => {
            updateStyle({ backgroundBox });
          }}
        />
      </Field>
      {style.backgroundBox ? (
        <Field label="Box colour" inline>
          <ColorInput
            value={style.backgroundColor}
            onChange={(backgroundColor) => {
              updateStyle({ backgroundColor });
            }}
          />
        </Field>
      ) : (
        <>
          <Field label="Outline colour" inline>
            <ColorInput
              value={style.outlineColor}
              onChange={(outlineColor) => {
                updateStyle({ outlineColor });
              }}
            />
          </Field>
          <Field label="Outline width">
            <Slider
              value={style.outlineWidth}
              min={0}
              max={12}
              step={0.5}
              onChange={(outlineWidth) => {
                updateStyle({ outlineWidth });
              }}
            />
          </Field>
          <Field label="Shadow">
            <Slider
              value={style.shadow}
              min={0}
              max={10}
              step={0.5}
              onChange={(shadow) => {
                updateStyle({ shadow });
              }}
            />
          </Field>
        </>
      )}
      <Field label="Position">
        <Select
          value={style.alignment}
          options={ALIGNMENTS}
          onChange={(alignment) => {
            updateStyle({ alignment });
          }}
        />
      </Field>
      {style.alignment !== 'center' && (
        <Field label="Margin from edge">
          <Slider
            value={style.marginV}
            min={0}
            max={800}
            step={10}
            onChange={(marginV) => {
              updateStyle({ marginV });
            }}
            format={(v) => `${v}px`}
          />
        </Field>
      )}
      <Field label="Max characters per line">
        <Slider
          value={style.maxLineChars}
          min={12}
          max={60}
          onChange={(maxLineChars) => {
            updateStyle({ maxLineChars });
          }}
        />
      </Field>
    </div>
  );
}
