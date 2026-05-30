import { apiGet, apiPost } from './client';
import type {
  NotificationDto,
  PredictionDto,
  ProductDto,
  SpectatorPointsDto,
  SpectatorRaceDto,
  TournamentDto,
} from '../types/api';

export const spectatorApi = {
  listTournaments: () => apiGet<{ tournaments: TournamentDto[] }>('/api/spectator/tournaments'),
  listRaces: (filter?: string) =>
    apiGet<{ races: SpectatorRaceDto[] }>(
      `/api/spectator/races${filter ? `?filter=${filter}` : ''}`,
    ),
  getRace: (id: string) => apiGet<{ race: SpectatorRaceDto }>(`/api/spectator/races/${id}`),
  listPredictions: () => apiGet<{ predictions: PredictionDto[] }>('/api/spectator/predictions/current'),
  createPrediction: (raceId: string, predictedRanks: Array<{ rank: number; horseId: string }>) =>
    apiPost<{ prediction: PredictionDto }>(`/api/spectator/predictions/${raceId}`, {
      raceId,
      predictedRanks,
    }),
  getPoints: () => apiGet<{ points: SpectatorPointsDto }>('/api/spectator/points'),
  listProducts: () => apiGet<{ products: ProductDto[] }>('/api/spectator/products'),
  redeem: (productId: string, quantity = 1) =>
    apiPost('/api/spectator/redemptions', { productId, quantity }),
  purchaseViewingPass: (raceId: string) =>
    apiPost(`/api/spectator/races/${raceId}/viewing-pass`),
  listNotifications: () => apiGet<{ notifications: NotificationDto[] }>('/api/spectator/notifications'),
};
