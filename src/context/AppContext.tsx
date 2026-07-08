import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  clearToken,
  getToken,
  setToken,
  type ApiAdminUser,
  type ApiHorse,
  type ApiInvitation,
  type ApiJockeyRace,
  type ApiNotification,
  type ApiPrediction,
  type ApiPredictionConfig,
  type ApiPublishQueueItem,
  type ApiRefereeCheck,
  type ApiRefereeRace,
  type ApiRaceDetail,
  type ApiRegistration,
  type ApiRole,
  type ApiSpectatorPoints,
  type ApiSpectatorRace,
  type ApiTrack,
  type ApiTournamentDto,
  type ApiTournamentItem,
  type ApiUser,
} from "../services/api";
import type {
  Account,
  AddParticipantInput,
  AppContextValue,
  AppState,
  AuthMode,
  CreateHorseInput,
  CreateTournamentInput,
  Horse,
  Invitation,
  JockeyDashboard,
  LoginForm,
  NewRaceInput,
  Notification,
  OwnerRegistration,
  Prediction,
  PredictionConfig,
  PublishItem,
  RefereeDashboard,
  RefereeParticipantCheck,
  RefereeRace,
  RefereeResultStatus,
  ViolationRule,
  RaceViolation,
  PenalizeInput,
  ResultRankingInput,
  Race,
  RaceDetail,
  RaceEligibleEntry,
  RaceLeaderboard,
  RaceSimTimeline,
  RaceParticipantDetail,
  Racetrack,
  RegisterForm,
  Reward,
  Role,
  SpectatorRace,
  SpectatorPointsSummary,
  SystemUser,
  Tone,
  Tournament,
} from "../types";

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_STATE: AppState = {
  horses: [],
  jockeys: [],
  races: [],
  results: [],
  invitations: [],
  refereeChecks: [],
  violations: [],
  reports: [],
  tournaments: [],
  leaderboardHorses: [],
  leaderboardJockeys: [],
  liveBoard: { raceId: "", title: "", phase: "", updatedAt: "", positions: [] },
  predictions: [],
  rewards: [],
  approvals: [],
  users: [],
  assignments: [],
  publishQueue: [],
  notifications: [],
  racetracks: [],
  jockeyApplications: [],
  ownerRegistrations: [],
  spectatorRaces: [],
  refereeRaces: [],
  spectatorPoints: null,
};

// ─── Mapping helpers ──────────────────────────────────────────────────────────

const BADGE: Record<string, string> = {
  horse_owner: "HO",
  owner: "HO",
  jockey: "JK",
  referee: "RF",
  spectator: "SP",
  admin: "AD",
};

function mapRole(r: ApiRole): Role {
  return r === "horse_owner" ? "owner" : (r as Role);
}

