import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage brand smoke', () => {
  it('renders the three brand smoke test elements', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('dashboard-root')).toBeInTheDocument();
    expect(screen.getByTestId('brand-smoke-button')).toHaveTextContent('Primary action');
    expect(screen.getByTestId('brand-smoke-badge')).toHaveTextContent('Success');
  });
});
