import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRole } from '@/auth/use-auth';
import { can } from '@/lib/role-capabilities';

interface Props {
  open: boolean;
  existingUserId: string | null;
  onClose(): void;
}

// PRD §7.2.1 UI flow #8 — 409 `duplicate_contact` modal. Admins get an
// "Open existing user" CTA that navigates to `/profile/{existing_user_id}`
// where they can update the record via the existing connection / profile
// flows. (PATCH /onboarding/profile per §7.2.3 only updates the caller's
// own profile; updating someone else's record is admin-DB territory until
// a dedicated endpoint ships — TODO when that lands.)
export function DuplicateContactDialog({ open, existingUserId, onClose }: Props) {
  const role = useRole();
  const navigate = useNavigate();
  const canManage = can(role, 'admin.any');

  const onOpenExisting = () => {
    if (!existingUserId) return;
    navigate(`/profile/${existingUserId}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Already in the community</DialogTitle>
          <DialogDescription>
            A contact with this phone or email already exists. Pick what you&apos;d like to do.
          </DialogDescription>
        </DialogHeader>
        {existingUserId ? (
          <p className="text-xs text-ink-muted">Existing user id: {existingUserId}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {canManage ? (
            <Button onClick={onOpenExisting} disabled={!existingUserId}>
              Open existing user
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
