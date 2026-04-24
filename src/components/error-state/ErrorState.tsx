import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { USER_MESSAGES, ApiError } from '@/api/errors';
import { SUPPORT_EMAIL, mailtoUrl, whatsappUrl } from '@/lib/support-contacts';
import { cn } from '@/lib/cn';

interface Props {
  error: unknown;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
  compact?: boolean;
}

function extract(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.userMessage };
  }
  if (error instanceof Error) {
    return { code: 'internal_error', message: error.message || USER_MESSAGES['internal_error']! };
  }
  return { code: 'internal_error', message: USER_MESSAGES['internal_error']! };
}

export function ErrorState({ error, onRetry, onGoBack, className, compact = false }: Props) {
  const { code, message } = extract(error);
  const showContact =
    code === 'internal_error' || code === 'network_error' || code === 'not_registered';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-error/30 bg-error/5 p-6 text-center',
        compact ? 'p-4' : 'p-8',
        className,
      )}
    >
      <AlertTriangle className="h-6 w-6 text-error" aria-hidden />
      <div>
        <p className="font-semibold text-ink-heading">{message}</p>
        <p className="text-xs text-ink-muted">code: {code}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {onGoBack ? (
          <Button size="sm" variant="outline" onClick={onGoBack}>
            Go back
          </Button>
        ) : null}
        {showContact ? (
          <>
            <Button size="sm" variant="outline" asChild>
              <a href={mailtoUrl()}>Email {SUPPORT_EMAIL}</a>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
                WhatsApp us
              </a>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
