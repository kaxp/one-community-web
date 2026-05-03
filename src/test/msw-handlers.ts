import type { HttpHandler } from 'msw';
import { authHandlers } from './msw-fixtures/auth-handlers';
import { searchHandlers } from './msw-fixtures/search-handlers';
import { adminConnectionsHandlers } from './msw-fixtures/admin-handlers';
import { profileHandlers } from './msw-fixtures/profile-handlers';
import { connectionsHandlers } from './msw-fixtures/connections-handlers';
import { pitchHandlers } from './msw-fixtures/pitch-handlers';
import { misHandlers } from './msw-fixtures/mis-handlers';
import { scheduleHandlers } from './msw-fixtures/schedule-handlers';
import { travelHandlers } from './msw-fixtures/travel-handlers';
import { matchmakingHandlers } from './msw-fixtures/matchmaking-handlers';
import { profileViewersHandlers } from './msw-fixtures/profile-viewers-handlers';
import { onboardingHandlers } from './msw-fixtures/onboarding-handlers';
import { adminHomeHandlers } from './msw-fixtures/admin-home-handlers';
import { adminDigestHandlers } from './msw-fixtures/admin-digest-handlers';
import { adminMatchmakingOpsHandlers } from './msw-fixtures/admin-matchmaking-ops-handlers';
import { adminQuarterlyReportsHandlers } from './msw-fixtures/admin-quarterly-reports-handlers';
import { adminDlqHandlers } from './msw-fixtures/admin-dlq-handlers';
import { adminLpFunnelHandlers } from './msw-fixtures/admin-lp-funnel-handlers';
import { adminPartnerReferralHandlers } from './msw-fixtures/admin-partner-referral-handlers';
import { adminTracxnHandlers } from './msw-fixtures/admin-tracxn-handlers';
import { adminAnalyticsHandlers } from './msw-fixtures/admin-analytics-handlers';
import { digestMeHandlers } from './msw-fixtures/digest-me-handlers';
import { adminPitchesHandlers } from './msw-fixtures/admin-pitches-handlers';

// Order matters: admin-handlers register `PATCH /connections/:id/admin` and
// connections-handlers register `PATCH /connections/:id/respond`. Both paths
// have the same prefix; admin must register first so its more-specific
// `/admin` suffix isn't shadowed. (MSW v2 first-match wins.)
export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...searchHandlers,
  ...adminConnectionsHandlers,
  ...connectionsHandlers,
  ...pitchHandlers,
  ...misHandlers,
  ...scheduleHandlers,
  ...travelHandlers,
  ...matchmakingHandlers,
  ...profileViewersHandlers,
  ...onboardingHandlers,
  ...adminHomeHandlers,
  ...adminDigestHandlers,
  ...adminMatchmakingOpsHandlers,
  ...adminQuarterlyReportsHandlers,
  ...adminDlqHandlers,
  ...adminLpFunnelHandlers,
  ...adminPartnerReferralHandlers,
  ...adminTracxnHandlers,
  ...adminAnalyticsHandlers,
  ...digestMeHandlers,
  ...adminPitchesHandlers,
  ...profileHandlers,
];
