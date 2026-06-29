import { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, ArrowUpDown, ChevronDown, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { StartupStageBadge, STAGE_FILTER_OPTIONS } from '@/components/badges/StartupStageBadge';
import { StartupStatusBadge } from '@/components/badges/StartupStatusBadge';
import { SectorBadgeList } from '@/components/badges/SectorBadge';
import { useAdminStartups } from '@/features/admin/hooks/use-admin-startups';
import {
  STARTUP_SORT_OPTIONS,
  STARTUP_STATUS_FILTER_OPTIONS,
  type AdminStartupListItem,
  type StartupSortOption,
} from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

const DEFAULT_LIMIT = 100;

const SORT_LABEL: Record<StartupSortOption, string> = {
  updated_at: 'Last Updated',
  created_at: 'Created',
  company_name: 'Name',
};

// ── Local multi-select filter dropdown ───────────────────────────────────────

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          selected.length > 0
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-border bg-surface text-ink-muted hover:text-ink-body',
        )}
      >
        {label}
        {selected.length > 0 ? (
          <span className="ml-0.5 rounded-full bg-brand px-1.5 py-0 text-[10px] text-white">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border bg-white shadow-md">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {label}
            </span>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-0.5 text-[10px] text-ink-muted hover:text-destructive"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            ) : null}
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggle(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50',
                    active ? 'font-medium text-brand' : 'text-ink-body',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                      active ? 'border-brand bg-brand' : 'border-border',
                    )}
                  >
                    {active ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminStartupsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const sortBy = (params.get('sort_by') ?? 'updated_at') as StartupSortOption;
  const sortDir = (params.get('sort_dir') ?? 'desc') as 'asc' | 'desc';
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0);

  // Multi-select filters — comma-separated in URL
  const selectedStages = params.get('stage') ? params.get('stage')!.split(',').filter(Boolean) : [];
  const selectedStatuses = params.get('status')
    ? params.get('status')!.split(',').filter(Boolean)
    : [];

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

  const toggleStage = (value: string) => {
    const sp = new URLSearchParams(params);
    const next = selectedStages.includes(value)
      ? selectedStages.filter((v) => v !== value)
      : [...selectedStages, value];
    if (next.length) sp.set('stage', next.join(','));
    else sp.delete('stage');
    sp.delete('offset');
    setParams(sp, { replace: true });
  };

  const toggleStatus = (value: string) => {
    const sp = new URLSearchParams(params);
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((v) => v !== value)
      : [...selectedStatuses, value];
    if (next.length) sp.set('status', next.join(','));
    else sp.delete('status');
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
    ...(selectedStages.length ? { stage: selectedStages.join(',') } : {}),
    ...(selectedStatuses.length ? { status: selectedStatuses.join(',') } : {}),
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
        cell: ({ row }) => <SectorBadgeList sectors={row.original.sector} />,
      },
      {
        id: 'stage',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Stage
          </span>
        ),
        cell: ({ row }) => <StartupStageBadge stage={row.original.stage} />,
      },
      {
        id: 'status',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Status
          </span>
        ),
        cell: ({ row }) => <StartupStatusBadge status={row.original.status} />,
      },
      {
        id: 'deal_manager',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Deal Manager
          </span>
        ),
        cell: ({ row }) => {
          const dm = row.original.deal_manager;
          return dm ? (
            <span className="text-sm text-ink-body">{dm}</span>
          ) : (
            <span className="text-sm text-ink-muted">—</span>
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
        id: 'updated_at',
        header: () => <SortHeader col="updated_at" label="Last Updated" />,
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">
            {row.original.updated_at ? fmtDateTime(row.original.updated_at) : '—'}
          </span>
        ),
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

  const hasActiveFilters = selectedStages.length > 0 || selectedStatuses.length > 0;

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

        {/* Sort controls */}
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          Sort:
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

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Stage"
            options={STAGE_FILTER_OPTIONS}
            selected={selectedStages}
            onToggle={toggleStage}
            onClear={() => {
              const sp = new URLSearchParams(params);
              sp.delete('stage');
              sp.delete('offset');
              setParams(sp, { replace: true });
            }}
          />
          <FilterDropdown
            label="Status"
            options={STARTUP_STATUS_FILTER_OPTIONS as unknown as { value: string; label: string }[]}
            selected={selectedStatuses}
            onToggle={toggleStatus}
            onClear={() => {
              const sp = new URLSearchParams(params);
              sp.delete('status');
              sp.delete('offset');
              setParams(sp, { replace: true });
            }}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                const sp = new URLSearchParams(params);
                sp.delete('stage');
                sp.delete('status');
                sp.delete('offset');
                setParams(sp, { replace: true });
              }}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-destructive"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          ) : null}
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
                      search || hasActiveFilters
                        ? 'Try adjusting your search or filters.'
                        : 'No startups in the database yet.'
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