function mapApiUserToAccount(u: ApiUser): Account {
  return {
    id: u.id,
    role: mapRole(u.role),
    name: u.fullName,
    organization: "—",
    email: u.email,
    badge: BADGE[u.role] ?? "?",
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrize(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return String(n);
}

const TOURNAMENT_STATUS: Record<string, string> = {
  draft: "Draft",
  published: "Registration",
  ongoing: "Live",
  completed: "Completed",
};

function mapTournamentItem(t: ApiTournamentItem): Tournament {
  return {
    id: t._id,
    name: t.name,
    location: t.location,
    range: `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`,
    startDate: t.startDate,
    endDate: t.endDate,
    status: TOURNAMENT_STATUS[t.status] ?? t.status,
    prizePool: fmtPrize(t.prizePool),
    races: t.raceCount ?? 0,
  };
}

function mapTrack(t: ApiTrack): Racetrack {
  return {
    id: t._id,
    name: t.name,
    location: t.location,
    countryCode: t.countryCode,
    surface: t.surfaceDefault,
    isActive: t.isActive,
  };
}

function mapPredictionConfig(c: ApiPredictionConfig): PredictionConfig {
  return {
    isEnabled: c.isEnabled,
    pointsPerCorrect: c.pointsPerCorrect,
    bonusPointsTop3: c.bonusPointsTop3,
    predictionOpenAt: c.predictionOpenAt ?? null,
    predictionCloseAt: c.predictionCloseAt ?? null,
    maxPredictionsPerRace: c.maxPredictionsPerRace,
    poolEnabled: c.poolEnabled,
    entryFee: c.entryFee ?? 0,
    ticketPrice: c.ticketPrice ?? c.entryFee ?? 0,
    minRiskMultiplier: c.minRiskMultiplier ?? 1,
    maxRiskMultiplier: c.maxRiskMultiplier ?? 10,
    quickRiskMultipliers: c.quickRiskMultipliers ?? [1, 2, 3, 6],
    feePercent: c.feePercent,
    organizerFeeRate: c.organizerFeeRate,
    racingRewardRate: c.racingRewardRate,
    spectatorRewardRate: c.spectatorRewardRate,
    ownerShareRate: c.ownerShareRate,
    jockeyShareRate: c.jockeyShareRate,
    rankRewardRates: c.rankRewardRates ?? [],
    rolloverPolicy: c.rolloverPolicy,
    minScoreToShare: c.minScoreToShare,
  };
}

function mapTournamentDto(t: ApiTournamentDto): Tournament {
  return {
    id: t.id,
    name: t.name,
    location: t.location,
    range: `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`,
    startDate: t.startDate,
    endDate: t.endDate,
    status: TOURNAMENT_STATUS[t.status] ?? t.status,
    prizePool: "—",
    races: 0,
  };
}

const HEALTH: Record<string, string> = { fit: "Fit", injured: "Injured", retired: "Retired" };

function mapHorse(h: ApiHorse, ownerId: string): Horse {
  return {
    id: h.id,
    ownerId,
    name: h.name,
    breed: h.breed,
    age: h.age,
    health: HEALTH[h.healthStatus] ?? h.healthStatus,
    status: "Approved",
    nextRaceId: "",
    earnings: "—",
    ranking: "—",
    jockeyId: h.currentJockey?.id ?? null,
    jockeyName: h.currentJockey?.fullName,
    color: h.color,
    weight: h.weight,
    trainerName: h.trainerName,
    registrationId: h.registrationId,
    profilePdfUrl: h.profilePdfUrl,
    profilePdfName: h.profilePdfName,
  };
}

function mapOwnerRegistration(r: ApiRegistration): OwnerRegistration {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return {
    id: r.id,
    horseId: r.horse.id,
    horseName: r.horse.name,
    raceId: r.race.id,
    raceName: r.race.name,
    raceDate: r.race.scheduledAt,
    raceStatus: ({ scheduled: "Upcoming", ongoing: "Live", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>)[r.race.status] ?? r.race.status,
    jockeyId: r.jockey?.id,
    jockeyName: r.jockey?.fullName,
    status: statusMap[r.status] ?? r.status,
    createdAt: r.createdAt,
  };
}

function mapAdminUser(u: ApiAdminUser): SystemUser {
  return {
    id: u.id,
    name: u.fullName,
    role: mapRole(u.role),
    status: u.isActive ? "Active" : "Inactive",
    lastSeen: fmtDate(u.createdAt),
  };
}

function mapRegistrationToApproval(r: ApiRegistration) {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  const raceStatusMap: Record<string, string> = {
    scheduled: "Upcoming",
    ongoing: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return {
    id: r.id,
    type: "Horse registration",
    applicant: r.owner?.fullName ?? r.horse.name,
    requestedRole: "owner",
    status: statusMap[r.status] ?? r.status,
    horseName: r.horse.name,
    horseBreed: r.horse.breed,
    horseAge: r.horse.age,
    horseHealth: HEALTH[r.horse.healthStatus] ?? r.horse.healthStatus,
    horsePdfUrl: r.horse.profilePdfUrl,
    horsePdfName: r.horse.profilePdfName,
    raceName: r.race.name,
    raceRound: r.race.round,
    raceDate: r.race.scheduledAt,
    raceStatus: raceStatusMap[r.race.status] ?? r.race.status,
    ownerName: r.owner?.fullName,
    jockeyName: r.jockey?.fullName,
    submittedAt: r.createdAt,
    processedByName: r.processedBy?.fullName,
    processedAt: r.processedAt ?? undefined,
    adminNote: r.adminNote ?? undefined,
  };
}

function mapPublishQueueItem(q: ApiPublishQueueItem): PublishItem {
  return {
    id: q.raceId,
    race: q.raceName,
    resultStatus: q.confirmedAt ? "Referee confirmed" : "Pending",
    predictionStatus: "—",
    publishStatus: q.publishedAt ? "Published" : "Pending publish",
  };
}

function mapInvitation(inv: ApiInvitation): Invitation {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
  };
  return {
    id: inv.id,
    ownerId: inv.owner.id,
    jockeyId: inv.jockey?.id ?? "",
    horseId: inv.horse.id,
    raceId: inv.race.id,
    offer: "—",
    status: statusMap[inv.status] ?? inv.status,
    horseName: inv.horse.name,
    raceName: inv.race.name,
    raceDate: inv.race.scheduledAt,
    ownerName: inv.owner.fullName,
    raceStatus: RACE_STATUS[inv.race.status] ?? inv.race.status,
    message: inv.message,
  };
}

const NOTIFY_TONE: Record<string, Tone> = {
  invitation_received: "info",
  invitation_accepted: "success",
  invitation_declined: "warning",
  race_confirmed: "success",
  race_started: "accent",
  race_cancelled: "danger",
  result_confirmed: "success",
  result_published: "success",
  prediction_reward: "success",
  registration_approved: "success",
  registration_rejected: "danger",
  participant_scratched: "warning",
};

function mapNotification(n: ApiNotification, userId: string): Notification {
  return {
    id: n.id,
    userId,
    tone: NOTIFY_TONE[n.type] ?? "info",
    title: n.title,
    detail: n.message,
  };
}

function mapPrediction(p: ApiPrediction, spectatorId: string): Prediction {
  const statusMap: Record<string, string> = {
    pending: "Open",
    partial: "Partial",
    correct: "Won",
    incorrect: "Lost",
    cancelled: "Cancelled",
  };
  const firstHorse = p.predictedRanks[0]?.horseName ?? "—";
  return {
    id: p.id,
    spectatorId,
    raceId: p.raceId,
    horse: firstHorse,
    odds: "—",
    status: statusMap[p.status] ?? p.status,
    reward: p.totalPoints > 0 ? `${p.totalPoints} pts` : "—",
  };
}

function mapPointsToRewards(pts: ApiSpectatorPoints, spectatorId: string): Reward[] {
  if (!pts.transactions.length) return [];
  return pts.transactions
    .filter((tx) => tx.points > 0)
    .slice(0, 10)
    .map((tx) => ({
      id: tx.id,
      spectatorId,
      title: tx.note ?? tx.type,
      amount: `${tx.points} pts`,
      status: "Claimed",
    }));
}

function mapPointsSummary(pts: ApiSpectatorPoints): SpectatorPointsSummary {
  return {
    currentBalance: pts.currentBalance,
    totalPointsEarned: pts.totalPointsEarned,
    totalPointsSpent: pts.totalPointsSpent,
  };
}

function mapSpectatorRace(r: ApiSpectatorRace): SpectatorRace {
  const statusMap: Record<string, string> = {
    scheduled: "Upcoming",
    ongoing: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return {
    id: r.id,
    name: r.name,
    round: r.round,
    scheduledAt: r.scheduledAt,
    status: r.status,
    liveStatus: statusMap[r.status] ?? r.status,
    distance: r.distance,
    tournamentId: r.tournament.id,
    tournamentName: r.tournament.name,
    participants: r.participants,
    canPredict: r.canPredict,
    hasPrediction: r.hasPrediction,
    predictionOpenAt: r.predictionOpenAt,
    predictionCloseAt: r.predictionCloseAt,
    predictionConfig: r.predictionConfig,
    result: r.result ?? null,
  };
}

function mapRefereeRace(r: ApiRefereeRace): RefereeRace {
  const statusMap: Record<string, string> = {
    scheduled: "Upcoming",
    ongoing: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return {
    id: r.id,
    name: r.name,
    round: r.round,
    scheduledAt: r.scheduledAt,
    status: r.status,
    liveStatus: statusMap[r.status] ?? r.status,
    participantCount: r.participantCount,
    hasResult: r.hasResult,
    confirmedAt: r.confirmedAt,
    publishedAt: r.publishedAt,
  };
}

function mapRefereeCheck(c: ApiRefereeCheck): RefereeParticipantCheck {
  return {
    raceId: c.raceId,
    raceName: c.raceName,
    horseId: c.horseId,
    horseName: c.horseName,
    jockeyId: c.jockeyId,
    jockeyName: c.jockeyName,
    ownerId: c.ownerId,
    ownerName: c.ownerName,
    laneNumber: c.laneNumber,
    clothNumber: c.clothNumber,
    vetApproved: c.vetApproved,
    confirmed: c.confirmed,
  };
}

const RACE_STATUS: Record<string, string> = {
  scheduled: "Upcoming",
  ongoing: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

function mapJockeyRace(r: ApiJockeyRace): Race {
  let result: Race["result"];
  if (r.result) {
    const myRank = r.result.rankings.find((rk) => rk.horse.id === r.participant.horse.id);
    result = myRank
      ? { rank: myRank.rank, finishTime: myRank.finishTime, prize: myRank.prize }
      : null;
  } else if (r.result === null) {
    result = null;
  }
  return {
    id: r.id,
    ownerId: r.participant.owner.id,
    horseId: r.participant.horse.id,
    jockeyId: null,
    refereeId: "",
    tournamentId: r.tournament.id,
    name: r.name,
    round: String(r.round),
    date: r.scheduledAt,
    track: r.tournament.name,
    distance: r.distance ? `${r.distance}m` : "—",
    ownerConfirmed: !!r.participant.confirmedAt,
    jockeyConfirmed: true,
    refereeStatus: "—",
    liveStatus: RACE_STATUS[r.status] ?? r.status,
    horseName: r.participant.horse.name,
    ownerName: r.participant.owner.fullName,
    laneNumber: r.participant.laneNumber,
    tournamentName: r.tournament.name,
    result,
  };
}

function mapRaceDetail(r: ApiRaceDetail): RaceDetail {
  const id = r._id ?? r.id ?? "";
  const tourIdRaw = r.tournamentId;
  const tournamentId =
    typeof tourIdRaw === "string" ? tourIdRaw : (tourIdRaw as { _id: string })._id ?? "";
  const tournamentName =
    typeof tourIdRaw === "object" ? (tourIdRaw as { name: string }).name : undefined;

  const participants: RaceParticipantDetail[] = (r.participants ?? []).map((p) => {
    const horse = p.horseId as any;
    const jockey = p.jockeyId as any;
    const owner = p.ownerId as any;
    const horseId = typeof horse === "string" ? horse : horse?._id ?? "";
    return {
      id: p._id ?? `${horseId}-${p.laneNumber}`,
      horseId,
      horseName: typeof horse === "object" ? horse?.name ?? "—" : "—",
      jockeyId: typeof jockey === "string" ? jockey : jockey?._id ?? "",
      jockeyName: typeof jockey === "object" ? jockey?.fullName ?? "—" : "—",
      ownerId: typeof owner === "string" ? owner : owner?._id ?? "",
      ownerName: typeof owner === "object" ? owner?.fullName ?? "—" : "—",
      laneNumber: p.laneNumber,
      clothNumber: p.clothNumber,
      isScratched: !!p.scratchedAt,
      confirmedAt: p.confirmedAt,
    };
  });

  return {
    id,
    name: r.name,
    round: r.round,
    scheduledAt: r.scheduledAt,
    status: r.status,
    liveStatus: RACE_STATUS[r.status] ?? r.status,
    distance: r.distance,
    surface: r.surface,
    maxParticipants: r.maxParticipants,
    tournamentId,
    tournamentName,
    refereeId: typeof r.refereeId === "string" ? r.refereeId : (r.refereeId as any)?._id ?? null,
    participantCount: participants.filter((p) => !p.isScratched).length,
    participants,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [appState, setAppState] = useState<AppState>(EMPTY_STATE);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    role: "owner",
  });

  // ─── Fetch role-specific data after login ─────────────────────────────────

  const fetchDataForUser = useCallback(async (account: Account) => {
    const role = account.role;
    try {
      if (role === "admin") {
        const [usersRes, regsRes, queueRes, tourRes, tracksRes] = await Promise.allSettled([
          api.admin.listUsers(),
          api.admin.listRegistrations(),
          api.admin.listPublishQueue(),
          api.tournaments.list(),
          api.adminTracks.list(),
        ]);

        const racetracks =
          tracksRes.status === "fulfilled" ? tracksRes.value.data.map(mapTrack) : [];

        const users =
          usersRes.status === "fulfilled"
            ? usersRes.value.users.map(mapAdminUser)
            : [];

        const approvals =
          regsRes.status === "fulfilled"
            ? regsRes.value.registrations.map(mapRegistrationToApproval)
            : [];

        const jockeyApplications =
          regsRes.status === "fulfilled"
            ? regsRes.value.registrations
              .filter((r) => r.status === "pending")
              .map((r) => ({
                id: r.id,
                jockeyId: r.jockey?.id ?? "",
                jockeyName: r.jockey?.fullName ?? "Unknown",
                raceId: r.race.id,
                raceName: r.race.name,
                horseName: r.horse.name,
                appliedAt: r.createdAt?.slice(0, 10) ?? "",
                status: "Pending" as const,
              }))
            : [];

        const publishQueue =
          queueRes.status === "fulfilled"
            ? queueRes.value.queue.map(mapPublishQueueItem)
            : [];

        let tournaments: Tournament[] = [];
        let races: Race[] = [];

        if (tourRes.status === "fulfilled") {
          tournaments = tourRes.value.items.map(mapTournamentItem);
          // Fetch races for all tournaments in parallel
          const raceResults = await Promise.allSettled(
            tourRes.value.items.map((t) => api.races.getForTournament(t._id)),
          );
          races = raceResults.flatMap((res) => {
            if (res.status !== "fulfilled") return [];
            return res.value.races.map((r) => ({
              id: r._id ?? r.id ?? "",
              ownerId: "",
              horseId:
                r.participants && r.participants.length > 0 ? r.participants[0].horseId : "",
              jockeyId:
                r.participants && r.participants.length > 0
                  ? r.participants[0].jockeyId
                  : null,
              refereeId: r.refereeId ?? "",
              tournamentId: r.tournamentId ?? "",
              name: r.name,
              round: String(r.round),
              date: r.scheduledAt,
              track: r.trackId ?? "—",
              distance: r.distance ? `${r.distance}m` : "—",
              ownerConfirmed: false,
              jockeyConfirmed: false,
              refereeStatus: "—",
              liveStatus: RACE_STATUS[r.status] ?? r.status,
            }));
          });
        }

        setAppState((prev) => ({
          ...prev,
          users,
          approvals,
          jockeyApplications,
          publishQueue,
          tournaments,
          races,
          racetracks,
        }));
      } else if (role === "owner") {
        const [horsesRes, regsRes, tourRes] = await Promise.allSettled([
          api.horseOwner.listHorses(),
          api.horseOwner.listRegistrations(),
          api.horseOwner.listTournaments(),
        ]);

        const horses =
          horsesRes.status === "fulfilled"
            ? horsesRes.value.data.map((h) => mapHorse(h, account.id))
            : [];

        const ownerRegistrations =
          regsRes.status === "fulfilled"
            ? regsRes.value.data.map(mapOwnerRegistration)
            : [];

        let tournaments: Tournament[] = [];
        let races: Race[] = [];

        if (tourRes.status === "fulfilled") {
          tournaments = tourRes.value.items.map(mapTournamentItem);
          const raceResults = await Promise.allSettled(
            tourRes.value.items.map((t) => api.horseOwner.listRacesForTournament(String(t._id))),
          );
          races = raceResults.flatMap((res) => {
            if (res.status !== "fulfilled") return [];
            return res.value.races.map((r) => ({
              id: r._id ?? r.id ?? "",
              ownerId: "",
              horseId:
                r.participants && r.participants.length > 0 ? r.participants[0].horseId : "",
              jockeyId: null,
              refereeId: "",
              tournamentId: r.tournamentId ?? "",
              name: r.name,
              round: String(r.round),
              date: r.scheduledAt,
              track: "—",
              distance: r.distance ? `${r.distance}m` : "—",
              ownerConfirmed: false,
              jockeyConfirmed: false,
              refereeStatus: "—",
              liveStatus: RACE_STATUS[r.status] ?? r.status,
            }));
          });
        }

        setAppState((prev) => ({ ...prev, horses, ownerRegistrations, tournaments, races }));
      } else if (role === "jockey") {
        const [invRes, racesRes, notiRes] = await Promise.allSettled([
          api.jockey.listInvitations(),
          api.jockey.listRaces(),
          api.jockey.listNotifications(),
        ]);

        const invitations =
          invRes.status === "fulfilled"
            ? invRes.value.invitations.map(mapInvitation)
            : [];

        const races =
          racesRes.status === "fulfilled"
            ? racesRes.value.races.map(mapJockeyRace)
            : [];

        const notifications =
          notiRes.status === "fulfilled"
            ? notiRes.value.notifications.map((n) => mapNotification(n, account.id))
            : [];

        setAppState((prev) => ({ ...prev, invitations, races, notifications }));
      } else if (role === "spectator") {
        const [tourRes, racesRes, predsRes, ptsRes, notiRes] = await Promise.allSettled([
          api.spectator.listTournaments(),
          api.spectator.listRaces(),
          api.spectator.listPredictions(account.id),
          api.spectator.getPoints(),
          api.spectator.listNotifications(),
        ]);

        const tournaments =
          tourRes.status === "fulfilled"
            ? tourRes.value.tournaments.map(mapTournamentDto)
            : [];

        const spectatorRaces =
          racesRes.status === "fulfilled"
            ? racesRes.value.races.map(mapSpectatorRace)
            : [];

        const predictions =
          predsRes.status === "fulfilled"
            ? predsRes.value.predictions.map((p) => mapPrediction(p, account.id))
            : [];

        const rewards =
          ptsRes.status === "fulfilled"
            ? mapPointsToRewards(ptsRes.value.points, account.id)
            : [];

        const notifications =
          notiRes.status === "fulfilled"
            ? notiRes.value.notifications.map((n) => mapNotification(n, account.id))
            : [];

        const spectatorPoints =
          ptsRes.status === "fulfilled" ? mapPointsSummary(ptsRes.value.points) : null;

        setAppState((prev) => ({
          ...prev,
          tournaments,
          spectatorRaces,
          predictions,
          rewards,
          notifications,
          spectatorPoints,
        }));
      } else if (role === "referee") {
        const [racesRes, notiRes] = await Promise.allSettled([
          api.referee.listRaces(),
          api.referee.listNotifications(),
        ]);

        const refereeRaces =
          racesRes.status === "fulfilled"
            ? racesRes.value.races.map(mapRefereeRace)
            : [];

        const notifications =
          notiRes.status === "fulfilled"
            ? notiRes.value.notifications.map((n) => mapNotification(n, account.id))
            : [];

        setAppState((prev) => ({ ...prev, refereeRaces, notifications }));
      }
    } catch (err) {
      console.error("fetchDataForUser failed:", err);
    }
  }, []);

  // ─── On mount: restore session from token ─────────────────────────────────

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    setIsLoading(true);
    api.auth
      .me()
      .then(({ user: apiUser }) => {
        const account = mapApiUserToAccount(apiUser);
        setUser(account);
        return fetchDataForUser(account);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Login ────────────────────────────────────────────────────────────────

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setAuthError("");
    try {
      const { token, user: apiUser } = await api.auth.login(
        loginForm.email.trim(),
        loginForm.password,
      );
      setToken(token);
      const account = mapApiUserToAccount(apiUser);
      setUser(account);
      await fetchDataForUser(account);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registerForm.name || !registerForm.email || registerForm.password.length < 8) {
      setAuthError(
        "Please fill in all fields and use a password of at least 8 characters.",
      );
      return;
    }
    setIsLoading(true);
    setAuthError("");
    try {
      const { token, user: apiUser } = await api.auth.register(
        registerForm.email.trim(),
        registerForm.password,
        registerForm.name.trim(),
      );
      setToken(token);
      const account = mapApiUserToAccount(apiUser);
      setUser(account);
      await fetchDataForUser(account);
      setAuthMode("login");
      setRegisterForm({ name: "", email: "", password: "", role: "owner" });
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Actions (mutations) ──────────────────────────────────────────────────

  function handleAction(type: string, id: string, value?: string): void {
    const doAction = async () => {
      if (type === "jockeyInvite") {
        const action = value === "Accepted" ? "accept" : "decline";
        await api.jockey.respondInvitation(id, action);
        // Refresh invitations
        const res = await api.jockey.listInvitations();
        setAppState((prev) => ({
          ...prev,
          invitations: res.invitations.map(mapInvitation),
        }));
        return;
      }

      if (type === "approval" && value) {
        const status = value === "Approved" ? "approved" : "rejected";
        await api.admin.updateRegistration(id, status);
        const res = await api.admin.listRegistrations();
        setAppState((prev) => ({
          ...prev,
          approvals: res.registrations.map(mapRegistrationToApproval),
        }));
        return;
      }

      if (type === "jockeyApplication" && value) {
        const status = value === "Approved" ? "approved" : "rejected";
        await api.admin.updateRegistration(id, status);
        const res = await api.admin.listRegistrations();
        setAppState((prev) => ({
          ...prev,
          jockeyApplications: res.registrations
            .filter((r) => r.status === "pending")
            .map((r) => ({
              id: r.id,
              jockeyId: r.jockey?.id ?? "",
              jockeyName: r.jockey?.fullName ?? "Unknown",
              raceId: r.race.id,
              raceName: r.race.name,
              horseName: r.horse.name,
              appliedAt: r.createdAt?.slice(0, 10) ?? "",
              status: "Pending" as const,
            })),
        }));
        return;
      }

      if (type === "publishQueue") {
        await api.admin.publishResult(id);
        const res = await api.admin.listPublishQueue();
        setAppState((prev) => ({
          ...prev,
          publishQueue: res.queue.map(mapPublishQueueItem),
        }));
        return;
      }

      if (type === "makePrediction" && user) {
        // id = horse name in old code; for API we need horseId — handle gracefully
        setAppState((prev) => ({
          ...prev,
          predictions: [
            {
              id: `pred-${Date.now()}`,
              spectatorId: user.id,
              raceId: prev.liveBoard.raceId,
              horse: id,
              odds: "—",
              status: "Open",
              reward: "—",
            },
            ...prev.predictions,
          ],
        }));
        return;
      }

      // Local-only fallbacks
      setAppState((prev) => {
        if (type === "ownerConfirmRace") {
          return {
            ...prev,
            races: prev.races.map((r) =>
              r.id === id ? { ...r, ownerConfirmed: !r.ownerConfirmed } : r,
            ),
          };
        }
        if (type === "refereeCheck") {
          return {
            ...prev,
            refereeChecks: prev.refereeChecks.map((c) =>
              c.id === id && value ? { ...c, [value]: !c[value as keyof typeof c] } : c,
            ),
          };
        }
        return prev;
      });
    };

    doAction().catch((err) => console.error(`handleAction(${type}) failed:`, err));
  }

  // ─── Create racetrack via API ─────────────────────────────────────────────

  async function handleCreateRacetrack(data: Omit<Racetrack, "id">): Promise<void> {
    await api.adminTracks.create({
      name: data.name,
      location: data.location,
      countryCode: data.countryCode,
      surfaceDefault: data.surface,
      isActive: data.isActive,
    });
    const res = await api.adminTracks.list();
    setAppState((prev) => ({ ...prev, racetracks: res.data.map(mapTrack) }));
  }

  // ─── Create race via API ──────────────────────────────────────────────────

  function handleCreateRace(data: NewRaceInput): void {
    const doCreate = async () => {
      await api.races.create({
        tournamentId: data.tournamentId,
        ...(data.racetrackId ? { trackId: data.racetrackId } : {}),
        ...(data.refereeId ? { refereeId: data.refereeId } : {}),
        name: data.name,
        round: parseInt(data.round, 10) || 1,
        scheduledAt: data.date,
        distance: parseInt(data.distance, 10) || undefined,
        maxParticipants: data.maxParticipants ?? 12,
      });
      // Refresh races for the tournament
      if (data.tournamentId) {
        const res = await api.races.getForTournament(data.tournamentId);
        setAppState((prev) => {
          const otherRaces = prev.races.filter((r) => r.tournamentId !== data.tournamentId);
          const newRaces = res.races.map((r) => ({
            id: r._id ?? r.id ?? "",
            ownerId: "",
            horseId: "",
            jockeyId: null,
            refereeId: r.refereeId ?? "",
            tournamentId: r.tournamentId ?? data.tournamentId,
            name: r.name,
            round: String(r.round),
            date: r.scheduledAt,
            track: r.trackId ?? "—",
            distance: r.distance ? `${r.distance}m` : "—",
            ownerConfirmed: false,
            jockeyConfirmed: false,
            refereeStatus: "—",
            liveStatus: RACE_STATUS[r.status] ?? r.status,
          }));
          return { ...prev, races: [...otherRaces, ...newRaces] };
        });
      }
    };

    doCreate().catch((err) => console.error("handleCreateRace failed:", err));
  }

  // ─── Tournament CRUD ──────────────────────────────────────────────────────

  async function handleCreateTournament(data: CreateTournamentInput): Promise<void> {
    const res = await api.tournaments.create(data);
    const created = mapTournamentItem(res.tournament);
    setAppState((prev) => ({
      ...prev,
      tournaments: [created, ...prev.tournaments],
    }));
  }

  async function handleUpdateTournamentStatus(id: string, status: string): Promise<void> {
    const res = await api.tournaments.updateStatus(id, status);
    const updated = mapTournamentItem(res.tournament);
    setAppState((prev) => ({
      ...prev,
      tournaments: prev.tournaments.map((t) => (t.id === id ? updated : t)),
    }));
  }

  async function handleGetTournamentById(id: string): Promise<Tournament & { raceCount?: number }> {
    const res = await api.tournaments.getById(id);
    const t = res.tournament;
    return {
      ...mapTournamentItem(t),
      races: t.raceCount ?? 0,
    };
  }

  async function handleCreateHorse(data: CreateHorseInput): Promise<void> {
    await api.horseOwner.createHorse(data);
    const res = await api.horseOwner.listHorses();
    setAppState((prev) => ({
      ...prev,
      horses: res.data.map((h) => mapHorse(h, user?.id ?? "")),
    }));
  }

  async function handleUploadHorsePdf(file: File): Promise<{ url: string; name: string }> {
    const res = await api.horseOwner.uploadHorsePdf(file);
    return res.data;
  }

  async function handleUpdateHorse(id: string, data: Partial<CreateHorseInput>): Promise<void> {
    await api.horseOwner.updateHorse(id, data);
    const res = await api.horseOwner.listHorses();
    setAppState((prev) => ({
      ...prev,
      horses: res.data.map((h) => mapHorse(h, user?.id ?? "")),
    }));
  }

  async function handleRegisterForRace(raceId: string, horseId: string): Promise<void> {
    await api.horseOwner.registerForRace(raceId, horseId);
    const res = await api.horseOwner.listRegistrations();
    setAppState((prev) => ({
      ...prev,
      ownerRegistrations: res.data.map(mapOwnerRegistration),
    }));
  }

  async function handleCancelRegistration(id: string): Promise<void> {
    await api.horseOwner.cancelRegistration(id);
    setAppState((prev) => ({
      ...prev,
      ownerRegistrations: prev.ownerRegistrations.filter((r) => r.id !== id),
    }));
  }

  async function handleInviteJockey(
    raceId: string,
    horseId: string,
    jockeyId: string,
    message?: string,
  ): Promise<void> {
    await api.horseOwner.inviteJockey(raceId, horseId, jockeyId, message);
    const res = await api.horseOwner.listRegistrations();
    setAppState((prev) => ({
      ...prev,
      ownerRegistrations: res.data.map(mapOwnerRegistration),
    }));
  }

  async function handleGetRaceById(id: string): Promise<RaceDetail> {
    const res = await api.races.getById(id);
    return mapRaceDetail(res.race);
  }

  async function handleGetRaceLeaderboard(raceId: string): Promise<RaceLeaderboard> {
    const res = await api.leaderboards.get(raceId);
    return {
      ...res.leaderboard,
      rankings: res.leaderboard.rankings.filter((r) => !r.isDisqualified),
    };
  }

  async function handleAddParticipant(raceId: string, data: AddParticipantInput): Promise<RaceDetail> {
    await api.races.addParticipant(raceId, data);
    const res = await api.races.getById(raceId);
    return mapRaceDetail(res.race);
  }

  async function handleGetRaceEligibleEntries(raceId: string): Promise<RaceEligibleEntry[]> {
    const res = await api.races.listEligibleEntries(raceId);
    return res.entries;
  }

  async function refreshTournaments(): Promise<void> {
    try {
      const res = await api.tournaments.list();
      setAppState((prev) => ({ ...prev, tournaments: res.items.map(mapTournamentItem) }));
    } catch { /* ignore */ }
  }

  async function handleSimulateRace(raceId: string): Promise<RaceSimTimeline> {
    // Bắt đầu đua: race -> ongoing (giải đấu -> Live)
    const res = await api.races.simulate(raceId);
    setAppState((prev) => ({
      ...prev,
      races: prev.races.map((r) => (r.id === raceId ? { ...r, liveStatus: "Live" } : r)),
    }));
    await refreshTournaments();
    return res.timeline;
  }

  async function handleFinishRace(raceId: string): Promise<void> {
    // Kết thúc đua: race -> completed + công bố (giải đấu -> Registration)
    await api.races.finish(raceId);
    setAppState((prev) => ({
      ...prev,
      races: prev.races.map((r) => (r.id === raceId ? { ...r, liveStatus: "Completed" } : r)),
    }));
    await refreshTournaments();
  }

  async function handleAssignRaceReferee(raceId: string, refereeId: string | null): Promise<RaceDetail> {
    await api.races.assignReferee(raceId, refereeId);
    const res = await api.races.getById(raceId);
    return mapRaceDetail(res.race);
  }

  async function handleUpdateRaceStatus(raceId: string, status: string): Promise<RaceDetail> {
    await api.races.updateStatus(raceId, status);
    setAppState((prev) => ({
      ...prev,
      races: prev.races.map((r) =>
        r.id === raceId ? { ...r, liveStatus: RACE_STATUS[status] ?? status } : r,
      ),
    }));
    const detailRes = await api.races.getById(raceId);
    return mapRaceDetail(detailRes.race);
  }

  async function handleGetJockeyDashboard(): Promise<JockeyDashboard> {
    const data = await api.jockey.getDashboard();
    return {
      pendingInvitations: data.pendingInvitations,
      upcomingRaces: data.upcomingRaces,
      completedRaces: data.completedRaces,
    };
  }

  async function handleGetJockeyRaceById(id: string): Promise<Race> {
    const res = await api.jockey.getRaceById(id);
    return mapJockeyRace(res.race);
  }

  async function handleGetSpectatorRaceById(id: string): Promise<SpectatorRace> {
    const res = await api.spectator.getRaceById(id);
    return mapSpectatorRace(res.race);
  }

  async function refreshSpectatorState(account: Account): Promise<void> {
    const [racesRes, predsRes, ptsRes] = await Promise.all([
      api.spectator.listRaces(),
      api.spectator.listPredictions(account.id),
      api.spectator.getPoints(),
    ]);

    setAppState((prev) => ({
      ...prev,
      spectatorRaces: racesRes.races.map(mapSpectatorRace),
      predictions: predsRes.predictions.map((p) => mapPrediction(p, account.id)),
      rewards: mapPointsToRewards(ptsRes.points, account.id),
      spectatorPoints: mapPointsSummary(ptsRes.points),
    }));
  }

  async function handleCreatePrediction(
    raceId: string,
    horseId: string,
    ticketCount = 1,
  ): Promise<void> {
    if (!user || user.role !== "spectator") return;
    await api.spectator.createPrediction(raceId, [{ rank: 1, horseId }], ticketCount);
    await refreshSpectatorState(user);
  }

  async function handleCancelPrediction(predictionId: string): Promise<void> {
    if (!user || user.role !== "spectator") return;
    await api.spectator.cancelPrediction(predictionId);
    await refreshSpectatorState(user);
  }

  async function handleTopUpPoints(points: number): Promise<void> {
    if (!user || user.role !== "spectator") return;
    const res = await api.spectator.topUpPoints(points);
    setAppState((prev) => ({
      ...prev,
      rewards: mapPointsToRewards(res.points, user.id),
      spectatorPoints: mapPointsSummary(res.points),
    }));
  }

  async function handleCreatePayosTopUp(points: number): Promise<string> {
    if (!user || user.role !== "spectator") throw new Error("Spectator login is required.");
    const res = await api.spectator.createPayosTopUp(points);
    return res.paymentUrl;
  }

  async function handleUpdateRegistration(
    id: string,
    status: "Approved" | "Rejected",
    adminNote?: string,
  ): Promise<void> {
    const apiStatus = status === "Approved" ? "approved" : "rejected";
    await api.admin.updateRegistration(id, apiStatus, adminNote);
    const res = await api.admin.listRegistrations();
    setAppState((prev) => ({
      ...prev,
      approvals: res.registrations.map(mapRegistrationToApproval),
    }));
  }

  // ─── Deletes ──────────────────────────────────────────────────────────────

  async function handleDeleteTournament(id: string): Promise<void> {
    await api.tournaments.delete(id);
    setAppState((prev) => ({
      ...prev,
      tournaments: prev.tournaments.filter((t) => t.id !== id),
      races: prev.races.filter((r) => r.tournamentId !== id),
    }));
  }

  async function handleDeleteRace(id: string): Promise<void> {
    await api.races.delete(id);
    setAppState((prev) => ({
      ...prev,
      races: prev.races.filter((r) => r.id !== id),
    }));
  }

  async function handleDeleteHorse(id: string): Promise<void> {
    await api.horseOwner.deleteHorse(id);
    setAppState((prev) => ({
      ...prev,
      horses: prev.horses.filter((h) => h.id !== id),
    }));
  }

  // ─── Prediction config ──────────────────────────────────────────────────────

  async function handleGetPredictionConfig(id: string): Promise<PredictionConfig | null> {
    const res = await api.tournaments.getById(id);
    return res.tournament.predictionConfig
      ? mapPredictionConfig(res.tournament.predictionConfig)
      : null;
  }

  async function handleUpdatePredictionConfig(
    id: string,
    config: Partial<PredictionConfig>,
  ): Promise<PredictionConfig> {
    const res = await api.tournaments.updatePredictionConfig(id, config);
    if (!res.tournament.predictionConfig) {
      throw new Error("Cập nhật cấu hình thất bại");
    }
    return mapPredictionConfig(res.tournament.predictionConfig);
  }

  // ─── Referee ──────────────────────────────────────────────────────────────

  async function handleGetRefereeDashboard(): Promise<RefereeDashboard> {
    const res = await api.referee.getDashboard();
    return res.dashboard;
  }

  async function handleRefreshRefereeRaces(): Promise<void> {
    const res = await api.referee.listRaces();
    setAppState((prev) => ({ ...prev, refereeRaces: res.races.map(mapRefereeRace) }));
  }

  async function handleGetRefereeChecks(raceId: string): Promise<RefereeParticipantCheck[]> {
    const [checksResult, detailResult] = await Promise.allSettled([
      api.referee.listChecks(raceId),
      api.races.getById(raceId),
    ]);

    if (checksResult.status === "rejected") throw checksResult.reason;

    const detailByHorse =
      detailResult.status === "fulfilled"
        ? new Map(mapRaceDetail(detailResult.value.race).participants.map((p) => [p.horseId, p]))
        : new Map<string, RaceParticipantDetail>();

    return checksResult.value.checks.map((check) => {
      const row = mapRefereeCheck(check);
      const participant = detailByHorse.get(row.horseId);
      return participant
        ? {
          ...row,
          ownerName: participant.ownerName,
          clothNumber: participant.clothNumber,
        }
        : row;
    });
  }

  async function handleToggleRefereeCheck(
    raceId: string,
    horseId: string,
    field: "vetApprovedAt" | "confirmedAt",
  ): Promise<RefereeParticipantCheck[]> {
    await api.referee.toggleCheck(raceId, horseId, field);
    return handleGetRefereeChecks(raceId);
  }

  async function handleStartRefereeRace(raceId: string): Promise<void> {
    await api.referee.startRace(raceId);
    await handleRefreshRefereeRaces();
  }

  async function handleSimulateRefereeDraft(raceId: string): Promise<RaceSimTimeline> {
    const res = await api.referee.simulateDraft(raceId);
    await handleRefreshRefereeRaces();
    return res.timeline;
  }

  async function handleGetViolationRules(): Promise<ViolationRule[]> {
    const res = await api.referee.listViolationRules();
    return res.rules;
  }

  async function handleGetRaceViolations(raceId: string): Promise<RaceViolation[]> {
    const res = await api.referee.listViolations(raceId);
    return res.violations;
  }

  async function handlePenalize(raceId: string, input: PenalizeInput): Promise<void> {
    await api.referee.penalize(raceId, input);
  }

  async function handleRevokePenalty(raceId: string, violationId: string): Promise<void> {
    await api.referee.revokePenalty(raceId, violationId);
  }

  async function handleGetRaceResult(raceId: string): Promise<RefereeResultStatus | null> {
    const res = await api.referee.getResult(raceId);
    return res.result;
  }

  async function handleSubmitRaceResult(raceId: string, rankings: ResultRankingInput[]): Promise<void> {
    await api.referee.upsertResult(raceId, rankings);
    await handleRefreshRefereeRaces();
  }

  async function handleConfirmRaceResult(raceId: string): Promise<void> {
    await api.referee.confirmResult(raceId);
    await handleRefreshRefereeRaces();
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  function handleLogout() {
    clearToken();
    setUser(null);
    setAppState(EMPTY_STATE);
    setAuthMode("login");
  }

  function handleModeChange(mode: AuthMode) {
    setAuthError("");
    setAuthMode(mode);
  }

  const value: AppContextValue = {
    user,
    appState,
    authMode,
    authError,
    isLoading,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleAction,
    handleCreateRacetrack,
    handleCreateRace,
    handleCreateTournament,
    handleUpdateTournamentStatus,
    handleGetTournamentById,
    handleGetJockeyDashboard,
    handleGetJockeyRaceById,
    handleGetRaceById,
    handleGetRaceLeaderboard,
    handleAddParticipant,
    handleGetRaceEligibleEntries,
    handleSimulateRace,
    handleFinishRace,
    handleAssignRaceReferee,
    handleUpdateRaceStatus,
    handleCreateHorse,
    handleUploadHorsePdf,
    handleUpdateHorse,
    handleRegisterForRace,
    handleCancelRegistration,
    handleInviteJockey,
    handleGetSpectatorRaceById,
    handleCreatePrediction,
    handleCancelPrediction,
    handleTopUpPoints,
    handleCreatePayosTopUp,
    handleUpdateRegistration,
    handleDeleteTournament,
    handleDeleteRace,
    handleDeleteHorse,
    handleGetPredictionConfig,
    handleUpdatePredictionConfig,
    handleGetRefereeDashboard,
    handleRefreshRefereeRaces,
    handleGetRefereeChecks,
    handleToggleRefereeCheck,
    handleStartRefereeRace,
    handleSimulateRefereeDraft,
    handleGetViolationRules,
    handleGetRaceViolations,
    handlePenalize,
    handleRevokePenalty,
    handleGetRaceResult,
    handleSubmitRaceResult,
    handleConfirmRaceResult,
    handleLogout,
    handleModeChange,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
