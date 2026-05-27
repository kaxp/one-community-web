// ─── Warmup Design Tokens — single source of truth ────────────────────────
// Import this wherever you need colours, typography, or spacing.
// Do NOT hardcode any of these values elsewhere in the codebase.

export const fonts = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
} as const;

export const colours = {
  // Backgrounds
  pageBg: '#F7F6F2',
  surface: '#ffffff',
  dark: '#0F1923',

  // Text
  text: '#1a1a1a',
  text2: '#6b6b6b',
  text3: '#9a9a9a',

  // Borders
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.12)',

  // Brand accent — primary (indigo)
  brand: '#3B4DC8',
  brandBg: '#EAEDFF',
  brandText: '#2E3EA8',

  // Semantic — positive / conviction
  positive: '#1B5C45',
  positiveBg: '#E2F5EE',

  // Semantic — caution / watchlist
  caution: '#8C4A1A',
  cautionBg: '#FFF3E2',

  // Semantic — neutral / info
  info: '#1A4A80',
  infoBg: '#E5EFFA',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

export const shadow = {
  card: '0 1px 3px rgba(0,0,0,0.05)',
  cardHover: '0 4px 16px rgba(0,0,0,0.09)',
  overlay: '0 8px 40px rgba(0,0,0,0.14)',
} as const;

export const spacing = {
  pagePadH: 40,
  pagePadHMd: 20,
  sectionGap: 48,
} as const;
