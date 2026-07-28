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

async function requestFormData<T>(path: string, body: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const responseBody = (await res.json()) as { message?: string };
      if (responseBody?.message) msg = responseBody.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export type ApiRole = "horse_owner" | "jockey" | "referee" | "spectator" | "admin";

export interface ApiPenaltyStatus {
  isBanned: boolean;
  bannedUntil: string | null;
  reason: string | null;
}

export interface ApiPenaltyDetail {
  target: "horse" | "jockey" | "both";
  description: string;
  penaltyApplied: string | null;
  recordedAt: string;
  bannedUntil: string | null;
  rule: {
    code: string;
    name: string;
    description: string;
    category: string;
    severity: string;
    banDurationDays: number;
  } | null;
  race: { id: string; name: string; scheduledAt: string } | null;
}

export interface ApiUser {
  id: string;
  email: string;
  role: ApiRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  penaltyStatus?: ApiPenaltyStatus;
  licenseNumber?: string;
  licenseExpiry?: string | null;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiRegistrationApplicationResponse {
  message: string;
  approvalRequired: true;
  applicationStatus: "pending";
}

export interface ApiAccountApplication {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: "pending" | "approved" | "rejected";
  applicationPdfUrl: string;
  applicationPdfName: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  adminNote: string | null;
  isActive: boolean;
}

export type ApiJockeyApplication = ApiAccountApplication;
export type ApiOwnerApplication = ApiAccountApplication;

export interface ApiAdminUser {
  id: string;
  email: string;
  role: ApiRole;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  certificationId?: string | null;
  createdAt: string;
}

export interface ApiAdminCreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Exclude<ApiRole, "admin">;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string | null;
  certificationId?: string;
}

export interface ApiAdminUpdateUserInput {
  fullName?: string;
  phone?: string | null;
  role?: ApiRole;
  isActive?: boolean;
  password?: string;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  certificationId?: string | null;
}

export interface ApiRegistration {
  id: string;
  status: "pending" | "approved" | "rejected";
  horse: { id: string; name: string; healthStatus: string; breed?: string; age?: number; profilePdfUrl?: string; profilePdfName?: string };
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
  ticketPrice?: number;
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
  fixedPrizeTopCount: 4 | 5;
  fixedPrizeRankRates: number[];
  rolloverPolicy: "refund" | "rollover_next_race" | "to_organizer";
  minScoreToShare: number;
}

export interface ApiHorseLeaderboardItem {
  rank: number;
  horseId: string;
  horseName: string;
  ownerId: string | null;
  ownerName: string | null;
  firstPlaceWins: number;
  totalPublishedRaces: number;
  winRate: number;
  latestWinAt: string | null;
  latestRaceName: string | null;
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
  horseRegistrationId?: string | null;
  horseBreed?: string;
  horseSire?: string | null;
  horseDam?: string | null;
  horseTrainerName?: string | null;
  horseAge?: number;
  horseColor?: string | null;
  horseWeight?: number | null;
  horseHealthStatus?: string;
  horseImageUrl?: string | null;
  horseProfilePdfUrl?: string | null;
  horseProfilePdfName?: string | null;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  ownerName?: string;
  laneNumber: number;
  clothNumber?: number;
  vetApproved: boolean;
  confirmed: boolean;
}

export interface ApiRefereeResult {
  id: string;
  confirmedAt: string | null;
  publishedAt: string | null;
  rankingsCount: number;
  rankings?: ApiResultRankingInput[];
}

export interface ApiViolationRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  penaltyApplied: string;
  banDurationDays: number;
  appliesTo: "horse" | "jockey" | "both";
}

export type ApiViolationCategory =
  | "race_conduct"
  | "medical"
  | "equipment"
  | "administrative";

export type ApiViolationSeverity = "low" | "medium" | "high" | "critical";

export type ApiViolationPenalty =
  | "warning"
  | "demote"
  | "disqualify"
  | "disqualification"
  | "restart"
  | "time_ban"
  | "permanent_ban";

