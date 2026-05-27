import React from 'react';
import { colours, fonts, radius, shadow } from './tokens';

// ── Tag / Badge ──────────────────────────────────────────────────────────────
export function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: radius.full,
        letterSpacing: '.04em',
        textTransform: 'uppercase' as const,
        background: bg,
        color,
        fontFamily: fonts.sans,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// Semantic tag presets
export const SemanticTag = {
  Brand: (label: string) => <Tag label={label} color={colours.brandText} bg={colours.brandBg} />,
  Positive: (label: string) => (
    <Tag label={label} color={colours.positive} bg={colours.positiveBg} />
  ),
  Caution: (label: string) => <Tag label={label} color={colours.caution} bg={colours.cautionBg} />,
  Info: (label: string) => <Tag label={label} color={colours.info} bg={colours.infoBg} />,
};

// ── Surface Card ─────────────────────────────────────────────────────────────
export function SurfaceCard({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colours.surface,
        borderRadius: radius.lg,
        border: `1px solid ${colours.border}`,
        boxShadow: hovered ? shadow.cardHover : shadow.card,
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.18s, transform 0.18s',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section Label (eyebrow text above headings) ───────────────────────────────
export function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '.14em',
        textTransform: 'uppercase' as const,
        color: colours.text3,
        fontFamily: fonts.sans,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// ── Section Heading (serif display) ──────────────────────────────────────────
export function SectionHeading({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <h2
      style={{
        fontFamily: fonts.serif,
        fontSize: 26,
        fontWeight: 400,
        color: colours.text,
        letterSpacing: '-.3px',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: 1,
        background: colours.border,
        ...style,
      }}
    />
  );
}

// ── Ghost / Text Button ───────────────────────────────────────────────────────
export function TextButton({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: fonts.sans,
        fontSize: 13,
        fontWeight: 500,
        color: colours.brand,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
