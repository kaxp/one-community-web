import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { SearchBar } from '@/features/search/components/SearchBar';
import { ChatTurn } from '@/features/search/components/ChatTurn';
import { SearchLoadingState } from '@/features/search/components/SearchLoadingState';
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

  // Auto-scroll to the latest turn whenever a new one arrives.
  // JSDOM (used by Vitest) doesn't implement scrollIntoView, so guard it —
  // otherwise tests throw before assertions can run.
  useEffect(() => {
    const el = threadRef.current;
    if (el && conversation.turns.length > 0 && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversation.turns.length]);

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
      {conversation.error ? (
        <ErrorState error={conversation.error} compact onRetry={() => onSubmit()} />
      ) : null}
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

      {/* Thread */}
      <div className="flex flex-col gap-6" data-testid="chat-thread-turns">
        {conversation.turns.map((t) => (
          <ChatTurn
            key={t.id}
            userMessage={t.userMessage}
            response={t.response}
            isMasked={isMasked}
          />
        ))}
        {conversation.isPending ? (
          <div className="flex flex-col gap-3">
            {/* Show the pending user message above the spinner. We don't have
                it in `turns` yet (mutation hasn't resolved), so we read it
                from the SearchBar's last submitted text via the mutation
                meta — but for simplicity, just show a typing indicator. */}
            <SearchLoadingState />
          </div>
        ) : null}
        <div ref={threadRef} aria-hidden />
      </div>

      {/* Sticky bottom input — same anchor pattern as Phase 1 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:left-64 md:px-8 md:py-4">
        <div className="mx-auto max-w-4xl">{searchControls}</div>
      </div>
    </div>
  );
}
