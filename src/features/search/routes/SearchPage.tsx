import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/features/search/components/SearchBar';
import { ChatTurn } from '@/features/search/components/ChatTurn';
import { TypeSelector, type SearchTypeOption } from '@/features/search/components/TypeSelector';
import { useConversation } from '@/features/search/hooks/use-conversation';
import { type SearchTargetType } from '@/features/search/schemas';
import type { UserRole } from '@/types/enums';
import { useRole } from '@/auth/use-auth';
import { isMaskedSearchRole, isStartupRole } from '@/lib/role-capabilities';

// Startup roles search for LPs (investors); everyone else searches for startups.
function defaultTargetType(role: UserRole | null): SearchTargetType {
  return isStartupRole(role) ? 'lp' : 'startup';
}

// URL param name for the selected type: ?t=startup | ?t=lp (nothing = "all")
const TYPE_PARAM = 't';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const role = useRole();
  const isMasked = isMaskedSearchRole(role);
  const defType = useMemo(() => defaultTargetType(role), [role]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchTypeOption>(
    (params.get(TYPE_PARAM) as SearchTypeOption | null) ?? defType,
  );
  // Target type passed to the API; null means "let GPT classify".
  const targetType: SearchTargetType | null = selectedType === 'all' ? null : selectedType;

  const conversation = useConversation({ targetType });
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest turn on every visible state change:
  //  - user just submitted (isPending flips true → show pending spinner at bottom)
  //  - assistant replied (turns.length grows → show the new turn at bottom)
  //
  // requestAnimationFrame defers the scroll one frame so the newly-rendered
  // turn / spinner is laid out before we measure — otherwise smooth-scroll
  // lands on the previous bottom and the user has to scroll manually.
  //
  // JSDOM (used by Vitest) doesn't implement scrollIntoView, so guard it —
  // otherwise tests throw before assertions can run.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [conversation.turns.length, conversation.isPending]);

  // Auto-submit a ?q= deep link as the first turn. Keep the param URL-only
  // for sharing; we don't echo it back on subsequent edits.
  const autoQ = params.get('q')?.trim() ?? '';
  const autoSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (autoQ && autoSubmittedRef.current !== autoQ && conversation.turns.length === 0) {
      autoSubmittedRef.current = autoQ;
      conversation.submit(autoQ);
    }
  }, [autoQ, conversation]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    conversation.submit(trimmed);
    setQuery('');
  };

  const onTypeChange = (t: SearchTypeOption) => {
    setSelectedType(t);
    const sp = new URLSearchParams(params);
    if (t !== defType) sp.set(TYPE_PARAM, t);
    else sp.delete(TYPE_PARAM);
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
  };

  const onNewChat = () => {
    conversation.reset();
    setQuery('');
    const sp = new URLSearchParams(params);
    sp.delete('q');
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
  };

  const hasThread = conversation.turns.length > 0 || conversation.isPending;

  const searchControls = (
    <div className="flex flex-col gap-3">
      <TypeSelector value={selectedType} onChange={onTypeChange} defaultType={defType} />
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={onSubmit}
        isPending={conversation.isPending}
      />
      {/* Errors are now displayed inline on the failing turn — no separate
          full-width error card. The ErrorState block that used to live here
          has been removed as part of the ChatGPT-style error UX update. */}
    </div>
  );

  // ── Pristine state: centred hero card ────────────────────────────────────
  if (!hasThread) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">Search</h1>
        <Card>
          <CardHeader>
            <CardTitle>Search the community</CardTitle>
            <CardDescription>
              Conversational search across LPs and startups. Ask anything — follow up to refine.
            </CardDescription>
          </CardHeader>
          <CardContent>{searchControls}</CardContent>
        </Card>
      </div>
    );
  }

  // ── Thread state: chat transcript + sticky bottom input ──────────────────
  return (
    <div className="flex flex-col gap-5 pb-36" data-testid="search-thread">
      <h1 className="sr-only">Search</h1>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {conversation.turns.length} {conversation.turns.length === 1 ? 'turn' : 'turns'} in this
          conversation
        </p>
        <Button variant="outline" size="sm" onClick={onNewChat} data-testid="new-chat-button">
          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
          New chat
        </Button>
      </div>

      {/* Thread — each ChatTurn handles its own loading state.
          A pending turn (response === null) shows the user bubble immediately
          plus a SearchLoadingState skeleton below it. No separate outer
          isPending block is needed; it was removed in Phase H.1. */}
      <div className="flex flex-col gap-6" data-testid="chat-thread-turns">
        {conversation.turns.map((t) => (
          <ChatTurn
            key={t.id}
            userMessage={t.userMessage}
            response={t.response}
            isError={t.isError === true}
            isMasked={isMasked}
            onRetry={t.isError ? () => conversation.retry(t.id) : undefined}
          />
        ))}
        <div ref={threadRef} aria-hidden />
      </div>

      {/* Sticky bottom input — same anchor pattern as Phase 1 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:left-64 md:px-8 md:py-4">
        <div className="mx-auto max-w-4xl">{searchControls}</div>
      </div>
    </div>
  );
}
