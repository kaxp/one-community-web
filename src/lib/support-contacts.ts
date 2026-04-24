// TODO(P-15): replace placeholder SUPPORT_EMAIL with real support address before go-live.
export const SUPPORT_EMAIL = 'support@warmupventures.com';

// TODO(P-15): replace placeholder SUPPORT_WHATSAPP with real WhatsApp number before go-live.
export const SUPPORT_WHATSAPP = '+91XXXXXXXXXX';

export function whatsappUrl(phoneE164: string = SUPPORT_WHATSAPP): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function mailtoUrl(email: string = SUPPORT_EMAIL): string {
  return `mailto:${email}`;
}
