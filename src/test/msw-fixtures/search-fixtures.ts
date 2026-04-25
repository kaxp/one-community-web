import type { SearchResponse } from '@/features/search/schemas';

export const startupResultsFixture: SearchResponse = {
  results: [
    {
      user_id: '11111111-1111-4000-8000-000000000001',
      name: 'Kapil Sahu',
      organisation: 'Acme Technologies',
      avatar_url: null,
      company_name: 'Acme Technologies',
      sector: 'fintech',
      stage: 'seed',
      one_liner: 'AI for compliance',
      description: 'We help banks automate KYC via agentic LLM workflows.',
      traction: '3 pilot banks, ₹2Cr ARR',
      funding_target_cr: 10.0,
      similarity_score: 0.87,
      ai_rank: 1,
      ai_reason: 'Strong match on sector + stage + traction.',
    },
    {
      user_id: '11111111-1111-4000-8000-000000000002',
      name: 'Priya Rao',
      organisation: 'NeoLedger',
      avatar_url: null,
      company_name: 'NeoLedger',
      sector: 'fintech',
      stage: 'pre_seed',
      one_liner: 'Accounting copilot for SMBs',
      description: 'Auto-bookkeeping via LLM + rules engine.',
      traction: '200 SMBs, 40% MoM growth',
      funding_target_cr: 3.0,
      similarity_score: 0.79,
      ai_rank: 2,
      ai_reason: 'Matches sector; earlier stage than requested.',
    },
  ],
  total: 23,
  target_type: 'startup',
  stage3_applied: true,
  rerank_cap: 20,
  next_cursor: null,
};

export const lpResultsFixture: SearchResponse = {
  results: [
    {
      user_id: '22222222-2222-4000-8000-000000000001',
      name: 'Abhinav Benthia',
      organisation: 'Warmup Ventures',
      designation: 'Partner',
      avatar_url: null,
      fund_name: 'Warmup Fund I',
      aum_cr: 250.0,
      cheque_range_min: 1.0,
      cheque_range_max: 10.0,
      sectors: ['fintech', 'defence'],
      stages: ['seed', 'series_a'],
      geography: ['IN', 'SEA'],
      co_invest_interest: true,
      similarity_score: 0.91,
      ai_rank: 1,
      ai_reason: 'Fund thesis aligns on fintech + early-stage ticket.',
    },
  ],
  total: 8,
  target_type: 'lp',
  stage3_applied: true,
  rerank_cap: 20,
  next_cursor: null,
};

export const stage3FallbackFixture: SearchResponse = {
  results: [
    {
      user_id: '11111111-1111-4000-8000-000000000003',
      name: 'Vendor Ai',
      organisation: 'Vendor Inc',
      avatar_url: null,
      company_name: 'Vendor Inc',
      sector: 'saas',
      stage: 'seed',
      one_liner: 'Vendor onboarding for procurement',
      description: 'Automates KYB checks.',
      traction: '40 enterprise customers',
      funding_target_cr: 5.0,
      similarity_score: 0.74,
      ai_rank: null,
      ai_reason: null,
    },
  ],
  total: 12,
  target_type: 'startup',
  stage3_applied: false,
  rerank_cap: 20,
  next_cursor: null,
};

export const emptyResultsFixture: SearchResponse = {
  results: [],
  total: 0,
  target_type: 'startup',
  stage3_applied: true,
  rerank_cap: 20,
  next_cursor: null,
};

export const partnerMaskedFixture: SearchResponse = {
  results: [
    {
      user_id: '11111111-1111-4000-8000-000000000099',
      name: 'Omega Labs',
      organisation: 'Omega',
      sector: 'climate',
      stage: 'seed',
      one_liner: 'Carbon-credit tooling',
    },
  ],
  total: 1,
  target_type: 'startup',
  stage3_applied: true,
  rerank_cap: 20,
  next_cursor: null,
};
