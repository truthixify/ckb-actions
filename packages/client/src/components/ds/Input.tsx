import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full px-3 bg-[var(--color-bg-inset)] border text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors duration-[80ms]',
        'focus:outline-none focus:border-[var(--color-accent)]',
        invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border-strong)]',
        mono && 'font-mono text-[14px]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, helper, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={htmlFor} className="text-label text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-body-sm text-[var(--color-danger)]">{error}</p>
      ) : helper ? (
        <p className="text-body-sm text-[var(--color-text-muted)]">{helper}</p>
      ) : null}
    </div>
  );
}
