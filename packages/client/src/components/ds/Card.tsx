import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'surface' | 'review' | 'inset';
type Padding = 'default' | 'primary' | 'none';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
}

const variantStyles: Record<Variant, string> = {
  surface: 'bg-[var(--color-bg-surface)] border-[var(--color-border-hairline)]',
  review: 'bg-[var(--color-bg-surface)] border-[var(--color-border-strong)]',
  inset: 'bg-[var(--color-bg-inset)] border-[var(--color-border-hairline)]',
};

const paddingStyles: Record<Padding, string> = {
  default: 'p-6',
  primary: 'p-8',
  none: '',
};

export function Card({ variant = 'surface', padding = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn('border', variantStyles[variant], paddingStyles[padding], className)}
      {...props}
    />
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-[var(--color-border-hairline)]', className)} />;
}
