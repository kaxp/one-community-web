import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Mail,
  Newspaper,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useAdminSummary } from '@/features/admin/hooks/use-admin-summary';
import { useQuarterlyReports } from '@/features/admin/hooks/use-quarterly-reports';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, radius, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

const eyebrow: React.CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: colours.text3,
  marginBottom: 12,
};

export function AdminDashboard() {
  const user = useUser();
  const role = useRole();
  const summary = useAdminSummary();
  const reports = useQuarterlyReports({ quarter: null });
  const recentReports = (reports.data ?? []).slice(0, 3);
  const isMobile = useIsMobile();

  const pendingCount = summary.data?.pending_connection_count ?? 0;
  const contextLine =
    pendingCount > 0
      ? `${pendingCount} connection request${pendingCount !== 1 ? 's' : ''} awaiting review`
      : 'Community overview at a glance';

  return (
    <div style={{ background: colours.pageBg, minHeight: '100%' }} data-testid="admin-dashboard">
      <DashboardHero name={user?.name ?? null} role={role ?? 'admin'} contextLine={contextLine} />

      <div
        style={{
          padding: isMobile ? '24px 20px' : '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sectionGap,
        }}
      >
        {/* Quick access */}
        <section>
          <div style={eyebrow}>Quick access</div>
          <QuickGrid
            tiles={[
              {
                key: 'search',
                label: 'Search',
                path: '/search',
                subtitle: 'Community search',
              },
              {
                key: 'add-user',
                label: 'Add Contact',
                path: '/add-user',
                subtitle: 'Add new member',
              },
              {
                key: 'connections',
                label: 'Users',
                path: '/admin/users',
                subtitle: pendingCount > 0 ? `${pendingCount} pending` : 'Manage members',
              },
              {
                key: 'lp-funnel',
                label: 'LP Funnel',
                path: '/admin/lp-funnel',
                subtitle: 'Track LP pipeline',
              },
              {
                key: 'analytics',
                label: 'Analytics',
                path: '/admin/analytics',
                subtitle: 'Platform insights',
              },
              { key: 'digest', label: 'Digests', path: '/admin/digest', subtitle: 'Send digest' },
            ]}
          />
        </section>

        {/* KPIs */}
        {summary.isLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: 14,
            }}
            data-testid="admin-summary-loading"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : summary.isError ? (
          <ErrorState
            error={summary.error}
            onRetry={() => {
              void summary.refetch();
            }}
          />
        ) : summary.data ? (
          <>
            <section>
              <div style={eyebrow}>KPIs</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                  gap: 14,
                }}
              >
                {/* Pending connections */}
                <SurfaceCard style={{ padding: isMobile ? 20 : 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colours.text3 }}>
                      Pending connections
                    </div>
                    <Inbox size={14} color={colours.text3} aria-hidden />
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 36,
                      fontWeight: 700,
                      color: colours.text,
                      lineHeight: 1,
                    }}
                  >
                    {summary.data.pending_connection_count}
                  </div>
                  <Link
                    to="/admin/connections?status=pending_admin"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 12,
                    }}
                    data-testid="kpi-pending-link"
                  >
                    Review queue <ArrowRight size={12} />
                  </Link>
                </SurfaceCard>

                {/* MIS status */}
                <SurfaceCard style={{ padding: isMobile ? 20 : 24 }} data-testid="kpi-mis-card">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colours.text3 }}>
                      MIS — current month
                    </div>
                    <Users size={14} color={colours.text3} aria-hidden />
                  </div>
                  {summary.data.mis_status.length === 0 ? (
                    <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text2 }}>
                      No portfolio companies yet.
                    </div>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      {summary.data.mis_status.map((row) => (
                        <li
                          key={row.startup_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          {row.user_id ? (
                            <Link
                              to={`/search/profile/${row.user_id}`}
                              style={{
                                fontFamily: fonts.sans,
                                fontSize: 13,
                                fontWeight: 500,
                                color: colours.brand,
                                textDecoration: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' as const,
                              }}
                            >
                              {row.company_name}
                            </Link>
                          ) : (
                            <span
                              style={{
                                fontFamily: fonts.sans,
                                fontSize: 13,
                                color: colours.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' as const,
                              }}
                            >
                              {row.company_name}
                            </span>
                          )}
                          {row.submitted ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: fonts.sans,
                                fontSize: 11,
                                color: colours.positive,
                                flexShrink: 0,
                              }}
                            >
                              <CheckCircle2 size={12} aria-hidden /> Submitted
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: fonts.sans,
                                fontSize: 11,
                                color: colours.caution,
                                flexShrink: 0,
                              }}
                            >
                              <XCircle size={12} aria-hidden /> Pending
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/admin/mis-overview"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 12,
                    }}
                  >
                    MIS overview <ArrowRight size={12} />
                  </Link>
                </SurfaceCard>

                {/* Recent digests */}
                <SurfaceCard
                  style={{ padding: isMobile ? 20 : 24 }}
                  data-testid="kpi-recent-digests"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colours.text3 }}>
                      Recent digests
                    </div>
                    <Newspaper size={14} color={colours.text3} aria-hidden />
                  </div>
                  {summary.data.recent_digests.length === 0 ? (
                    <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text2 }}>
                      No digests sent yet.
                    </div>
                  ) : (
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {summary.data.recent_digests.map((d) => (
                        <li
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <Badge variant="secondary">{d.digest_type}</Badge>
                          <span
                            style={{ fontFamily: fonts.sans, fontSize: 11, color: colours.text3 }}
                            title={format(parseISO(d.sent_at), 'PPpp')}
                          >
                            {formatDistanceToNow(parseISO(d.sent_at), { addSuffix: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/admin/digest"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 12,
                    }}
                  >
                    Manage digests <ArrowRight size={12} />
                  </Link>
                </SurfaceCard>
              </div>
            </section>

            {/* Recent admin actions */}
            <section>
              <div style={eyebrow}>Recent admin actions</div>
              <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    color: colours.text3,
                    marginBottom: 16,
                  }}
                >
                  Last 10 actions — audit only.
                </div>
                {summary.data.recent_actions.length === 0 ? (
                  <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text2 }}>
                    No actions in the last window.
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                    data-testid="admin-recent-actions"
                  >
                    {summary.data.recent_actions.map((a) => (
                      <li
                        key={`${a.admin_id}-${a.target_id}-${a.created_at}`}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                      >
                        <Sparkles
                          size={14}
                          color={colours.brand}
                          aria-hidden
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <div>
                          <div
                            style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text }}
                          >
                            <strong>{a.admin_name ?? 'Admin'}</strong>{' '}
                            <span style={{ color: colours.text2 }}>
                              {a.action.replaceAll('_', ' ')} on{' '}
                              {a.target_type.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: fonts.sans,
                              fontSize: 11,
                              color: colours.text3,
                              marginTop: 2,
                            }}
                            title={format(parseISO(a.created_at), 'PPpp')}
                          >
                            {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SurfaceCard>
            </section>

            {/* Quarterly reports */}
            {recentReports.length > 0 ? (
              <section>
                <div style={eyebrow}>Quarterly reports</div>
                <SurfaceCard
                  style={{ padding: isMobile ? 20 : 28 }}
                  data-testid="kpi-quarterly-reports"
                >
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: colours.text3,
                      marginBottom: 16,
                    }}
                  >
                    Latest 3 — click View report to open the Drive doc.
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {recentReports.map((r) => (
                      <li
                        key={r.report_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap' as const,
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: fonts.sans,
                              fontSize: 14,
                              fontWeight: 600,
                              color: colours.text,
                            }}
                          >
                            {r.quarter}
                          </div>
                          <div
                            style={{ fontFamily: fonts.sans, fontSize: 11, color: colours.text3 }}
                          >
                            {r.status === 'sent'
                              ? 'Sent'
                              : r.status === 'approved'
                                ? 'Approved, distributing…'
                                : 'Pending'}
                            {r.generated_at ? ` · ${format(parseISO(r.generated_at), 'PP')}` : ''}
                          </div>
                        </div>
                        {r.drive_url ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={r.drive_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              <span>View report</span>
                            </a>
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/admin/quarterly-reports"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 16,
                    }}
                  >
                    Manage quarterly reports <ArrowRight size={12} />
                  </Link>
                </SurfaceCard>
              </section>
            ) : null}

            {/* Send digest CTA */}
            <SurfaceCard style={{ padding: isMobile ? 16 : 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap' as const,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.sm,
                      background: colours.brandBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={16} color={colours.brand} aria-hidden />
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 14,
                      fontWeight: 500,
                      color: colours.text,
                    }}
                  >
                    Want to send a digest now?
                  </div>
                </div>
                <Link
                  to="/admin/digest"
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    color: colours.brand,
                    textDecoration: 'none',
                  }}
                >
                  Open the digest console →
                </Link>
              </div>
            </SurfaceCard>
          </>
        ) : null}
      </div>
    </div>
  );
}
