import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAdminFounders } from '@/features/admin/hooks/use-admin-founders';
import { useAdminUserDelete } from '@/features/admin/hooks/use-admin-user-delete';
import { EditUserDialog } from '@/features/admin/components/EditUserDialog';
import { type AdminUserListItem, type AdminFounderListItem } from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { useRole } from '@/auth/use-auth';
import type { ApiError } from '@/api/errors';

const DEFAULT_LIMIT = 100;

// ── Tab definitions ───────────────────────────────────────────────────────────

type UserTab = 'lp' | 'potential_lp' | 'partner' | 'startup' | 'founder' | 'admin';

const USER_TABS: { key: UserTab; label: string; roles?: string }[] = [
  { key: 'lp', label: 'LP', roles: 'lp' },
  { key: 'potential_lp', label: 'Potential LP', roles: 'potential_lp' },
  { key: 'partner', label: 'Partner', roles: 'partner' },
  {
    key: 'startup',
    label: 'Startup',
    roles: 'startup_inprogress,startup_onboarded,startup_funded',
  },
  { key: 'founder', label: 'Founder' }, // data from founders table
  { key: 'admin', label: 'Admin', roles: 'admin,super_admin' },
];

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

// ── Users table (LP / Potential LP / Partner / Startup / Admin tabs) ──────────

function UsersTable({ roles, isSuperAdmin }: { roles: string; isSuperAdmin: boolean }) {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearchValue] = useState('');
  const [offset, setOffset] = useState(0);
  const [editTarget, setEditTarget] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchValue(val);
      setOffset(0);
    }, 300);
  };

  const list = useAdminUsers({
    ...(search ? { search } : {}),
    roles,
    limit: DEFAULT_LIMIT,
    offset,
  });
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const columns = useMemo<ColumnDef<AdminUserListItem>[]>(
    () => [
      {
        id: 'name',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</span>
        ),
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
          <span className="font-mono text-sm text-ink-body">{row.original.phone ?? '—'}</span>
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
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Role</span>
        ),
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
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Created
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.created_at)}</span>
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
    [isSuperAdmin, navigate],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          ref={searchInputRef}
          placeholder="Search name, phone, email…"
          onChange={handleSearchChange}
          className="w-64"
        />
        {total > 0 ? (
          <span className="ml-auto text-xs text-ink-muted">{total.toLocaleString()} users</span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
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
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
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
                      search ? 'Try a different search term.' : 'No users in this group.'
                    }
                  />
                }
              />
              {total > DEFAULT_LIMIT ? (
                <OffsetPaginator
                  limit={DEFAULT_LIMIT}
                  offset={offset}
                  itemCount={items.length}
                  onChange={({ offset: next }) => setOffset(next)}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteUserDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  );
}

// ── Founders table ────────────────────────────────────────────────────────────

function FoundersTable() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearchValue] = useState('');
  const [offset, setOffset] = useState(0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchValue(val);
      setOffset(0);
    }, 300);
  };

  const list = useAdminFounders({ ...(search ? { search } : {}), limit: DEFAULT_LIMIT, offset });
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const columns = useMemo<ColumnDef<AdminFounderListItem>[]>(
    () => [
      {
        id: 'name',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-ink-heading">{row.original.name ?? '—'}</span>
            {row.original.position ? (
              <span className="text-xs text-ink-muted">{row.original.position}</span>
            ) : null}
          </div>
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
        id: 'phone',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Phone
          </span>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-ink-body">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'linkedin',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            LinkedIn
          </span>
        ),
        cell: ({ row }) =>
          row.original.linkedin_url ? (
            <a
              href={row.original.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:underline"
            >
              View
            </a>
          ) : (
            <span className="text-sm text-ink-muted">—</span>
          ),
      },
      {
        id: 'created_at',
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Created
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.created_at)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          ref={searchInputRef}
          placeholder="Search name, email…"
          onChange={handleSearchChange}
          className="w-64"
        />
        {total > 0 ? (
          <span className="ml-auto text-xs text-ink-muted">{total.toLocaleString()} founders</span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription>
            {list.isLoading
              ? 'Loading…'
              : `${total.toLocaleString()} founder${total !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {list.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={items}
                getRowId={(row) => row.id}
                emptyState={
                  <EmptyState
                    title="No founders found"
                    description={
                      search ? 'Try a different search term.' : 'No founders in the database.'
                    }
                  />
                }
              />
              {total > DEFAULT_LIMIT ? (
                <OffsetPaginator
                  limit={DEFAULT_LIMIT}
                  offset={offset}
                  itemCount={items.length}
                  onChange={({ offset: next }) => setOffset(next)}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const role = useRole();
  const isSuperAdmin = role === 'super_admin';
  const [activeTab, setActiveTab] = useState<UserTab>('lp');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Users</h1>
        <p className="text-sm text-ink-muted">
          All platform members by role. Edit details or (super admin only) soft-delete.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserTab)}>
        <TabsList className="flex-wrap h-auto gap-1">
          {USER_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {USER_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {tab.key === 'founder' ? (
              <FoundersTable />
            ) : (
              <UsersTable roles={tab.roles ?? ''} isSuperAdmin={isSuperAdmin} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
