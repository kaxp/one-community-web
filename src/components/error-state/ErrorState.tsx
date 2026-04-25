import { AlertTriangle, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface Surfaced {
  code: string;
  title: string;
  detail: string;
  Icon: LucideIcon;
  showContact: boolean;
}

function surface(error: unknown): Surfaced {
  const code =
    error instanceof ApiError
      ? error.code
      : error instanceof Error
        ? 'internal_error'
        : 'internal_error';
  const fallbackMessage =
    error instanceof ApiError
      ? error.userMessage
      : error instanceof Error
        ? error.message || USER_MESSAGES['internal_error']!
        : USER_MESSAGES['internal_error']!;

  if (code === 'network_error') {
    return {
      code,
      title: 'Cannot reach the server',
      detail:
        'Check your connection and try again. If this keeps happening, our service may be temporarily down.',
      Icon: WifiOff,
      showContact: true,
    };
  }
  if (code === 'rate_limit_exceeded') {
    return {
      code,
      title: 'Too many requests',
      detail: 'Please wait a moment before trying again.',
      Icon: AlertTriangle,
      showContact: false,
    };
  }
  if (code === 'internal_error') {
    return {
      code,
      title: 'Something went wrong on our end',
      detail: fallbackMessage,
      Icon: AlertTriangle,
      showContact: true,
    };
  }
  if (code === 'not_registered') {
    return {
      code,
      title: 'Number not registered',
      detail: fallbackMessage,
      Icon: AlertTriangle,
      showContact: true,
    };
  }
  // Generic/known ApiError codes (validation_error, otp_invalid, conflict, etc.)
  return {
    code,
    title: fallbackMessage,
    detail: '',
    Icon: AlertTriangle,
    showContact: false,
  };
}

export function ErrorState({ error, onRetry, onGoBack, className, compact = false }: Props) {
  const { code, title, detail, Icon, showContact } = surface(error);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-error/30 bg-error/5 text-center',
        compact ? 'p-4' : 'p-8',
        className,
      )}
    >
      <Icon className="h-7 w-7 text-error" aria-hidden />
      <div>
        <p className="font-semibold text-ink-heading">{title}</p>
        {detail ? <p className="mt-1 text-sm text-ink-body">{detail}</p> : null}
        <p className="mt-1 text-xs text-ink-muted">code: {code}</p>
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
