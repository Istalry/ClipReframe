import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-white',
  secondary: 'bg-panel-2 hover:bg-border text-text border border-border',
  ghost: 'bg-transparent hover:bg-panel-2 text-muted hover:text-text',
  danger: 'bg-transparent hover:bg-danger/15 text-danger',
};

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-5 text-sm font-semibold gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
