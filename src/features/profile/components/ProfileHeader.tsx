import { User } from 'lucide-react';
import { RoleBadge } from '@/components/role-badge';
import { LockedField } from '@/features/search/components/LockedField';
import type { ProfileView } from '@/features/profile/schemas';

interface Props {
  profile: ProfileView;
  isMasked: boolean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function ProfileHeader({ profile, isMasked }: Props) {
  const showOrg = !!profile.organisation;
  const showDesig = !!profile.designation;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div
        className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-surface-muted text-lg font-semibold text-ink-heading"
        aria-hidden
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : profile.name ? (
          initials(profile.name)
        ) : (
          <User className="h-7 w-7 text-ink-muted" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-semibold text-ink-heading">{profile.name}</h1>
          <RoleBadge role={profile.role} />
        </div>
        {showOrg ? (
          <p className="text-sm text-ink-body">{profile.organisation}</p>
        ) : isMasked ? (
          <LockedField className="max-w-[14rem]" lines={1} />
        ) : null}
        {showDesig ? (
          <p className="text-xs text-ink-muted">{profile.designation}</p>
        ) : isMasked ? (
          <LockedField className="max-w-[10rem]" lines={1} />
        ) : null}
      </div>
    </div>
  );
}
