import { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, Trash2, ExternalLink, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { RoleBadge } from '@/components/role-badge';
import { useAdminUsers } from '@/features/admin/hooks/use-admin-users';
import { useAdminUserUpdate } from '@/features/admin/hooks/use-admin-user-update';
import { useAdminUserDelete } from '@/features/admin/hooks/use-admin-user-delete';
import {
  USER_SORT_OPTIONS,
  type AdminUserListItem,
  type AdminUserUpdateRequest,
  type UserSortOption,
} from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { useRole } from '@/auth/use-auth';
import { cn } from '@/lib/cn';
import type { ApiError } from '@/api/errors';

const DEFAULT_LIMIT = 100;

const SORT_LABEL: Record<UserSortOption, string> = {
  created_at: 'Created',
  updated_at: 'Updated',
  name: 'Name',
  role: 'Role',
};

const USER_ROLE_OPTIONS = [
  'lp',
  'potential_lp',
  'vc',
  'startup_inprogress',
  'startup_onboarded',
  'startup_funded',
  'partner',
  'advisor',
  'admin',
  'super_admin',
] as const;

// ── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  user: AdminUserListItem | null;
  onClose: () => void;
}

function EditUserDialog({ user, onClose }: EditDialogProps) {
  const update = useAdminUserUpdate();
  const [form, setForm] = useState<AdminUserUpdateRequest>({});

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        email: user.email ?? '',
        role: user.role,
        organisation: user.organisation ?? '',
        designation: user.designation ?? '',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const body: AdminUserUpdateRequest = {};
    if (form.name !== undefined && form.name !== (user.name ?? ''))
      body.name = form.name || undefined;
    if (form.phone !== undefined && form.phone !== (user.phone ?? ''))
      body.phone = form.phone || undefined;
    if (form.email !== undefined && form.email !== (user.email ?? ''))
      body.email = form.email || undefined;
    if (form.role && form.role !== user.role) body.role = form.role;
    if (form.organisation !== undefined && form.organisation !== (user.organisation ?? ''))
      body.organisation = form.organisation || undefined;
    if (form.designation !== undefined && form.designation !== (user.designation ?? ''))
      body.designation = form.designation || undefined;

    update.mutate(
      { userId: user.id, body },
      {
        onSuccess: () => {
          toast.success('User updated');
          onClose();
        },
        onError: (err: ApiError) => {
          toast.error(err.userMessage ?? 'Failed to update user');
        },
      },
    );
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Changes are saved to the database and all admins are notified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                value={form.role ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as AdminUserUpdateRequest['role'],
                  }))
                }
                className="h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-ink-body focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {USER_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-org">Organisation</Label>
              <Input
                id="edit-org"
                value={form.organisation ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, organisation: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input
                id="edit-designation"
                value={form.designation ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  user: AdminUserListItem | null;
  onClose: () => void;
}

function DeleteUserDialog({ user, onClose }: DeleteDialogProps) {
  const del = useAdminUserDelete();

  const handleConfirm = () => {
    if (!user) return;
    del.mutate(user.id, {
      onSuccess: () => {
        toast.success(`User "${user.name ?? user.email ?? user.id}" deleted`);
        onClose();
      },
      onError: (err: ApiError) => {
        toast.error(err.userMessage ?? 'Failed to delete user');
      },
    });
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This will soft-delete <strong>{user?.name ?? user?.email ?? user?.id}</strong>. The
            record is retained for audit history. This action cannot be undone from the UI.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={del.isPending} onClick={handleConfirm}>
            {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const role = useRole();
  const isSuperAdmin = role === 'super_admin';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const sortBy = (params.get('sort_by') ?? 'created_at') as UserSortOption;
  const sortDir = (params.get('sort_dir') ?? 'desc') as 'asc' | 'desc';
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0);

  // Debounced search
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const setSort = (by: UserSortOption) => {
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

  const list = useAdminUsers(queryArgs);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const [editTarget, setEditTarget] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);

  const SortHeader = ({ col, label }: { col: UserSortOption; label: string }) => (
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

  const columns = useMemo<ColumnDef<AdminUserListItem>[]>(
    () => [
      {
        id: 'name',
        header: () => <SortHeader col="name" label="Name" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-ink-heading">{row.original.name ?? '—'}</span>
            {row.original.designation ? (
              <span className="text-xs text-ink-muted">{row.original.designation}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'phone',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Phone
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-mono text-ink-body">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'email',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Email
          </span>
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate text-sm text-ink-body">
            {row.original.email ?? '—'}
          </span>
        ),
      },
      {
        id: 'role',
        header: () => <SortHeader col="role" label="Role" />,
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
      {
        id: 'organisation',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Organisation
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">{row.original.organisation ?? '—'}</span>
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
        id: 'updated_at',
        header: () => <SortHeader col="updated_at" label="Updated" />,
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">
            {row.original.updated_at ? fmtDateTime(row.original.updated_at) : '—'}
          </span>
        ),
      },
      {
        id: 'profile',
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-brand"
            onClick={() => navigate(`/search/profile/${row.original.id}`)}
            title="View profile"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Profile
          </Button>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Edit user"
              onClick={() => setEditTarget(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
            {isSuperAdmin ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete user"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, sortBy, sortDir, navigate],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Users</h1>
        <p className="text-sm text-ink-muted">
          All platform members. Edit details or (super admin only) soft-delete.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          ref={searchInputRef}
          placeholder="Search name, phone, email…"
          defaultValue={search}
          onChange={handleSearchChange}
          className="w-64"
        />
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          Sort by:
          {USER_SORT_OPTIONS.map((opt) => (
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
          <span className="ml-auto text-xs text-ink-muted">{total.toLocaleString()} users</span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {list.isLoading
              ? 'Loading…'
              : `${total.toLocaleString()} user${total !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {list.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="users-loading">
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
                    title="No users found"
                    description={
                      search ? 'Try a different search term.' : 'No users in the database yet.'
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

      <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteUserDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
