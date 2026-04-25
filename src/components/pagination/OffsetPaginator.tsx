import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  limit: number;
  offset: number;
  itemCount: number;
  onChange(next: { limit: number; offset: number }): void;
}

// PRD §13 G10 + §7.12.9 — Offset-paginated UI for the DLQ list (the only
// endpoint that uses offset rather than cursor). Renders prev/next + a
// "Page N" caption. `itemCount` is the length of the current page; we infer
// `hasNext = itemCount === limit` (best signal we have without a server
// total). When the backend later returns a `total` field, we can flip this
// to exact paging.
export function OffsetPaginator({ limit, offset, itemCount, onChange }: Props) {
  const page = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = itemCount === limit;

  const goPrev = () => {
    onChange({ limit, offset: Math.max(0, offset - limit) });
  };
  const goNext = () => {
    onChange({ limit, offset: offset + limit });
  };

  return (
    <div
      className="flex items-center justify-between gap-3 pt-2"
      role="navigation"
      aria-label="Pagination"
      data-testid="offset-paginator"
    >
      <span className="text-xs text-ink-muted">
        Page {page} · showing {itemCount} of up to {limit} per page
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={goPrev}
          disabled={!hasPrev}
          data-testid="paginator-prev"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span>Previous</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={goNext}
          disabled={!hasNext}
          data-testid="paginator-next"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
