import { apiGet, apiPatch, apiPost } from './client';
import type { RefereeCheckDto, RefereeRaceDto } from '../types/api';

export const refereeApi = {
  dashboard: () =>
    apiGet<{ dashboard: { upcomingRaces: number; completedRaces: number; pendingConfirmations: number } }>(
      '/api/referee/dashboard',
    ),
  listRaces: () => apiGet<{ races: RefereeRaceDto[] }>('/api/referee/races'),
  listChecks: (raceId: string) => apiGet<{ checks: RefereeCheckDto[] }>(`/api/referee/races/${raceId}/checks`),
  toggleCheck: (raceId: string, horseId: string, field: 'vetApprovedAt' | 'confirmedAt') =>
    apiPatch(`/api/referee/races/${raceId}/checks`, { horseId, field }),
  upsertResult: (raceId: string, rankings?: unknown[]) =>
    apiPost(`/api/referee/races/${raceId}/result`, rankings ? { rankings } : {}),
  confirmResult: (raceId: string) => apiPatch(`/api/referee/races/${raceId}/result/confirm`),
  getResult: (raceId: string) => apiGet<{ result: unknown }>(`/api/referee/races/${raceId}/result`),
};
