import { apiGet, apiPatch } from './client';
import type { InvitationDto, JockeyRaceDto, NotificationDto } from '../types/api';

export const jockeyApi = {
  dashboard: () =>
    apiGet<{ pendingInvitations: number; upcomingRaces: number; completedRaces: number }>(
      '/api/jockey/dashboard',
    ),
  listInvitations: (status?: string) =>
    apiGet<{ invitations: InvitationDto[] }>(
      `/api/jockey/invitations${status ? `?status=${status}` : ''}`,
    ),
  respondInvitation: (id: string, action: 'accept' | 'decline') =>
    apiPatch<{ invitation: InvitationDto }>(`/api/jockey/invitations/${id}`, { action }),
  listRaces: () => apiGet<{ races: JockeyRaceDto[] }>('/api/jockey/races'),
  getRace: (id: string) => apiGet<{ race: JockeyRaceDto }>(`/api/jockey/races/${id}`),
  listNotifications: () => apiGet<{ notifications: NotificationDto[] }>('/api/jockey/notifications'),
};
