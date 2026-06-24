const BASE_URL = (import.meta as Record<string, any>).env?.VITE_API_URL ?? "http://localhost:3000/api";

// ─── Token helpers ────────────────────────────────────────────────────────────

export const TOKEN_KEY = "horse-racing-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Base fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) msg = body.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export type ApiRole = "horse_owner" | "jockey" | "referee" | "spectator" | "admin";

export interface ApiUser {
  id: string;
  email: string;
  role: ApiRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiAdminUser {
  id: string;
  email: string;
  role: ApiRole;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiRegistration {
  id: string;
  status: "pending" | "approved" | "rejected";
  horse: { id: string; name: string; healthStatus: string; breed?: string; age?: number };
  race: { id: string; name: string; round: number; status: string; scheduledAt?: string };
  owner?: { id: string; fullName: string } | null;
  jockey?: { id: string; fullName: string } | null;
  processedBy?: { id: string; fullName: string } | null;
  processedAt?: string | null;
  waiverAcceptedAt?: string | null;
  adminNote?: string | null;
  createdAt?: string;
}

export interface ApiPublishQueueItem {
  raceId: string;
  raceName: string;
  confirmedAt: string | null;
  publishedAt: string | null;
}

export interface ApiPredictionConfig {
  isEnabled: boolean;
  pointsPerCorrect: number;
  bonusPointsTop3: number;
  predictionOpenAt?: string | null;
  predictionCloseAt?: string | null;
  maxPredictionsPerRace: number;
  poolEnabled: boolean;
  entryFee: number;
  minRiskMultiplier: number;
  maxRiskMultiplier: number;
  quickRiskMultipliers: number[];
  feePercent: number;
  organizerFeeRate: number;
  racingRewardRate: number;
  spectatorRewardRate: number;
  ownerShareRate: number;
  jockeyShareRate: number;
  rankRewardRates: number[];
  rolloverPolicy: "refund" | "rollover_next_race" | "to_organizer";
  minScoreToShare: number;
}

export interface ApiRefereeDashboard {
  upcomingRaces: number;
  completedRaces: number;
  pendingConfirmations: number;
}

export interface ApiRefereeRace {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  participantCount: number;
  hasResult: boolean;
  confirmedAt: string | null;
  publishedAt: string | null;
}

export interface ApiRefereeCheck {
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  laneNumber: number;
  vetApproved: boolean;
  confirmed: boolean;
}

export interface ApiRefereeResult {
  id: string;
  confirmedAt: string | null;
  publishedAt: string | null;
  rankingsCount: number;
}

export interface ApiResultRankingInput {
  rank: number;
  horseId: string;
  jockeyId: string;
  ownerId: string;
  finishTime?: number;
  prize?: number;
}

export interface ApiTournamentItem {
  _id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: "draft" | "published" | "ongoing" | "completed";
  prizePool?: number;
  raceCount?: number;
  predictionConfig?: ApiPredictionConfig;
}

export interface ApiTournamentDto {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  status: "draft" | "published" | "ongoing" | "completed";
}

export interface ApiHorse {
  id: string;
  registrationId?: string;
  name: string;
  breed: string;
  age: number;
  weight?: number;
  color?: string;
  trainerName?: string;
  profilePdfUrl?: string;
  profilePdfName?: string;
  healthStatus: "fit" | "injured" | "retired";
  currentJockey?: { id: string; fullName: string } | null;
  createdAt?: string;
}

export interface ApiInvitation {
  id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  respondedAt?: string | null;
  createdAt: string;
  horse: { id: string; name: string };
  race: { id: string; name: string; scheduledAt?: string; status: string };
  owner: { id: string; fullName: string };
  jockey?: { id: string; fullName: string } | null;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiPrediction {
  id: string;
  raceId: string;
  raceName: string;
  tournamentName: string;
  predictedRanks: Array<{ rank: number; horseId: string; horseName?: string }>;
  status: "pending" | "partial" | "correct" | "incorrect";
  pointsEarned: number;
  bonusPoints: number;
  totalPoints: number;
  evaluatedAt?: string | null;
  createdAt: string;
}

export interface ApiSpectatorPoints {
  currentBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    note?: string;
    createdAt: string;
  }>;
}

export interface ApiPaymentTransaction {
  id: string;
  provider: string;
  amountVnd: number;
  points: number;
  exchangeRateVndPerPoint: number;
  status: string;
  providerTransactionId?: string | null;
  paidAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
}

export interface ApiViewingTicketInfo {
  requiresTicket: boolean;
  hasPass: boolean;
  canPurchase: boolean;
  pricePoints: number;
  announceAt: string | null;
  saleOpensAt: string | null;
  saleExpiresAt: string | null;
  announcementMessage?: string;
  allowVipRedemption: boolean;
}

export interface ApiSpectatorRace {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  distance?: number;
  tournament: { id: string; name: string };
  participants: Array<{ id: string; name: string; laneNumber: number }>;
  canPredict: boolean;
  hasPrediction: boolean;
  predictionOpenAt?: string | null;
  predictionCloseAt?: string | null;
  result?: {
    id: string;
    publishedAt: string | null;
    rankings: Array<{
      rank: number;
      horse: { id: string; name: string };
      jockey: { id: string; fullName: string };
      finishTime?: number;
      prize: number;
    }>;
  } | null;
  viewingTicket: ApiViewingTicketInfo;
  streamUrl?: string;
}

export interface ApiRaceRanking {
  rank: number;
  horse: { id: string; name: string };
  jockey: { id: string; fullName: string };
  finishTime?: number;
  prize: number;
}

export interface ApiRaceResult {
  id: string;
  publishedAt: string | null;
  rankings: ApiRaceRanking[];
}

export interface ApiJockeyRace {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  distance?: number;
  tournament: { id: string; name: string };
  participant: {
    horse: { id: string; name: string };
    owner: { id: string; fullName: string };
    laneNumber: number;
    confirmedAt?: string | null;
  };
  result?: ApiRaceResult | null;
}

export interface ApiJockeyDashboard {
  pendingInvitations: number;
  upcomingRaces: number;
  completedRaces: number;
}

export interface ApiRace {
  _id?: string;
  id?: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  distance?: number;
  tournamentId?: string;
  refereeId?: string;
  trackId?: string;
  participants?: Array<{
    horseId: string;
    jockeyId: string;
    ownerId: string;
    laneNumber: number;
    confirmedAt?: string | null;
  }>;
}

export interface ApiRaceDetailParticipant {
  _id?: string;
  horseId: string | { _id: string; name: string; breed?: string };
  jockeyId: string | { _id: string; fullName: string };
  ownerId: string | { _id: string; fullName: string };
  laneNumber: number;
  clothNumber?: number;
  confirmedAt?: string | null;
  scratchedAt?: string | null;
}

export interface ApiRaceDetail {
  _id?: string;
  id?: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  distance?: number;
  surface?: string;
  maxParticipants: number;
  tournamentId: string | { _id: string; name: string };
  refereeId?: string | null;
  cancelledAt?: string | null;
  participants: ApiRaceDetailParticipant[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<ApiAuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, fullName: string) =>
      request<ApiAuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      }),
    me: () => request<{ user: ApiUser }>("/auth/me"),
  },

  admin: {
    listUsers: () => request<{ users: ApiAdminUser[] }>("/admin/users"),
    listRegistrations: (status?: string) =>
      request<{ registrations: ApiRegistration[] }>(
        `/admin/registrations${status ? `?status=${status}` : ""}`,
      ),
    updateRegistration: (id: string, status: "approved" | "rejected", adminNote?: string) =>
      request<{ registration: ApiRegistration }>(`/admin/registrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) }),
      }),
    listPublishQueue: () =>
      request<{ queue: ApiPublishQueueItem[] }>("/admin/results/publish-queue"),
    publishResult: (raceId: string) =>
      request<{ ok: boolean }>(`/admin/races/${raceId}/result/publish`, { method: "PATCH" }),
  },

  tournaments: {
    list: (page = 1, limit = 100) =>
      request<{ items: ApiTournamentItem[]; total: number; page: number; pages: number }>(
        `/tournaments?page=${page}&limit=${limit}`,
      ),
    getById: (id: string) =>
      request<{ tournament: ApiTournamentItem & { raceCount?: number; predictionConfig?: ApiPredictionConfig } }>(`/tournaments/${id}`),
    create: (data: {
      name: string;
      location: string;
      startDate: string;
      endDate: string;
      prizePool?: number;
      description?: string;
    }) =>
      request<{ tournament: ApiTournamentItem }>("/tournaments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      request<{ tournament: ApiTournamentItem }>(`/tournaments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/tournaments/${id}`, {
        method: "DELETE",
      }),
    updatePredictionConfig: (id: string, config: Partial<ApiPredictionConfig>) =>
      request<{ tournament: ApiTournamentItem & { predictionConfig?: ApiPredictionConfig } }>(
        `/tournaments/${id}/prediction-config`,
        { method: "PATCH", body: JSON.stringify(config) },
      ),
  },

  races: {
    getForTournament: (tournamentId: string) =>
      request<{ races: ApiRace[] }>(`/races/tournament/${tournamentId}`),
    getById: (id: string) =>
      request<{ race: ApiRaceDetail }>(`/races/${id}`),
    create: (data: Record<string, unknown>) =>
      request<{ race: ApiRace }>("/races", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    addParticipant: (
      raceId: string,
      data: { horseId: string; jockeyId: string; ownerId: string; laneNumber?: number },
    ) =>
      request<{ race: ApiRaceDetail }>(`/races/${raceId}/participants`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (raceId: string, status: string) =>
      request<{ race: ApiRace }>(`/races/${raceId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/races/${id}`, {
        method: "DELETE",
      }),
  },

  horseOwner: {
    listHorses: () => request<{ success: boolean; data: ApiHorse[] }>("/horse-owner/horses"),
    createHorse: (data: {
      name: string;
      breed: string;
      age: number;
      weight?: number;
      color?: string;
      trainerName?: string;
    }) =>
      request<{ success: boolean; data: ApiHorse }>("/horse-owner/horses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateHorse: (
      id: string,
      data: Partial<{ name: string; breed: string; age: number; weight: number; color: string; trainerName: string; registrationId: string }>,
    ) =>
      request<{ success: boolean; data: ApiHorse }>(`/horse-owner/horses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteHorse: (id: string) =>
      request<{ success: boolean; message: string }>(`/horse-owner/horses/${id}`, {
        method: "DELETE",
      }),
    listRegistrations: (status?: string) =>
      request<{ success: boolean; data: ApiRegistration[] }>(
        `/horse-owner/registrations${status ? `?status=${status}` : ""}`,
      ),
    registerForRace: (raceId: string, horseId: string) =>
      request<{ success: boolean; data: ApiRegistration }>("/horse-owner/registrations", {
        method: "POST",
        body: JSON.stringify({ raceId, horseId }),
      }),
    cancelRegistration: (id: string) =>
      request<{ success: boolean; message: string }>(`/horse-owner/registrations/${id}`, {
        method: "DELETE",
      }),
    inviteJockey: (raceId: string, horseId: string, jockeyId: string, message?: string) =>
      request<{ success: boolean; data: ApiInvitation }>("/horse-owner/invitations", {
        method: "POST",
        body: JSON.stringify({ raceId, horseId, jockeyId, ...(message ? { message } : {}) }),
      }),
    searchJockeys: (name: string) =>
      request<{ data: { id: string; fullName: string; licenseNumber?: string }[] }>(
        `/horse-owner/jockeys/search?name=${encodeURIComponent(name)}`,
      ),
    listTournaments: (page = 1, limit = 100) =>
      request<{ items: ApiTournamentItem[]; total: number; page: number; pages: number }>(
        `/horse-owner/tournaments?page=${page}&limit=${limit}`,
      ),
    listRacesForTournament: (tournamentId: string) =>
      request<{ races: ApiRace[] }>(`/horse-owner/tournaments/${tournamentId}/races`),
  },

  jockey: {
    getDashboard: () =>
      request<ApiJockeyDashboard>("/jockey/dashboard"),
    listInvitations: (status?: string) =>
      request<{ invitations: ApiInvitation[] }>(
        `/jockey/invitations${status ? `?status=${status}` : ""}`,
      ),
    respondInvitation: (id: string, action: "accept" | "decline") =>
      request<{ invitation: ApiInvitation }>(`/jockey/invitations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    listRaces: () => request<{ races: ApiJockeyRace[] }>("/jockey/races"),
    getRaceById: (id: string) => request<{ race: ApiJockeyRace }>(`/jockey/races/${id}`),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/jockey/notifications"),
  },

  spectator: {
    listTournaments: () =>
      request<{ tournaments: ApiTournamentDto[] }>("/spectator/tournaments"),
    listRaces: (filter?: "upcoming" | "completed") =>
      request<{ races: ApiSpectatorRace[] }>(`/spectator/races${filter ? `?filter=${filter}` : ""}`),
    getRaceById: (id: string) =>
      request<{ race: ApiSpectatorRace }>(`/spectator/races/${id}`),
    listPredictions: (userId: string) =>
      request<{ predictions: ApiPrediction[] }>(`/spectator/predictions/${userId}`),
    createPrediction: (
      raceId: string,
      predictedRanks: Array<{ rank: number; horseId: string }>,
      riskMultiplier = 1,
    ) =>
      request<{ prediction: ApiPrediction }>(`/spectator/predictions/${raceId}`, {
        method: "POST",
        body: JSON.stringify({ raceId, predictedRanks, riskMultiplier }),
      }),
    cancelPrediction: (predictionId: string) =>
      request<{ prediction: ApiPrediction; points: ApiSpectatorPoints }>(
        `/spectator/predictions/${predictionId}/cancel`,
        { method: "PATCH" },
      ),
    getPoints: () => request<{ points: ApiSpectatorPoints }>("/spectator/points"),
    topUpPoints: (points: number) =>
      request<{ payment: ApiPaymentTransaction; points: ApiSpectatorPoints }>("/spectator/top-ups", {
        method: "POST",
        body: JSON.stringify({ points }),
      }),
    listTopUps: () =>
      request<{ payments: ApiPaymentTransaction[] }>("/spectator/top-ups"),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/spectator/notifications"),
  },

  referee: {
    getDashboard: () =>
      request<{ dashboard: ApiRefereeDashboard }>("/referee/dashboard"),
    listRaces: () => request<{ races: ApiRefereeRace[] }>("/referee/races"),
    listChecks: (raceId: string) =>
      request<{ checks: ApiRefereeCheck[] }>(`/referee/races/${raceId}/checks`),
    toggleCheck: (raceId: string, horseId: string, field: "vetApprovedAt" | "confirmedAt") =>
      request<{ ok: boolean }>(`/referee/races/${raceId}/checks`, {
        method: "PATCH",
        body: JSON.stringify({ horseId, field }),
      }),
    getResult: (raceId: string) =>
      request<{ result: ApiRefereeResult | null }>(`/referee/races/${raceId}/result`),
    upsertResult: (raceId: string, rankings: ApiResultRankingInput[]) =>
      request<{ result: { id: string } }>(`/referee/races/${raceId}/result`, {
        method: "POST",
        body: JSON.stringify({ rankings }),
      }),
    confirmResult: (raceId: string) =>
      request<{ ok: boolean }>(`/referee/races/${raceId}/result/confirm`, { method: "PATCH" }),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/referee/notifications"),
  },
};
