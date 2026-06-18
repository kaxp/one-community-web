import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiError } from '@/api/errors';
import { useAdminUserUpdate } from '@/features/admin/hooks/use-admin-user-update';
import { type AdminUserUpdateRequest, ADMIN_POC_OPTIONS } from '@/features/admin/schemas';
import type { UserRole } from '@/types/enums';

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

// Minimal shape the dialog needs. Both `AdminUserListItem` and `LpCrmDetail`
// satisfy this — keep it nullable-friendly so list shapes that don't carry
// phone/designation (e.g. `LpCrmListItem`) can be passed too.
export interface EditableUser {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  organisation?: string | null;
  designation?: string | null;
  poc?: string | null;
}

interface Props {
  user: EditableUser | null;
  onClose: () => void;
  // Caller-side hook for additional cache invalidation (e.g. LP funnel
  // queries). `useAdminUserUpdate` already invalidates the users list.
  onSaved?: () => void;
}

export function EditUserDialog({ user, onClose, onSaved }: Props) {
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
        poc: user.poc ?? '',
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
    if (form.poc !== undefined && form.poc !== (user.poc ?? '')) body.poc = form.poc || undefined;

    update.mutate(
      { userId: user.id, body },
      {
        onSuccess: () => {
          toast.success('User updated');
          onSaved?.();
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
            <div className="col-span-2 flex flex-col gap-1.5">
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
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input
                id="edit-designation"
                value={form.designation ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="edit-poc">POC (Point of Contact)</Label>
              <select
                id="edit-poc"
                value={form.poc ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, poc: e.target.value || undefined }))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-body focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">— None —</option>
                {ADMIN_POC_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
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
