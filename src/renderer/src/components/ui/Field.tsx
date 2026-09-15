import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string | undefined;
  /** Render label and control on one row. */
  inline?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, inline = false, children }: FieldProps): ReactNode {
  if (inline) {
    return (
      <label className="flex items-center justify-between gap-3 py-1">
        <span className="text-muted text-xs">{label}</span>
        <span className="flex items-center gap-2">{children}</span>
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1 py-1">
      <span className="text-muted text-xs">{label}</span>
      {children}
      {hint && <span className="text-muted/70 text-[11px]">{hint}</span>}
    </label>
  );
}

export function SectionTitle({ children }: { children: ReactNode }): ReactNode {
  return (
    <h3 className="text-text/90 mt-2 mb-1 text-[11px] font-semibold tracking-wider uppercase">
      {children}
    </h3>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-accent' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled = false,
}: SliderProps): ReactNode {
  return (
    <span className="flex w-full items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        className="w-full"
      />
      <span className="text-muted w-12 shrink-0 text-right text-xs tabular-nums">
        {format ? format(value) : value}
      </span>
    </span>
  );
}

interface SelectProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: SelectProps<T>): ReactNode {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value as T);
      }}
      className="bg-panel-2 border-border text-text h-8 w-full rounded-md border px-2 text-sm disabled:opacity-40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface NumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = '',
}: NumberInputProps): ReactNode {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) {
          onChange(n);
        }
      }}
      className={`bg-panel-2 border-border text-text h-8 rounded-md border px-2 text-sm tabular-nums ${className}`}
    />
  );
}

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ value, onChange }: ColorInputProps): ReactNode {
  return (
    <span className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      <span className="text-muted text-xs tabular-nums">{value}</span>
    </span>
  );
}