export interface ApiAdminViolationRule {
  _id: string;
  id?: string;
  code: string;
  name: string;
  description: string;
  category: ApiViolationCategory;
  severity: ApiViolationSeverity;
  appliesTo: "horse" | "jockey" | "both";
  penaltyApplied: ApiViolationPenalty;
  banDurationDays: number;
  isActive: boolean;
  createdBy?: { _id?: string; fullName?: string; email?: string } | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiViolationRuleInput {
  code: string;
  name: string;
  description: string;
  category: ApiViolationCategory;
  severity: ApiViolationSeverity;
  appliesTo: "horse" | "jockey" | "both";
  penaltyApplied: ApiViolationPenalty;
  banDurationDays: number;
  isActive: boolean;
}

export interface ApiRaceViolation {
  id: string;
  ruleId: string | null;
  type: string;
  description: string;
  penaltyApplied: string | null;
  target: "horse" | "jockey" | "both";
  horseId: string | null;
  horseName: string | null;
  affectedHorseId: string | null;
  affectedHorseName: string | null;
  jockeyId: string | null;
  jockeyName: string | null;
  bannedUntil: string | null;
  recordedAt: string;
}

export interface ApiResultRankingInput {
  rank: number;
  horseId: string;
  jockeyId: string;
  ownerId: string;
  finishTime?: number;
  prize?: number;
}

export interface ApiRaceEligibleEntry {
  registrationId: string;
  horseId: string;
  horseName: string;
  ownerId: string;
  ownerName: string;
  jockeyId: string | null;
  jockeyName: string | null;
}

export interface ApiRaceSimHorse {
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  laneNumber: number;
  clothNumber: number;
  rank: number;
  finishTime: number;
  prize: number;
}

export interface ApiRaceSimTimeline {
  raceId: string;
  name: string;
  distance: number;
  laps: number;
  trackCondition: string;
  trackName: string | null;
  trackLocation: string | null;
  surface: string;
  durationMs: number;
  horses: ApiRaceSimHorse[];
}

export interface ApiRaceReplayResponse {
  available: boolean;
  resultPublished: boolean;
  timeline: ApiRaceSimTimeline | null;
}

export interface ApiTrack {
  _id: string;
  name: string;
  location: string;
  countryCode: string;
  surfaceDefault: "turf" | "synthetic" | "dirt";
  isActive: boolean;
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
  ticketCount: number;
  riskMultiplier: number;
  contribution: number;
  poolShare: number;
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

export interface ApiPayosTopUpResponse {
  payment: ApiPaymentTransaction;
  paymentUrl: string;
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
  participants: Array<{ id: string; name: string; laneNumber: number; ticketCount: number }>;
  canPredict: boolean;
  hasPrediction: boolean;
  predictionOpenAt?: string | null;
  predictionCloseAt?: string | null;
  predictionConfig: {
    isEnabled: boolean;
    poolEnabled: boolean;
    entryFee: number;
    ticketPrice: number;
    quickRiskMultipliers: number[];
  };
  result?: {
    id: string;
    publishedAt: string | null;
    rankings: Array<{
      rank: number;
      horse: { id: string; name: string };
      jockey: { id: string; fullName: string };
      finishTime?: number;
      prize: number;
      isDisqualified?: boolean;
    }>;
    violations?: Array<{
      target: "horse" | "jockey" | "both";
      horseId: string | null;
      horseName: string | null;
      jockeyId: string | null;
      jockeyName: string | null;
      type: string;
      description: string;
      penaltyApplied: string | null;
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

export interface ApiLeaderboardRanking {
  rank: number;
  horse: { id: string; name: string };
  jockey: { id: string; fullName: string };
  owner: { id: string; fullName: string };
  finishTime: number | null;
  marginBehind: number | null;
  prize: number;
  isDeadHeat: boolean;
  isDisqualified: boolean;
}

export interface ApiRaceLeaderboard {
  raceId: string;
  raceName: string;
  round: number;
  distance: number | null;
  tournamentId: string;
  tournamentName: string | null;
  raceStatus: string;
  stage: "published" | "confirmed" | null;
  publishedAt: string | null;
  confirmedAt: string | null;
  rankings: ApiLeaderboardRanking[];
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
    register: async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      role: Extract<ApiRole, "spectator" | "jockey" | "horse_owner">,
      applicationPdf?: File | null,
    ): Promise<ApiAuthResponse | ApiRegistrationApplicationResponse> => {
      if (role === "jockey" || role === "horse_owner") {
        if (!applicationPdf) {
          throw new Error(role === "jockey"
            ? "Vui lòng chọn hồ sơ PDF của Jockey."
            : "Vui lòng chọn hồ sơ PDF của Chủ ngựa.");
        }
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("fullName", fullName);
        formData.append("phone", phone);
        formData.append("role", role);
        formData.append("file", applicationPdf);
        return requestFormData<ApiRegistrationApplicationResponse>("/auth/register", formData);
      }
      return request<ApiAuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });
    },
    me: () => request<{ user: ApiUser }>("/auth/me"),
    updateProfile: (data: { fullName?: string; phone?: string }) =>
      request<{ user: ApiUser }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    changePassword: (oldPassword: string, newPassword: string) =>
      request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }),
  },

  admin: {
    listJockeyApplications: (status?: "pending" | "approved" | "rejected") =>
      request<{ applications: ApiJockeyApplication[] }>(
        `/admin/jockey-applications${status ? `?status=${status}` : ""}`,
      ),
    reviewJockeyApplication: (
      id: string,
      status: "approved" | "rejected",
      adminNote?: string,
    ) =>
      request<{ application: ApiJockeyApplication }>(`/admin/jockey-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) }),
      }),
    listOwnerApplications: (status?: "pending" | "approved" | "rejected") =>
      request<{ applications: ApiOwnerApplication[] }>(
        `/admin/owner-applications${status ? `?status=${status}` : ""}`,
      ),
    reviewOwnerApplication: (
      id: string,
      status: "approved" | "rejected",
      adminNote?: string,
    ) =>
      request<{ application: ApiOwnerApplication }>(`/admin/owner-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) }),
      }),
    listUsers: () => request<{ users: ApiAdminUser[] }>("/admin/users"),
    createUser: (data: ApiAdminCreateUserInput) =>
      request<{ user: ApiAdminUser }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: ApiAdminUpdateUserInput) =>
      request<{ user: ApiAdminUser }>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),
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

  adminTracks: {
    list: () => request<{ success: boolean; data: ApiTrack[] }>("/admin/tracks"),
    create: (data: {
      name: string;
      location: string;
      countryCode: string;
      surfaceDefault: "turf" | "synthetic" | "dirt";
      isActive: boolean;
    }) =>
      request<{ success: boolean; data: ApiTrack }>("/admin/tracks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  adminViolationRules: {
    list: (filters?: { category?: ApiViolationCategory; isActive?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.category) params.set("category", filters.category);
      if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
      const query = params.toString();
      return request<{ success: boolean; data: ApiAdminViolationRule[] }>(
        `/admin/violation-rules${query ? `?${query}` : ""}`,
      );
    },
    create: (data: ApiViolationRuleInput) =>
      request<{ success: boolean; data: ApiAdminViolationRule }>("/admin/violation-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<ApiViolationRuleInput, "code">>) =>
      request<{ success: boolean; data: ApiAdminViolationRule }>(
        `/admin/violation-rules/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    toggleStatus: (id: string) =>
      request<{ success: boolean; message: string; data: ApiAdminViolationRule }>(
        `/admin/violation-rules/${id}/toggle-status`,
        { method: "PATCH" },
      ),
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
    updatePrizePool: (id: string, prizePool: number) =>
      request<{ tournament: ApiTournamentItem }>(`/tournaments/${id}/prize-pool`, {
        method: "PATCH",
        body: JSON.stringify({ prizePool }),
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
    listEligibleEntries: (raceId: string) =>
      request<{ entries: ApiRaceEligibleEntry[] }>(`/races/${raceId}/eligible-entries`),
    simulate: (raceId: string) =>
      request<{ timeline: ApiRaceSimTimeline }>(`/races/${raceId}/simulate`, { method: "POST" }),
    finish: (raceId: string) =>
      request<{ ok: boolean }>(`/races/${raceId}/finish`, { method: "POST" }),
    addParticipant: (
      raceId: string,
      data: { horseId: string; jockeyId: string; ownerId: string; laneNumber?: number },
    ) =>
      request<{ participants: unknown }>(`/races/${raceId}/participants`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (raceId: string, status: string) =>
      request<{ race: ApiRace }>(`/races/${raceId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    assignReferee: (raceId: string, refereeId: string | null) =>
      request<{ race: unknown }>(`/races/${raceId}/referee`, {
        method: "PATCH",
        body: JSON.stringify({ refereeId }),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/races/${id}`, {
        method: "DELETE",
      }),
  },

  horseOwner: {
    listHorses: () => request<{ success: boolean; data: ApiHorse[] }>("/horse-owner/horses"),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/horse-owner/notifications"),
    uploadHorsePdf: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(`${BASE_URL}/horse-owner/horses/upload-pdf`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) msg = body.message;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json() as Promise<{ success: boolean; data: { url: string; name: string } }>;
    },
    createHorse: (data: {
      name: string;
      breed: string;
      age: number;
      weight?: number;
      color?: string;
      trainerName?: string;
      registrationId?: string;
      profilePdfUrl?: string;
      profilePdfName?: string;
    }) =>
      request<{ success: boolean; data: ApiHorse }>("/horse-owner/horses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateHorse: (
      id: string,
      data: Partial<{ name: string; breed: string; age: number; weight: number; color: string; trainerName: string; registrationId: string; profilePdfUrl: string; profilePdfName: string }>,
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
    listInvitations: (status?: string) =>
      request<{ success: boolean; data: ApiInvitation[] }>(
        `/horse-owner/invitations${status ? `?status=${status}` : ""}`,
      ),
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
    getPenaltyDetail: () =>
      request<{ penalty: ApiPenaltyDetail }>("/jockey/penalty-detail"),
  },

  spectator: {
    listTournaments: () =>
      request<{ tournaments: ApiTournamentDto[] }>("/spectator/tournaments"),
    listRaces: (filter?: "upcoming" | "completed") =>
      request<{ races: ApiSpectatorRace[] }>(`/spectator/races${filter ? `?filter=${filter}` : ""}`),
    listHorseLeaderboard: (limit = 10) =>
      request<{ items: ApiHorseLeaderboardItem[] }>(`/spectator/leaderboard/horses?limit=${limit}`),
    getRaceById: (id: string) =>
      request<{ race: ApiSpectatorRace }>(`/spectator/races/${id}`),
    getReplay: (id: string) =>
      request<ApiRaceReplayResponse>(`/spectator/races/${id}/replay`),
    listPredictions: (userId: string) =>
      request<{ predictions: ApiPrediction[] }>(`/spectator/predictions/${userId}`),
    createPrediction: (
      raceId: string,
      predictedRanks: Array<{ rank: number; horseId: string }>,
      ticketCount = 1,
    ) =>
      request<{ prediction: ApiPrediction }>(`/spectator/predictions/${raceId}`, {
        method: "POST",
        body: JSON.stringify({ raceId, predictedRanks, ticketCount }),
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
    createPayosTopUp: (points: number) =>
      request<ApiPayosTopUpResponse>("/spectator/top-ups/payos", {
        method: "POST",
        body: JSON.stringify({ points }),
      }),
    listTopUps: () =>
      request<{ payments: ApiPaymentTransaction[] }>("/spectator/top-ups"),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/spectator/notifications"),
  },

  points: {
    getMine: () => request<{ points: ApiSpectatorPoints }>("/points/me"),
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
    startRace: (raceId: string) =>
      request<{ ok: boolean }>(`/referee/races/${raceId}/start`, { method: "POST" }),
    simulateDraft: (raceId: string) =>
      request<{ success: boolean; message: string; timeline: ApiRaceSimTimeline }>(`/referee/races/${raceId}/start-simulation`, { method: "POST" }),
    finishRace: (raceId: string) =>
      request<{ ok: boolean }>(`/referee/races/${raceId}/finish`, { method: "POST" }),
    listViolationRules: () =>
      request<{ rules: ApiViolationRule[] }>("/referee/violation-rules"),
    listViolations: (raceId: string) =>
      request<{ violations: ApiRaceViolation[] }>(`/referee/races/${raceId}/violations`),
    penalize: (
      raceId: string,
      body: { ruleId: string; target: "horse" | "jockey" | "both"; horseId?: string; jockeyId?: string; affectedHorseId?: string; notes?: string },
    ) =>
      request<{ success: boolean; message: string }>(`/referee/races/${raceId}/penalize`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    revokePenalty: (raceId: string, violationId: string) =>
      request<{ success: boolean; message: string }>(`/referee/races/${raceId}/penalties/${violationId}`, {
        method: "DELETE",
      }),
    listNotifications: () =>
      request<{ notifications: ApiNotification[] }>("/referee/notifications"),
  },
  leaderboards: {
    get: (raceId: string) =>
      request<{ leaderboard: ApiRaceLeaderboard }>(`/leaderboards/${raceId}`),
  },
};
