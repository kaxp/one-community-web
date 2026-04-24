const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function isValidE164(input: string): boolean {
  return E164_REGEX.test(input);
}

export function toE164(input: string, defaultCountryCode = '91'): string {
  const trimmed = input.replace(/[\s-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return `+${defaultCountryCode}${digitsOnly}`;
}

export function formatE164(phone: string): string {
  if (!isValidE164(phone)) return phone;
  if (phone.startsWith('+91') && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}
