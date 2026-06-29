import { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, Check, X, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BlurredText } from '@/components/ui/blurred-text';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { StartupStageBadge, STAGE_FILTER_OPTIONS } from '@/components/badges/StartupStageBadge';
import { InvestorStartupStatusBadge } from '@/components/badges/StartupStatusBadge';
import { SectorBadgeList } from '@/components/badges/SectorBadge';
import { useInvestorStartups } from '@/features/admin/hooks/use-investor-startups';
import { useRequestInfo } from '@/features/admin/hooks/use-info-requests';
import {
  INVESTOR_STARTUP_SORT_OPTIONS,
  type InvestorStartupListItem,
  type InvestorSortOption,
} from '@/features/admin/schemas';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

const DEFAULT_LIMIT = 100;
const SCROLL_KEY = 'investor-startups-scroll';

const SORT_LABEL: Record<InvestorSortOption, string> = {
  created_at: 'Created',
  updated_at: 'Updated',
};

const SECTOR_FILTER_OPTIONS = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'saas', label: 'SaaS' },
  { value: 'd2c', label: 'D2C' },
  { value: 'deeptech', label: 'Deep Tech' },
  { value: 'agritech', label: 'Agritech' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'proptech', label: 'Proptech' },
  { value: 'foodtech', label: 'Foodtech' },
  { value: 'cleantech', label: 'Cleantech' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'media', label: 'Media' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'marketplace', label: 'Marketplace' },
];

// ── FilterDropdown ────────────────────────────────────────────────────────────

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

// ── Request Info Dialog ───────────────────────────────────────────────────────

