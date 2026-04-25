import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  isPending: boolean;
  disabled?: boolean;
  className?: string;
}

// PRD §7.4.1 — input gets debounced 400ms by the parent before firing the search
// query. The form-submit path is the user-explicit "Search now" button.
export function SearchBar({ value, onChange, onSubmit, isPending, disabled, className }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn('flex flex-col gap-2 md:flex-row md:items-center', className)}
      role="search"
    >
      <label htmlFor="search-query" className="sr-only">
        Search query
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <Input
          id="search-query"
          type="search"
          autoComplete="off"
          placeholder="Ask me about Warmup Ventures data"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pl-9"
        />
      </div>
      <Button type="submit" disabled={disabled || isPending || value.trim().length === 0}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Searching…</span>
          </>
        ) : (
          'Search'
        )}
      </Button>
    </form>
  );
}
