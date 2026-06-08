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
import { useAdminFounderUpdate } from '@/features/admin/hooks/use-admin-founder-update';
import type { AdminFounderUpdateRequest, AdminFounderListItem } from '@/features/admin/schemas';

interface Props {
  founder: AdminFounderListItem | null;
  onClose: () => void;
}

export function EditFounderDialog({ founder, onClose }: Props) {
  const update = useAdminFounderUpdate();
  const [form, setForm] = useState<AdminFounderUpdateRequest>({});

  useEffect(() => {
    if (founder) {
      setForm({
        name: founder.name ?? '',
        position: founder.position ?? '',
        email: founder.email ?? '',
        phone: founder.phone ?? '',
        linkedin_url: founder.linkedin_url ?? '',
        description: founder.description ?? '',
      });
    }
  }, [founder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!founder) return;
    const body: AdminFounderUpdateRequest = {};
    if (form.name !== undefined && form.name !== (founder.name ?? ''))
      body.name = form.name || undefined;
    if (form.position !== undefined && form.position !== (founder.position ?? ''))
      body.position = form.position || undefined;
    if (form.email !== undefined && form.email !== (founder.email ?? ''))
      body.email = form.email || undefined;
    if (form.phone !== undefined && form.phone !== (founder.phone ?? ''))
      body.phone = form.phone || undefined;
    if (form.linkedin_url !== undefined && form.linkedin_url !== (founder.linkedin_url ?? ''))
      body.linkedin_url = form.linkedin_url || undefined;
    if (form.description !== undefined && form.description !== (founder.description ?? ''))
      body.description = form.description || undefined;

    update.mutate(
      { founderId: founder.id, body },
      {
        onSuccess: () => {
          toast.success('Founder updated');
          onClose();
        },
        onError: (err: ApiError) => {
          toast.error(err.userMessage ?? 'Failed to update founder');
        },
      },
    );
  };

  return (
    <Dialog open={!!founder} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit founder</DialogTitle>
          <DialogDescription>Update this founder&apos;s details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-name">Name</Label>
              <Input
                id="edit-founder-name"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-position">Position</Label>
              <Input
                id="edit-founder-position"
                value={form.position ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-email">Email</Label>
              <Input
                id="edit-founder-email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-phone">Phone</Label>
              <Input
                id="edit-founder-phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-linkedin">LinkedIn URL</Label>
              <Input
                id="edit-founder-linkedin"
                value={form.linkedin_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="edit-founder-description">Description</Label>
              <Input
                id="edit-founder-description"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
