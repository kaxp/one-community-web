// Pluggable error-reporter. Default is NoopReporter. Swap via the `setReporter` seam.
// TODO(P-12): wire SentryReporter (or Datadog / Rollbar) when an account is set up.

export interface ErrorReporter {
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  captureMessage(
    msg: string,
    level?: 'info' | 'warning' | 'error',
    ctx?: Record<string, unknown>,
  ): void;
}

class NoopReporter implements ErrorReporter {
  captureException(err: unknown, ctx?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[error-reporter] captureException', err, ctx);
    }
  }
  captureMessage(
    msg: string,
    level: 'info' | 'warning' | 'error' = 'info',
    ctx?: Record<string, unknown>,
  ): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[error-reporter] captureMessage', level, msg, ctx);
    }
  }
}

let reporter: ErrorReporter = new NoopReporter();

export function setReporter(r: ErrorReporter): void {
  reporter = r;
}

export function getReporter(): ErrorReporter {
  return reporter;
}
