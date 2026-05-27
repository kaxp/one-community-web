import { colours, fonts } from '@/design-system/tokens';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

interface Props {
  title: string;
  subtitle?: string;
}

// Shared page title/subtitle block. Use this instead of the old
// <h1 className="text-3xl font-semibold text-ink-heading"> pattern so all
// feature pages share the same typographic scale as the dashboard.
export function PageHeader({ title, subtitle }: Props) {
  const isMobile = useIsMobile();
  return (
    <div style={{ marginBottom: subtitle ? 0 : 4 }}>
      <h1
        style={{
          fontFamily: fonts.serif,
          fontSize: isMobile ? 22 : 26,
          fontWeight: 400,
          color: colours.text,
          letterSpacing: '-0.3px',
          margin: 0,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text2, margin: 0 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// Consistent page background + padding wrapper. Wrap the top-level div of
// each feature page route with this so background and spacing are uniform.
export function PageWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        background: colours.pageBg,
        minHeight: '100%',
        // RESPONSIVE: horizontal padding
        padding: isMobile ? '24px 20px 40px' : '32px 40px 48px',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
