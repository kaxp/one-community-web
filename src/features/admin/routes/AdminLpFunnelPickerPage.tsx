import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useSearch } from '@/features/search/hooks/use-search';
import type { LPResultItem, SearchResultItem } from '@/features/search/schemas';

function isLpItem(item: SearchResultItem, targetType: 'startup' | 'lp'): item is LPResultItem {
  return targetType === 'lp';
}

// PRD §7.12.5 picker — search-or-select an LP. Re-uses `useSearch` (POST
// /search) without a user_role filter (the backend doesn't expose one as a
// filter today; the LLM classifier produces target_type='lp' when the
// query reads as an LP discovery). The picker just keeps LP-typed results.
// Each row links to the detail route `/admin/lp-funnel/:user_id`.
export function AdminLpFunnelPickerPage() {
  const [draft, setDraft] = useState('');
  const [committed, setCommitted] = useState('');
  const [directId, setDirectId] = useState('');

  const search = useSearch({
    query: committed,
    filters: {},
    enabled: committed.trim().length > 0,
  });

  const lpResults = useMemo(() => {
    const pages = search.data?.pages ?? [];
    return pages.flatMap((p) =>
      p.target_type === 'lp'
        ? p.results.filter((r): r is LPResultItem => isLpItem(r, p.target_type))
        : [],
    );
  }, [search.data?.pages]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">LP funnel</h1>
        <p className="text-sm text-ink-muted">
          Pick an LP to update their funnel stage. Search by name or fund — only LP-typed results
          are shown.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            E.g. &quot;Warmup capital LPs interested in fintech&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(draft);
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="lp-funnel-search">Query</Label>
              <Input
                id="lp-funnel-search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-72"
                placeholder="LP name, fund, or thesis"
                data-testid="lp-funnel-search-input"
              />
            </div>
            <Button type="submit" disabled={draft.trim().length === 0}>
              <SearchIcon className="h-4 w-4" aria-hidden />
              <span>Search</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {committed.trim().length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>LP-typed search hits.</CardDescription>
          </CardHeader>
          <CardContent>
            {search.isLoading ? (
              <div className="flex flex-col gap-3" data-testid="lp-search-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : search.isError ? (
              <ErrorState
                error={search.error}
                onRetry={() => {
                  void search.refetch();
                }}
              />
            ) : lpResults.length === 0 ? (
              <EmptyState
                title="No LP results"
                description="Try a different query, or paste a user_id below for a direct lookup."
              />
            ) : (
              <ul className="flex flex-col gap-3" data-testid="lp-funnel-results">
                {lpResults.map((lp) => (
                  <li key={lp.user_id}>
                    <Card>
                      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-ink-heading">{lp.name}</span>
                          {lp.fund_name ? (
                            <Badge variant="secondary" className="self-start">
                              {lp.fund_name}
                            </Badge>
                          ) : null}
                          {lp.organisation ? (
                            <p className="text-xs text-ink-muted">{lp.organisation}</p>
                          ) : null}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to={`/admin/lp-funnel/${lp.user_id}`}
                            data-testid={`lp-funnel-pick-${lp.user_id}`}
                          >
                            Open funnel
                            <ArrowRight className="h-4 w-4" aria-hidden />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Or open by user id</CardTitle>
          <CardDescription>Paste an LP user_id to jump straight to their funnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="lp-funnel-direct">User ID</Label>
              <Input
                id="lp-funnel-direct"
                value={directId}
                onChange={(e) => setDirectId(e.target.value)}
                placeholder="00000000-0000-4000-8000-…"
                className="w-96 font-mono text-xs"
              />
            </div>
            <Button
              asChild
              disabled={directId.trim().length === 0}
              data-testid="lp-funnel-direct-go"
            >
              <Link to={`/admin/lp-funnel/${directId.trim()}`}>Open funnel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
