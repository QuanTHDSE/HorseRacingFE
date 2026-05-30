import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { HorseDto, RegistrationDto } from '../types/api';

export const ownerApi = {
  listHorses: () => apiGet<{ horses: HorseDto[] }>('/api/horse-owner/horses'),
  createHorse: (body: { name: string; breed: string; age: number }) =>
    apiPost<{ horse: HorseDto }>('/api/horse-owner/horses', body),
  updateHorse: (id: string, body: Partial<{ name: string; breed: string; age: number }>) =>
    apiPatch<{ horse: HorseDto }>(`/api/horse-owner/horses/${id}`, body),
  listRegistrations: () => apiGet<{ registrations: RegistrationDto[] }>('/api/horse-owner/registrations'),
  registerForRace: (body: { raceId: string; horseId: string; waiverAccepted: boolean }) =>
    apiPost<{ registration: RegistrationDto }>('/api/horse-owner/registrations', body),
  cancelRegistration: (id: string) => apiDelete(`/api/horse-owner/registrations/${id}`),
  inviteJockey: (body: { raceId: string; horseId: string; jockeyId: string; message?: string }) =>
    apiPost('/api/horse-owner/invitations', body),
};
