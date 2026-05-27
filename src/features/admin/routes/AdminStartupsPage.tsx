import { useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { useAdminStartups } from '@/features/admin/hooks/use-admin-startups';
import {
  STARTUP_SORT_OPTIONS,
  type AdminStartupListItem,
  type StartupSortOption,
} from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

const DEFAULT_LIMIT = 100;

const SORT_LABEL: Record<StartupSortOption, string> = {
  created_at: 'Created',
  company_name: 'Name',
  stage: 'Stage',
  status: 'Status',
};

const STAGE_LABEL: Record<string, string> = {
  ideation: 'Ideation',
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  pre_series_a: 'Pre-Series A',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
  late_growth: 'Late Growth',
};

function stageBadgeVariant(stage: string | null) {
  if (!stage) return 'secondary';
  if (['series_a', 'series_b', 'series_c', 'growth', 'late_growth'].includes(stage))
    return 'default';
  if (stage === 'seed' || stage === 'pre_seed') return 'secondary';
  return 'outline';
}

export function AdminStartupsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const sortBy = (params.get('sort_by') ?? 'created_at') as StartupSortOption;
  const sortDir = (params.get('sort_dir') ?? 'desc') as 'asc' | 'desc';
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = new URLSearchParams(params);
      if (val) sp.set('search', val);
      else sp.delete('search');
      sp.delete('offset');
      setParams(sp, { replace: true });
    }, 300);
  };

  const setSort = (by: StartupSortOption) => {
    const sp = new URLSearchParams(params);
    if (sortBy === by) {
      sp.set('sort_dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      sp.set('sort_by', by);
      sp.set('sort_dir', 'asc');
    }
    sp.delete('offset');
    setParams(sp, { replace: true });
  };

  const setPagination = ({ offset: nextOffset }: { limit: number; offset: number }) => {
    const sp = new URLSearchParams(params);
    if (nextOffset === 0) sp.delete('offset');
    else sp.set('offset', String(nextOffset));
    setParams(sp, { replace: true });
  };

  const queryArgs = {
    ...(search ? { search } : {}),
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: DEFAULT_LIMIT,
    offset,
  };

  const list = useAdminStartups(queryArgs);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const SortHeader = ({ col, label }: { col: StartupSortOption; label: string }) => (
    <button
      type="button"
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink-heading"
      onClick={() => setSort(col)}
    >
      {label}
      <ArrowUpDown
        className={cn('h-3 w-3', sortBy === col ? 'text-brand' : 'opacity-40')}
        aria-hidden
      />
    </button>
  );

  const columns = useMemo<ColumnDef<AdminStartupListItem>[]>(
    () => [
      {
        id: 'company_name',
        header: () => <SortHeader col="company_name" label="Company" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-ink-heading">{row.original.company_name}</span>
            {row.original.founder_name ? (
              <span className="text-xs text-ink-muted">{row.original.founder_name}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'sector',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Sector
          </span>
        ),
        cell: ({ row }) => {
          const sectors = row.original.sector;
          if (!sectors.length) return <span className="text-sm text-ink-muted">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {sectors.slice(0, 2).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
              {sectors.length > 2 ? (
                <span className="text-xs text-ink-muted">+{sectors.length - 2}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'stage',
        header: () => <SortHeader col="stage" label="Stage" />,
        cell: ({ row }) => {
          const s = row.original.stage;
          if (!s) return <span className="text-sm text-ink-muted">—</span>;
          return (
            <Badge variant={stageBadgeVariant(s)} className="text-xs">
              {STAGE_LABEL[s] ?? s}
            </Badge>
          );
        },
      },
      {
        id: 'status',
        header: () => <SortHeader col="status" label="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          if (!s) return <span className="text-sm text-ink-muted">—</span>;
          return (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-body">
              {s.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        id: 'website',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Website
          </span>
        ),
        cell: ({ row }) => {
          const url = row.original.website_url;
          if (!url) return <span className="text-sm text-ink-muted">—</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand hover:underline"
            >
              {url.replace(/^https?:\/\//, '').split('/')[0]}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          );
        },
      },
      {
        id: 'created_at',
        header: () => <SortHeader col="created_at" label="Created" />,
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.created_at)}</span>
        ),
      },
      {
        id: 'profile',
        header: () => null,
        cell: ({ row }) => {
          const targetId = row.original.user_id ?? row.original.id;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-brand"
              onClick={() => navigate(`/search/profile/${targetId}`)}
              title="View startup profile"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Profile
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortDir, navigate],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Startups" subtitle="All startups in the database — read-only view." />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, founder, status…"
          defaultValue={search}
          onChange={handleSearchChange}
          className="w-64"
        />
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          Sort by:
          {STARTUP_SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSort(opt)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                sortBy === opt
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-muted hover:text-ink-body',
              )}
            >
              {SORT_LABEL[opt]}
              {sortBy === opt ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>
        {total > 0 ? (
          <span className="ml-auto text-xs text-ink-muted">{total.toLocaleString()} startups</span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Startups</CardTitle>
          <CardDescription>
            {list.isLoading
              ? 'Loading…'
              : `${total.toLocaleString()} startup${total !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {list.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="startups-loading">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={items}
                getRowId={(row) => row.id}
                emptyState={
                  <EmptyState
                    title="No startups found"
                    description={
                      search ? 'Try a different search term.' : 'No startups in the database yet.'
                    }
                  />
                }
              />
              {total > DEFAULT_LIMIT ? (
                <OffsetPaginator
                  limit={DEFAULT_LIMIT}
                  offset={offset}
                  itemCount={items.length}
                  onChange={setPagination}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
