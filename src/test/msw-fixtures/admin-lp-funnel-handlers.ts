import { http, HttpResponse, type HttpHandler } from 'msw';
import type { LPFunnelStatus } from '@/features/admin/schemas';

// PRD §7.12.5 fixture. Stateful per-user funnel-status, with skip detection
// (force 409 unless override=true) and an `auto_actions_triggered` payload
// that varies by target status.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const STAGE_INDEX: Record<LPFunnelStatus, number> = {
  '1_new_lead': 1,
  '2_first_reach_out': 2,
  '3_in_conversation': 3,
  '4_soft_commit': 4,
  '5_invested': 5,
};

const AUTO_ACTIONS: Record<LPFunnelStatus, string[]> = {
  '1_new_lead': [],
  '2_first_reach_out': ['welcome_email_sent'],
  '3_in_conversation': ['deal_suggestions_enabled', 'meeting_scheduling_enabled'],
  '4_soft_commit': ['follow_up_reminder_set'],
  '5_invested': ['portfolio_access_granted'],
};

const status: Record<string, LPFunnelStatus> = {};
let nextError: ErrorEnvelope | null = null;
let putCounter = 0;

export function resetMswLpFunnelState() {
  for (const k of Object.keys(status)) delete status[k];
  nextError = null;
  putCounter = 0;
}

resetMswLpFunnelState();

export function setMswLpFunnelStatus(userId: string, value: LPFunnelStatus) {
  status[userId] = value;
}

export function getMswLpFunnelStatus(userId: string): LPFunnelStatus {
  return status[userId] ?? '1_new_lead';
}

export function getMswLpFunnelPutCount() {
  return putCounter;
}

export function queueLpFunnelError(err: ErrorEnvelope) {
  nextError = err;
}

function errorBody(err: ErrorEnvelope) {
  return {
    data: null,
    error: {
      code: err.code,
      message: err.message,
      ...(err.detail !== undefined ? { detail: err.detail } : {}),
    },
  };
}

export const adminLpFunnelHandlers: HttpHandler[] = [
  http.put('*/api/v1/admin/lp/:userId/funnel-status', async ({ params, request }) => {
    if (nextError) {
      const err = nextError;
      nextError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const userId = String(params.userId);
    const body = (await request.json()) as { status?: LPFunnelStatus; override?: boolean };
    const target = body.status;
    if (!target || !(target in STAGE_INDEX)) {
      return HttpResponse.json(
        errorBody({ status: 422, code: 'validation_error', message: 'invalid status' }),
        { status: 422 },
      );
    }
    const current = status[userId] ?? '1_new_lead';
    const skipped = STAGE_INDEX[target] - STAGE_INDEX[current] > 1;
    if (skipped && !body.override) {
      return HttpResponse.json(
        errorBody({
          status: 409,
          code: 'conflict',
          message: 'Cannot skip funnel stages without override=true',
          detail: { current_status: current, attempted: target },
        }),
        { status: 409 },
      );
    }
    status[userId] = target;
    putCounter += 1;
    return HttpResponse.json({
      data: {
        user_id: userId,
        funnel_status: target,
        funnel_status_updated_at: '2026-04-26T17:00:00Z',
        auto_actions_triggered: AUTO_ACTIONS[target] ?? [],
      },
      error: null,
    });
  }),
];
