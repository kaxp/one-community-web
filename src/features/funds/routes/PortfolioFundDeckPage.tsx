import { useSearchParams } from 'react-router-dom';
import { FundOnePage } from './FundOnePage';
import { FundTwoPage } from './FundTwoPage';

type Section = 'fund-1' | 'fund-2' | 'deck';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'fund-1', label: 'Fund I' },
  { key: 'fund-2', label: 'Fund II' },
  { key: 'deck', label: 'Warmup Fund Deck' },
];

export function PortfolioFundDeckPage() {
  const [params, setParams] = useSearchParams();
  const active = (params.get('section') ?? 'fund-1') as Section;

  function select(key: Section) {
    setParams({ section: key }, { replace: true });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border px-1 pt-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-selected={active === s.key}
            onClick={() => select(s.key)}
            className={[
              'rounded-t-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              active === s.key
                ? 'border border-b-0 border-border bg-surface text-ink-heading'
                : 'text-ink-muted hover:text-ink-body',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-0">
        {active === 'fund-1' && <FundOnePage />}
        {active === 'fund-2' && (
          <div className="py-6">
            <FundTwoPage />
          </div>
        )}
        {active === 'deck' && (
          <div className="h-[calc(100vh-120px)] min-h-[600px] w-full">
            <iframe
              src="/warmup-lp-deck.pdf"
              title="Warmup Ventures LP Deck"
              className="h-full w-full border-0"
              aria-label="Warmup Ventures LP Deck PDF viewer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
