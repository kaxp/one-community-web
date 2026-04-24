import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  length?: number;
  value: string;
  onChange(v: string): void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  id?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
  className,
  id,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const update = (i: number, v: string) => {
    const next = value.split('');
    while (next.length < length) next.push(' ');
    next[i] = v || ' ';
    const joined = next.join('').trimEnd();
    onChange(joined);
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    update(i, v);
    if (v && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]?.trim()) {
      if (i > 0) refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className={cn('flex items-center gap-2', className)} id={id}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[i]?.trim() ?? ''}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-12 w-11 rounded-md border border-border bg-surface text-center text-lg font-semibold text-ink-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
