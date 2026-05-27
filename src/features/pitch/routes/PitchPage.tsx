import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorState } from '@/components/error-state/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useUser } from '@/auth/use-auth';
import { useStartupProfile } from '@/features/pitch/hooks/use-startup-profile';
import { StartupProfileForm } from '@/features/pitch/components/StartupProfileForm';
import { DeckUploadPanel } from '@/features/pitch/components/DeckUploadPanel';
import { AIEvaluationCard } from '@/features/pitch/components/AIEvaluationCard';
import { formatCrore, stageLabel } from '@/features/pitch/lib/stage-label';
import type { AIEvaluationResult, StartupProfileResponse } from '@/features/pitch/schemas';
import { PageHeader } from '@/components/layout/PageHeader';

const TABS = ['profile', 'deck', 'evaluation'] as const;
type Tab = (typeof TABS)[number];

function isTab(v: string | null): v is Tab {
  return !!v && (TABS as readonly string[]).includes(v);
}

// PRD §7.3 — tabbed pitch page.
//   • Profile (always)        — useStartupProfile, 404 → empty form, else prefilled.
//   • Deck (if profile exists)— ExecutionPanel<jobPoll> wrapping POST /pitch/deck.
//   • AI Evaluation (after success) — separate tab so users can revisit the
//     last eval block without re-submitting.
export function PitchPage() {
  const user = useUser();
  const profile = useStartupProfile();
  const [params, setParams] = useSearchParams();
  const queryTab = params.get('tab');
  const [latestEval, setLatestEval] = useState<AIEvaluationResult | null>(null);

  // If the URL points at "evaluation" but we don't have one yet, fall back
  // to "profile" rather than rendering an empty tab body.
  const requestedTab: Tab = isTab(queryTab) ? queryTab : 'profile';
  const activeTab: Tab = requestedTab === 'evaluation' && !latestEval ? 'profile' : requestedTab;

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  const profilePresent = profile.data?.status === 'present' ? profile.data.data : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My pitch"
        subtitle="Manage your startup profile and submit your deck for an AI evaluation."
      />

      <div role="tablist" aria-label="Pitch sections" className="flex gap-1 border-b border-border">
        <TabButton tab="profile" active={activeTab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </TabButton>
        {profilePresent ? (
          <TabButton tab="deck" active={activeTab === 'deck'} onClick={() => setTab('deck')}>
            Deck
          </TabButton>
        ) : null}
        {latestEval ? (
          <TabButton
            tab="evaluation"
            active={activeTab === 'evaluation'}
            onClick={() => setTab('evaluation')}
          >
            AI Evaluation
          </TabButton>
        ) : null}
      </div>

      {profile.isLoading ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <ErrorState
          error={profile.error}
          onRetry={() => {
            void profile.refetch();
          }}
        />
      ) : (
        <>
          {activeTab === 'profile' ? (
            <StartupProfileForm initial={profilePresent ?? undefined} />
          ) : null}

          {activeTab === 'deck' && profilePresent ? (
            <div className="flex flex-col gap-4">
              <CurrentDeckSummary profile={profilePresent} />
              <DeckUploadPanel userId={user?.id ?? null} onEvaluation={setLatestEval} />
            </div>
          ) : null}

          {activeTab === 'evaluation' && latestEval ? (
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="mb-4 text-sm text-ink-muted">
                Latest AI evaluation. Submit a new deck on the Deck tab to refresh it.
              </p>
              <AIEvaluationCard result={latestEval} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  children,
}: {
  tab: Tab;
  active: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={`pitch-tab-${tab}`}
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-ink-muted hover:text-ink-heading',
      )}
    >
      {children}
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="pitch-loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function CurrentDeckSummary({ profile }: { profile: StartupProfileResponse }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-body">
        <span>
          <span className="text-ink-muted">Stage:</span>{' '}
          <span className="font-medium text-ink-heading">{stageLabel(profile.stage)}</span>
        </span>
        <span>
          <span className="text-ink-muted">Ask:</span>{' '}
          <span className="font-medium text-ink-heading">{formatCrore(profile.ask_amount_cr)}</span>
        </span>
        {profile.deck_url ? (
          <span className="flex items-center gap-1.5">
            <span className="text-ink-muted">Current deck:</span>
            <a
              href={profile.deck_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:underline"
            >
              View
            </a>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Loader2 className="h-3.5 w-3.5" aria-hidden />
            No deck submitted yet
          </span>
        )}
      </div>
    </div>
  );
}
