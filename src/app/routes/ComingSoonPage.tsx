import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
}

export function ComingSoonPage({
  title,
  description,
  backTo = '/dashboard',
  backLabel = 'Back to dashboard',
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" aria-hidden />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-body">
          WhatsApp channel activates in Phase 4 — this screen is view-only today.
        </p>
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
