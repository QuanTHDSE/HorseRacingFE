import { apiGet, apiPatch } from './client';
import type { AdminUserDto, PublishQueueItem, RegistrationDto, TournamentDto } from '../types/api';

export const adminApi = {
  listUsers: () => apiGet<{ users: AdminUserDto[] }>('/api/admin/users'),
  listRegistrations: (status?: string) =>
    apiGet<{ registrations: RegistrationDto[] }>(
      `/api/admin/registrations${status ? `?status=${status}` : ''}`,
    ),
  updateRegistration: (id: string, status: 'approved' | 'rejected', adminNote?: string) =>
    apiPatch<{ registration: RegistrationDto }>(`/api/admin/registrations/${id}`, {
      status,
      adminNote,
    }),
  listTournaments: () => apiGet<{ tournaments: TournamentDto[] }>('/api/tournaments'),
  listRaces: () => apiGet<{ races: unknown[] }>('/api/races'),
  publishQueue: () => apiGet<{ queue: PublishQueueItem[] }>('/api/admin/results/publish-queue'),
  publishResult: (raceId: string) =>
    apiPatch<{ ok: boolean }>(`/api/admin/races/${raceId}/result/publish`),
};
