import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { useAuthStore } from '@/auth/auth-store';

// Recharts uses ResizeObserver + the canvas; jsdom doesn't ship either.
// Stub ResizeObserver so the responsive container can mount, and skip
// rendering the actual chart bodies — we only assert page-level structure.
vi.mock('@/features/analytics/components/FunnelBarChart', () => ({
  FunnelBarChart: () => <div data-testid="funnel-bar-chart" />,
}));
vi.mock('@/features/analytics/components/MatchSuccessChart', () => ({
  MatchSuccessChart: () => <div data-testid="match-success-chart" />,
  pct: (v: number) => `${Math.round(v * 100)}%`,
}));

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderPage(route = '/admin/analytics') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
    </Routes>,
    { route },
  );
}

describe('AdminAnalyticsPage', () => {
  it('renders KPI cards on the Overview tab by default', async () => {
    signedInAsAdmin();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('kpi-total_users')).toBeInTheDocument());
    // Indian-numbering: 412 → "412"; 1,234 would render as "1,234".
    expect(screen.getByTestId('kpi-total_users').textContent).toContain('412');
    expect(screen.getByTestId('kpi-startups').textContent).toContain('230');
  });

  it('switches to the Funnel tab and renders three funnel charts', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('analytics-tab-funnel'));
    await waitFor(() => expect(screen.getAllByTestId('funnel-bar-chart').length).toBe(3));
  });

  it('Cohort tab renders the heatmap rows from the fixture', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('analytics-tab-cohort'));
    await waitFor(() => expect(screen.getByText(/2026-01/)).toBeInTheDocument());
    expect(screen.getByText(/2026-02/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03/)).toBeInTheDocument();
  });

  it('Match Success tab renders the line chart', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('analytics-tab-match'));
    await waitFor(() => expect(screen.getByTestId('match-success-chart')).toBeInTheDocument());
  });
});
