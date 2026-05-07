import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Embedding your query…',
  'Scanning the community…',
  'Running semantic search…',
  'Finding relevant profiles…',
  'Applying AI re-ranking…',
  'Filtering the best matches…',
  'Personalising for your profile…',
  'Finalising top picks…',
  'Almost there…',
] as const;

const INTERVAL_MS = 2600;
const FADE_MS = 280;

/**
 * Animated loading state for searches that take 20-30 s.
 * Cycles through stage-aware messages with a fade transition so the wait
 * feels purposeful rather than frozen.
 */
export function SearchLoadingState() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      // Fade out
      setPhase('out');
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        // Fade in
        setPhase('in');
      }, FADE_MS);
    };

    const interval = setInterval(cycle, INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const opacity = phase === 'in' ? 1 : 0;
  const translateY = phase === 'in' ? '0px' : '-6px';

  return (
    <div
      className="flex flex-col items-center gap-6 py-20"
      data-testid="search-loading"
      aria-live="polite"
      aria-label="Searching…"
    >
      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-2 w-2 rounded-full bg-brand"
            style={{
              animation: `searchDotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Rotating message */}
      <p
        className="text-sm font-medium text-ink-muted"
        style={{
          opacity,
          transform: `translateY(${translateY})`,
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
          minHeight: '1.25rem',
        }}
      >
        {MESSAGES[index]}
      </p>

      <style>{`
        @keyframes searchDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
