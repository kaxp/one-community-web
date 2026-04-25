import { describe, expect, it } from 'vitest';
import {
  zMatchSuggestion,
  zMatchSuggestionsResponse,
  zRespondAction,
  zRespondResult,
} from './schemas';

describe('matchmaking schemas', () => {
  it('parses a populated approved suggestion', () => {
    const row = zMatchSuggestion.parse({
      id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
      lp_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
      startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
      score: 0.82,
      reason: 'Sector + stage + ticket match',
      status: 'approved',
      week_of: '2026-04-28',
      company_name: 'Acme Technologies',
      sector: 'fintech',
      one_liner: 'AI for compliance',
    });
    expect(row.score).toBeCloseTo(0.82);
    expect(row.status).toBe('approved');
  });

  it('accepts null score / reason / hydrated fields', () => {
    const row = zMatchSuggestion.parse({
      id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
      lp_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
      startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
      score: null,
      reason: null,
      status: 'pending',
      week_of: '2026-04-28',
      company_name: null,
      sector: null,
      one_liner: null,
    });
    expect(row.score).toBeNull();
    expect(row.reason).toBeNull();
  });

  it('accepts an empty suggestions array', () => {
    expect(zMatchSuggestionsResponse.parse([])).toEqual([]);
  });

  it('rejects an unknown action', () => {
    expect(zRespondAction.safeParse('maybe').success).toBe(false);
  });

  it('zRespondResult requires connection_id when connection_created=true (string is fine, null also fine)', () => {
    const created = zRespondResult.parse({
      suggestion_id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
      action: 'accepted',
      connection_created: true,
      connection_id: 'f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f',
    });
    expect(created.connection_id).toBeTruthy();

    const noMatch = zRespondResult.parse({
      suggestion_id: 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f',
      action: 'accepted',
      connection_created: false,
      connection_id: null,
    });
    expect(noMatch.connection_id).toBeNull();
  });
});
