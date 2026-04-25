import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HomeCityPanel } from '@/features/travel/components/HomeCityPanel';
import { TripList } from '@/features/travel/components/TripList';
import { AddTripDialog } from '@/features/travel/components/AddTripDialog';

// PRD §7.11 — travel page. Two sections: home city (single input
// ExecutionPanel) + trips list with "Add trip" CTA. The "Show past trips"
// toggle flips the `active_only` URL param so the state survives refresh /
// share-link.
export function TravelPage() {
  const [params, setParams] = useSearchParams();
  const showPast = params.get('active_only') === 'false';
  const [adding, setAdding] = useState(false);

  const setShowPast = (next: boolean) => {
    const sp = new URLSearchParams(params);
    if (next) sp.set('active_only', 'false');
    else sp.delete('active_only');
    setParams(sp, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Travel</h1>
        <p className="text-sm text-ink-muted">
          Tell us where you&apos;re going so we can introduce you to the right people on each trip.
        </p>
      </header>

      <HomeCityPanel />

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Trips</CardTitle>
            <CardDescription>
              {showPast
                ? 'All your trips, including past and cancelled ones.'
                : 'Upcoming trips you have planned.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-body">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                data-testid="toggle-show-past"
              />
              Show past trips
            </label>
            <Button onClick={() => setAdding(true)} data-testid="add-trip">
              <Plus className="h-4 w-4" aria-hidden />
              <span>Add trip</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TripList activeOnly={!showPast} />
        </CardContent>
      </Card>

      <AddTripDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
