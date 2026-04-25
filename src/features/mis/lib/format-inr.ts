// PRD §8.12.2 — INR rupee amounts displayed with Indian numbering.
// `21,00,000` not `2,100,000`. Used for read-only displays (prefill hints,
// already-submitted banner). The form itself uses raw <input type="number">.
export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹ ${value.toLocaleString('en-IN')}`;
}
