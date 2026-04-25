import { Mail, Phone, Linkedin } from 'lucide-react';
import type { CounterpartContact } from '@/features/connections/schemas';

interface Props {
  contact: CounterpartContact;
}

// Compact horizontal contact row rendered on accepted-connection cards.
// Caller MUST have already verified `contact !== null` — never render an
// empty placeholder (PRD §7.6.4 + the prompt's "render conditionally" rule).
export function ContactStrip({ contact }: Props) {
  const items: React.ReactNode[] = [];
  if (contact.email) {
    items.push(
      <a
        key="email"
        href={`mailto:${contact.email}`}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1 text-xs text-ink-heading hover:border-brand hover:text-brand"
      >
        <Mail className="h-3.5 w-3.5" aria-hidden />
        <span>{contact.email}</span>
      </a>,
    );
  }
  if (contact.phone) {
    items.push(
      <a
        key="phone"
        href={`tel:${contact.phone}`}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1 text-xs text-ink-heading hover:border-brand hover:text-brand"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden />
        <span>{contact.phone}</span>
      </a>,
    );
  }
  if (contact.linkedin_url) {
    items.push(
      <a
        key="linkedin"
        href={contact.linkedin_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1 text-xs text-ink-heading hover:border-brand hover:text-brand"
      >
        <Linkedin className="h-3.5 w-3.5" aria-hidden />
        <span>LinkedIn</span>
      </a>,
    );
  }
  if (items.length === 0) return null;
  return <div className="flex flex-wrap items-center gap-2">{items}</div>;
}
