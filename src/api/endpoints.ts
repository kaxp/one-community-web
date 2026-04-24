// Endpoint functions live here, one per backend route. Stage 1 ships a stub — real
// endpoints are added during their feature session. See PRD §7 and CLAUDE.md §5.
//
// Pattern (copy for new endpoints):
//
//   import { apiClient } from './client';
//   import type { ApiEnvelope } from '@/types/api';
//   import { zExampleResponse } from '@/features/example/schemas';
//
//   export async function getExample(id: string): Promise<ExampleResponse> {
//     const resp = await apiClient.get<ApiEnvelope<ExampleResponse>>(`/example/${id}`);
//     if (!resp.data.data) {
//       throw new Error('Empty envelope from /example/{id}');
//     }
//     return zExampleResponse.parse(resp.data.data);
//   }

export {};