function RequestInfoDialog({
  startupId,
  open,
  onOpenChange,
  onSuccess,
}: {
  startupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState('');
  const requestInfo = useRequestInfo();

  const handleSubmit = () => {
    requestInfo.mutate(
      { startup_id: startupId, ...(message ? { message } : {}) },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
          setMessage('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Company Info</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-ink-muted">
            Your request will be reviewed by the Warmup Ventures team. Once approved, you&apos;ll
            receive the full company profile via WhatsApp.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-heading">
              Note <span className="font-normal text-ink-muted">(optional, max 200 chars)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
              placeholder="Why are you interested in this company?"
            />
            <span className="self-end text-[10px] text-ink-muted">{message.length}/200</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={requestInfo.isPending}>
            {requestInfo.isPending ? 'Requesting…' : 'Request Info'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvestorStartupsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const sortBy = (params.get('sort_by') ?? 'created_at') as InvestorSortOption;
  const sortDir = (params.get('sort_dir') ?? 'desc') as 'asc' | 'desc';
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0);
  const selectedStages = params.get('stage') ? params.get('stage')!.split(',').filter(Boolean) : [];
  const selectedSectors = params.get('sector')
    ? params.get('sector')!.split(',').filter(Boolean)
    : [];

  const hasActiveFilters =
    selectedStages.length > 0 ||
    selectedSectors.length > 0 ||
    sortBy !== 'created_at' ||
    sortDir !== 'desc';

  const [requestInfoTarget, setRequestInfoTarget] = useState<string | null>(null);

  // Capture the saved scroll value at mount time so it survives re-renders.
  const savedScrollRef = useRef<string | null>(sessionStorage.getItem(SCROLL_KEY));

  const setSort = (by: InvestorSortOption) => {
    const sp = new URLSearchParams(params);
    if (sortBy === by) {
      sp.set('sort_dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      sp.set('sort_by', by);
      sp.set('sort_dir', 'desc');
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

  const toggleSector = (value: string) => {
    const sp = new URLSearchParams(params);
    const next = selectedSectors.includes(value)
      ? selectedSectors.filter((v) => v !== value)
      : [...selectedSectors, value];
    if (next.length) sp.set('sector', next.join(','));
    else sp.delete('sector');
    sp.delete('offset');
    setParams(sp, { replace: true });
  };

  const clearAll = () => {
    const sp = new URLSearchParams(params);
    sp.delete('stage');
    sp.delete('sector');
    sp.delete('sort_by');
    sp.delete('sort_dir');
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
    sort_by: sortBy,
    sort_dir: sortDir,
    ...(selectedStages.length ? { stage: selectedStages.join(',') } : {}),
    ...(selectedSectors.length ? { sector: selectedSectors.join(',') } : {}),
    limit: DEFAULT_LIMIT,
    offset,
  };

  const list = useInvestorStartups(queryArgs);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  // Restore scroll after data loads — firing on mount is a no-op because
  // the list hasn't rendered yet and the page height is too small to scroll.
  useEffect(() => {
    if (!list.isLoading && savedScrollRef.current) {
      const y = Number.parseInt(savedScrollRef.current, 10);
      savedScrollRef.current = null;
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [list.isLoading]);

  const handleRowClick = (row: InvestorStartupListItem) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    const targetId = row.user_id ?? row.id;
    navigate(`/search/profile/${targetId}`, {
      state: { targetType: 'startup', from: 'investor_startups' },
    });
  };

  const columns = useMemo<ColumnDef<InvestorStartupListItem>[]>(
    () => [
      {
        id: 'company',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Company
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {row.original.identity_masked ? (
              <BlurredText />
            ) : (
              <span className="font-medium text-ink-heading">
                {row.original.company_name ?? '—'}
              </span>
            )}
            {!row.original.identity_masked && row.original.founder_name ? (
              <span className="text-xs text-ink-muted">{row.original.founder_name}</span>
            ) : null}
            {row.original.identity_masked && row.original.funding_target_cr ? (
              <span className="text-xs text-ink-muted">
                ₹{row.original.funding_target_cr}Cr target
              </span>
            ) : null}
            {row.original.is_portfolio ? (
              <Badge variant="success" className="mt-0.5 w-fit text-[10px]">
                Portfolio
              </Badge>
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
        cell: ({ row }) => <InvestorStartupStatusBadge statusLabel={row.original.status_label} />,
      },
      {
        id: 'action',
        header: () => null,
        cell: ({ row }) => {
          const { info_request_status, identity_masked, id: startupId } = row.original;

          if (!identity_masked) return null;

          if (info_request_status === 'pending') {
            return (
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Clock className="h-3 w-3" />
                Pending
              </div>
            );
          }

          if (!info_request_status) {
            return (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setRequestInfoTarget(startupId);
                }}
              >
                <Info className="mr-1 h-3 w-3" />
                Request Info
              </Button>
            );
          }

          return null;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortDir],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Startups"
        subtitle="Portfolio and pipeline companies from Warmup Ventures."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          Sort:
          {INVESTOR_STARTUP_SORT_OPTIONS.map((opt) => (
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

        {/* Filters */}
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Sector"
            options={SECTOR_FILTER_OPTIONS}
            selected={selectedSectors}
            onToggle={toggleSector}
            onClear={() => {
              const sp = new URLSearchParams(params);
              sp.delete('sector');
              sp.delete('offset');
              setParams(sp, { replace: true });
            }}
          />
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
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-destructive"
            >
              <X className="h-3 w-3" /> Reset
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
                onRowClick={handleRowClick}
                emptyState={
                  <EmptyState
                    title="No startups found"
                    description={
                      selectedStages.length || selectedSectors.length
                        ? 'Try adjusting your filters.'
                        : 'No startups are available yet.'
                    }
                  />
                }
              />
              {total > DEFAULT_LIMIT ? (
                <div className="mt-4">
                  <OffsetPaginator
                    itemCount={items.length}
                    total={total}
                    limit={DEFAULT_LIMIT}
                    offset={offset}
                    onChange={setPagination}
                  />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <RequestInfoDialog
        startupId={requestInfoTarget ?? ''}
        open={!!requestInfoTarget}
        onOpenChange={(open) => {
          if (!open) setRequestInfoTarget(null);
        }}
        onSuccess={() => void list.refetch()}
      />
    </div>
  );
}
