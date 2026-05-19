import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Search as SearchIcon, ChevronUp, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useAdminLps } from '@/features/admin/hooks/use-admin-lps';
import { useAdminLpDetail } from '@/features/admin/hooks/use-admin-lp-detail';
import { useAdminLpNotes } from '@/features/admin/hooks/use-admin-lp-notes';
import { useAdminLpNoteCreate } from '@/features/admin/hooks/use-admin-lp-note-create';
import {
  LP_CRM_NOTE_LABELS,
  LP_CRM_NOTE_TYPES,
  type LpCrmListItem,
  type LpCrmNoteType,
  type LpCrmRoleFilter,
  type LpCrmSort,
} from '@/features/admin/schemas';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

function roleBadge(role: string) {
  if (role === 'lp')
    return (
      <Badge variant="success" className="whitespace-nowrap text-xs font-medium">
        LP
      </Badge>
    );
  return (
    <Badge variant="warning" className="whitespace-nowrap text-xs font-medium">
      Potential LP
    </Badge>
  );
}

function noteTypeBadge(type: LpCrmNoteType) {
  const classes: Record<LpCrmNoteType, string> = {
    meeting: 'bg-green-100 text-green-700',
    call: 'bg-blue-100 text-blue-700',
    follow_up: 'bg-purple-100 text-purple-700',
    deck_shared: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${classes[type]}`}>
      {LP_CRM_NOTE_LABELS[type]}
    </span>
  );
}

// ── LP Detail Drawer ──────────────────────────────────────────────────────────

function LpDetailDrawer({
  userId,
  open,
  onClose,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const detail = useAdminLpDetail(userId);
  const notes = useAdminLpNotes(userId);
  const createNote = useAdminLpNoteCreate();

  const today = new Date().toISOString().slice(0, 10);
  const [noteType, setNoteType] = useState<LpCrmNoteType>('meeting');
  const [noteDate, setNoteDate] = useState<string>(today);
  const [comment, setComment] = useState('');

  // Reset form when a different LP is opened
  useEffect(() => {
    setNoteType('meeting');
    setNoteDate(today);
    setComment('');
  }, [userId, today]);

  function handleSave() {
    if (!userId || !comment.trim()) return;
    createNote.mutate(
      { userId, body: { note_type: noteType, note_date: noteDate, comment: comment.trim() } },
      {
        onSuccess: () => {
          toast.success('Interaction saved');
          setComment('');
          setNoteDate(today);
          setNoteType('meeting');
        },
        onError: (err) => {
          toast.error(err.message ?? 'Failed to save interaction');
        },
      },
    );
  }

  const lp = detail.data;
  const noteItems = notes.data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-2xl flex-col overflow-y-auto p-0">
        {/* Accessible title/description (sr-only acceptable here) */}
        <SheetTitle className="sr-only">LP detail</SheetTitle>
        <SheetDescription className="sr-only">
          LP relationship details and interaction log
        </SheetDescription>

        {detail.isLoading ? (
          <div className="space-y-4 p-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : detail.isError ? (
          <div className="p-8">
            <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
          </div>
        ) : !lp ? null : (
          <div className="flex flex-col gap-8 p-8">
            {/* ── Profile header ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-ink-heading">{lp.name ?? 'Unnamed'}</h2>
                  {roleBadge(lp.role)}
                </div>
                <div className="space-y-1 text-sm text-ink-muted">
                  {lp.organisation && <p>{lp.organisation}</p>}
                  {lp.fund_name && <p>{lp.fund_name}</p>}
                  {lp.email && <p>{lp.email}</p>}
                  {lp.linkedin_url && (
                    <p>
                      <a
                        href={lp.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand underline-offset-2 hover:underline"
                      >
                        LinkedIn
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Metadata cards ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetaCard label="POC" value={lp.poc ?? '—'} />
              <MetaCard label="First Meeting" value={fmtDate(lp.first_meeting_date)} />
              <MetaCard label="Last Meeting" value={fmtDate(lp.last_meeting_date)} />
            </div>

            {/* ── Add Interaction ── */}
            <div className="rounded-2xl border border-border bg-surface-secondary p-6">
              <h3 className="mb-1 text-lg font-semibold text-ink-heading">+ Add Interaction</h3>
              <p className="mb-5 text-sm text-ink-muted">
                Log a meeting, call, follow-up or deck shared.
              </p>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="note-date" className="mb-2 block text-sm font-medium">
                    Date
                  </Label>
                  <input
                    id="note-date"
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
                  />
                </div>
                <div>
                  <Label htmlFor="note-type" className="mb-2 block text-sm font-medium">
                    Type
                  </Label>
                  <select
                    id="note-type"
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as LpCrmNoteType)}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
                  >
                    {LP_CRM_NOTE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LP_CRM_NOTE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <Label htmlFor="note-comment" className="mb-2 block text-sm font-medium">
                  Comment
                </Label>
                <textarea
                  id="note-comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What happened in this interaction?"
                  className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-ink-body placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!comment.trim() || createNote.isPending}>
                  {createNote.isPending ? 'Saving…' : 'Save Interaction'}
                </Button>
              </div>
            </div>

            {/* ── Relationship Timeline ── */}
            <div>
              <h3 className="mb-1 text-xl font-bold text-ink-heading">Relationship Timeline</h3>
              <p className="mb-6 text-sm text-ink-muted">
                Historical activity and investor communication.
              </p>

              {notes.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : noteItems.length === 0 ? (
                <EmptyState
                  title="No interactions yet"
                  description="Use the form above to log the first interaction with this LP."
                />
              ) : (
                <ol className="space-y-6">
                  {noteItems.map((note) => (
                    <li key={note.id} className="relative pl-8">
                      {/* timeline dot */}
                      <span className="absolute left-0 top-1.5 h-5 w-5 rounded-full bg-ink-heading" />
                      {/* connecting line — last item has no line */}
                      <span className="absolute left-[9px] top-6 h-full w-0.5 bg-border last:hidden" />

                      <div className="rounded-2xl border border-border bg-surface-secondary p-5">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-ink-heading">
                              {fmtDate(note.note_date)}
                            </p>
                            {note.admin_name && (
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {note.admin_name} added a note
                              </p>
                            )}
                          </div>
                          {noteTypeBadge(note.note_type)}
                        </div>
                        <p className="leading-relaxed text-ink-body">{note.comment}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-base font-semibold text-ink-heading">{value}</p>
    </div>
  );
}

// ── LP List row ───────────────────────────────────────────────────────────────

function LpRow({
  lp,
  selected,
  onClick,
}: {
  lp: LpCrmListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-t border-border transition-colors hover:bg-surface-secondary ${
        selected ? 'bg-surface-secondary' : ''
      }`}
    >
      <td className="px-6 py-4">
        <p className="font-semibold text-ink-heading">{lp.name ?? '—'}</p>
        {lp.organisation && <p className="mt-0.5 text-xs text-ink-muted">{lp.organisation}</p>}
      </td>
      <td className="px-4 py-4">{roleBadge(lp.role)}</td>
      <td className="px-4 py-4 text-sm text-ink-body">{lp.poc ?? '—'}</td>
      <td className="px-4 py-4 text-sm text-ink-body">{fmtDate(lp.last_meeting_date)}</td>
      <td className="max-w-[200px] px-4 py-4">
        <p className="truncate text-sm text-ink-muted">{lp.last_comment ?? '—'}</p>
      </td>
      <td className="px-6 py-4 text-right">
        <Button size="sm" variant="outline" tabIndex={-1}>
          Open
        </Button>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminLpFunnelPickerPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<LpCrmRoleFilter | ''>('');
  const [pocFilter, setPocFilter] = useState('');
  const [sortBy, setSortBy] = useState<LpCrmSort>('last_activity');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const lpsArgs: Parameters<typeof useAdminLps>[0] = { sort_by: sortBy };
  if (roleFilter) lpsArgs.role = roleFilter;
  if (debouncedSearch) lpsArgs.search = debouncedSearch;
  const lps = useAdminLps(lpsArgs);

  const rawItems = lps.data?.items;
  // Derive unique POC options from the full (unfiltered-by-poc) list
  const pocOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const lp of rawItems ?? []) {
      if (lp.poc) seen.add(lp.poc);
    }
    return Array.from(seen).sort();
  }, [rawItems]);

  // Apply poc filter client-side — the list is always ≤200 rows
  const items = useMemo(() => {
    const all = rawItems ?? [];
    return pocFilter ? all.filter((lp) => lp.poc === pocFilter) : all;
  }, [rawItems, pocFilter]);
  const total = items.length;

  // Sort indicator helper
  function SortButton({ field, label }: { field: LpCrmSort; label: string }) {
    const active = sortBy === field;
    return (
      <button
        onClick={() => setSortBy(field)}
        className={`flex items-center gap-1 text-xs font-medium transition-colors ${
          active ? 'text-brand' : 'text-ink-muted hover:text-ink-body'
        }`}
      >
        {label}
        {active ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-40" />
        )}
      </button>
    );
  }

  function handleRowClick(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  // Derive selected item name for accessible drawer title
  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId), [items, selectedId]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-heading">LP Funnel</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage LP and Potential LP relationships, meetings and follow-ups.
          </p>
        </div>
      </header>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role filter tabs */}
        <div className="flex gap-2">
          {(
            [
              { value: '', label: 'All' },
              { value: 'lp', label: 'LP' },
              { value: 'potential_lp', label: 'Potential LP' },
            ] as { value: LpCrmRoleFilter | ''; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                roleFilter === value
                  ? 'bg-ink-heading text-surface'
                  : 'border border-border bg-surface text-ink-body hover:bg-surface-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* POC filter */}
        {pocOptions.length > 0 && (
          <select
            value={pocFilter}
            onChange={(e) => setPocFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink-body transition-colors hover:bg-surface-secondary focus:outline-none"
          >
            <option value="">All POCs</option>
            {pocOptions.map((poc) => (
              <option key={poc} value={poc}>
                {poc}
              </option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, organisation…"
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-body"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-ink-heading">Investor Relationships</h2>
            {!lps.isLoading && (
              <p className="mt-0.5 text-sm text-ink-muted">
                {total} LP{total !== 1 ? 's' : ''} &amp; Potential LP
                {total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-muted">Sort:</span>
            <SortButton field="last_activity" label="Last Activity" />
            <SortButton field="name" label="Name" />
          </div>
        </div>

        {lps.isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        ) : lps.isError ? (
          <div className="p-8">
            <ErrorState error={lps.error} onRetry={() => void lps.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No investors found"
              description={
                debouncedSearch || roleFilter
                  ? 'Try adjusting your search or filter.'
                  : 'No LP or Potential LP users exist yet.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">POC</th>
                  <th className="px-4 py-3 text-left">Last Meeting</th>
                  <th className="px-4 py-3 text-left">Last Comment</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((lp) => (
                  <LpRow
                    key={lp.id}
                    lp={lp}
                    selected={lp.id === selectedId}
                    onClick={() => handleRowClick(lp.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <LpDetailDrawer userId={selectedId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Accessible announcement of selected LP name */}
      {selectedItem && (
        <span className="sr-only" aria-live="polite">
          {selectedItem.name} detail panel open
        </span>
      )}
    </div>
  );
}
