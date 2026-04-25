import { Mail, Phone, Linkedin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Contact } from '@/features/profile/schemas';

function formatPhone(e164: string): string {
  // PRD §8.12 row "phone on contact": group as "+91 98765-43210".
  const m = e164.match(/^(\+\d{1,3})(\d{5})(\d{5,})$/);
  if (!m) return e164;
  return `${m[1]} ${m[2]}-${m[3]}`;
}

interface Props {
  contact: Contact;
}

// Renders only when `contact !== null` per PRD §7.5.1 / §8.12.3.
// Conditional rendering is the caller's responsibility.
export function ContactCard({ contact }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-sm text-ink-heading hover:text-brand"
          >
            <Mail className="h-4 w-4 text-ink-muted" aria-hidden />
            <span>{contact.email}</span>
          </a>
        ) : null}
        {contact.phone ? (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-sm text-ink-heading hover:text-brand"
          >
            <Phone className="h-4 w-4 text-ink-muted" aria-hidden />
            <span>{formatPhone(contact.phone)}</span>
          </a>
        ) : null}
        {contact.linkedin_url ? (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-ink-heading hover:text-brand"
          >
            <Linkedin className="h-4 w-4 text-ink-muted" aria-hidden />
            <span>LinkedIn profile</span>
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
