import { Button } from '@/components/ui/button';
import type { SearchTargetType } from '@/features/search/schemas';

export type SearchTypeOption = SearchTargetType | 'all';

interface Props {
  value: SearchTypeOption;
  onChange: (v: SearchTypeOption) => void;
  // Default option is shown first; the other specific type follows; 'all' is last.
  defaultType: SearchTargetType;
}

const LABELS: Record<SearchTypeOption, string> = {
  startup: 'Startups',
  lp: 'LPs',
  all: 'All',
};

export function TypeSelector({ value, onChange, defaultType }: Props) {
  const otherType: SearchTargetType = defaultType === 'startup' ? 'lp' : 'startup';
  const options: SearchTypeOption[] = [defaultType, otherType, 'all'];

  return (
    <div className="flex gap-1.5" role="group" aria-label="Search type">
      {options.map((opt) => (
        <Button
          key={opt}
          size="sm"
          variant={value === opt ? 'default' : 'outline'}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
        >
          {LABELS[opt]}
        </Button>
      ))}
    </div>
  );
}
