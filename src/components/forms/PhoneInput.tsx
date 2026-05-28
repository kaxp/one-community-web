import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

// Common country codes — extend as needed
const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'IN' },
  { code: '+1', label: '🇺🇸 +1', country: 'US' },
  { code: '+44', label: '🇬🇧 +44', country: 'GB' },
  { code: '+971', label: '🇦🇪 +971', country: 'AE' },
  { code: '+65', label: '🇸🇬 +65', country: 'SG' },
  { code: '+49', label: '🇩🇪 +49', country: 'DE' },
  { code: '+33', label: '🇫🇷 +33', country: 'FR' },
  { code: '+81', label: '🇯🇵 +81', country: 'JP' },
  { code: '+86', label: '🇨🇳 +86', country: 'CN' },
  { code: '+61', label: '🇦🇺 +61', country: 'AU' },
  { code: '+55', label: '🇧🇷 +55', country: 'BR' },
  { code: '+7', label: '🇷🇺 +7', country: 'RU' },
  { code: '+82', label: '🇰🇷 +82', country: 'KR' },
  { code: '+966', label: '🇸🇦 +966', country: 'SA' },
  { code: '+60', label: '🇲🇾 +60', country: 'MY' },
  { code: '+62', label: '🇮🇩 +62', country: 'ID' },
  { code: '+27', label: '🇿🇦 +27', country: 'ZA' },
  { code: '+234', label: '🇳🇬 +234', country: 'NG' },
] as const;

// Detect likely country from browser timezone — no location permission needed.
// Falls back to '+91' (India — primary market for this app).
function detectCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return '+91';
    if (tz.startsWith('America/')) return '+1';
    if (tz.startsWith('Europe/London')) return '+44';
    if (tz.startsWith('Asia/Dubai')) return '+971';
    if (tz.startsWith('Asia/Singapore')) return '+65';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Vienna')) return '+49';
    if (tz.startsWith('Europe/Paris')) return '+33';
    if (tz.startsWith('Asia/Tokyo')) return '+81';
    if (tz.startsWith('Asia/Shanghai') || tz.startsWith('Asia/Hong_Kong')) return '+86';
    if (tz.startsWith('Australia/')) return '+61';
    if (tz.startsWith('America/Sao_Paulo') || tz.startsWith('America/Manaus')) return '+55';
    if (tz.startsWith('Asia/Seoul')) return '+82';
    if (tz.startsWith('Asia/Riyadh')) return '+966';
    if (tz.startsWith('Asia/Kuala_Lumpur')) return '+60';
    if (tz.startsWith('Asia/Jakarta')) return '+62';
    if (tz.startsWith('Africa/Johannesburg')) return '+27';
    if (tz.startsWith('Africa/Lagos')) return '+234';
  } catch {
    // ignore
  }
  return '+91';
}

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, Props>(
  ({ countryCode, onCountryCodeChange, className, ...props }, ref) => {
    const [internalCode, setInternalCode] = useState(() => countryCode ?? detectCountryCode());
    const activeCode = countryCode ?? internalCode;

    const handleCodeChange = (code: string) => {
      setInternalCode(code);
      onCountryCodeChange?.(code);
    };

    return (
      <div className="flex items-center gap-2">
        <select
          aria-label="Country code"
          value={activeCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="h-10 rounded-md border border-border bg-surface-muted px-2 text-sm text-ink-body focus:outline-none focus:ring-2 focus:ring-brand"
          style={{ minWidth: 90 }}
        >
          {COUNTRY_CODES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          className={cn('flex-1', className)}
          {...props}
        />
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
