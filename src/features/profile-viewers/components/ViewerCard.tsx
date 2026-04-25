import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import type { ProfileViewerItem } from '@/features/profile-viewers/schemas';

interface Props {
  item: ProfileViewerItem;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

// PRD §13 G11 — PII discipline. This component MUST destructure ONLY the
// allowed fields below. Even if the backend response schema later expands,
// `viewer.email` / `viewer.phone` MUST NEVER appear in this JSX. The Zod
// schema strips extra keys at parse time, and a regression test
// (`pii-discipline.test.ts`) grep-checks every file under this feature
// against `viewer.email` / `viewer.phone` reads. Do not add reads of those
// fields here, in subcomponents, or in hooks.
export function ViewerCard({ item }: Props) {
  const navigate = useNavigate();

  // Allowed-fields-only destructure. The lint regression watches for any
  // attempt to read fields outside this set.
  const { user_id, name, role, organisation, avatar_url } = item.viewer;
  const { viewed_at } = item;

  const onOpen = () => {
    navigate(`/profile/${user_id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  const relative = (() => {
    try {
      return formatDistanceToNow(parseISO(viewed_at), { addSuffix: true });
    } catch {
      return viewed_at;
    }
  })();

  const fullIso = (() => {
    try {
      return format(parseISO(viewed_at), 'PPpp');
    } catch {
      return viewed_at;
    }
  })();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="cursor-pointer transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      data-testid={`viewer-card-${user_id}`}
    >
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-surface-muted text-sm font-semibold text-ink-heading"
          aria-hidden
        >
          {avatar_url ? (
            <img src={avatar_url} alt="" className="h-full w-full object-cover" />
          ) : name ? (
            initials(name)
          ) : (
            <User className="h-5 w-5 text-ink-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-heading">{name}</h3>
            <RoleBadge role={role} />
          </div>
          {organisation ? <p className="truncate text-xs text-ink-muted">{organisation}</p> : null}
          <p className="text-xs text-ink-muted" title={fullIso}>
            Viewed {relative}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
