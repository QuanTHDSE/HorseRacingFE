// ─── Domain primitives ────────────────────────────────────────────────────────

export type Role = "owner" | "jockey" | "referee" | "spectator" | "admin";
export type Tone = "default" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export type AuthMode = "login" | "register";

// ─── Auth / Account ───────────────────────────────────────────────────────────

export interface PenaltyStatus {
  isBanned: boolean;
  bannedUntil: string | null;
  reason: string | null;
}

export interface PenaltyDetail {
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

export interface Account {
  id: string;
  role: Role;
  name: string;
  organization: string;
  email: string;
  badge: string;
  penaltyStatus?: PenaltyStatus | null;
}

// ─── App entities ─────────────────────────────────────────────────────────────

export interface Horse {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  age: number;
  health: string;
  status: string;
  nextRaceId: string;
  earnings: string;
  ranking: string;
  jockeyId: string | null;
  color?: string;
  weight?: number;
  trainerName?: string;
  registrationId?: string;
  profilePdfUrl?: string;
  profilePdfName?: string;
  jockeyName?: string;
}

export interface Jockey {
  id: string;
  name: string;
  stable: string;
  winRate: string;
  seasonWins: number;
  availability: string;
  style: string;
  fee: string;
}

export interface Race {
  id: string;
  ownerId: string;
  horseId: string;
  jockeyId: string | null;
  refereeId: string;
  tournamentId: string;
  name: string;
  round: string;
  date: string;
  track: string;
  distance: string;
  ownerConfirmed: boolean;
  jockeyConfirmed: boolean;
  refereeStatus: string;
  liveStatus: string;
  horseName?: string;
  ownerName?: string;
  laneNumber?: number;
  tournamentName?: string;
  result?: { rank?: number; finishTime?: number; prize?: number } | null;
}

export interface Result {
  id: string;
  raceId: string;
  horse: string;
  jockey: string;
  position: number;
  reward: string;
  points: number;
  publishStatus: string;
}

export interface Invitation {
  id: string;
  ownerId: string;
  jockeyId: string;
  horseId: string;
  raceId: string;
  offer: string;
  status: string;
  horseName?: string;
  raceName?: string;
  raceDate?: string;
  ownerName?: string;
  raceStatus?: string;
  message?: string;
}

export interface RefereeCheck {
  id: string;
  refereeId: string;
  raceId: string;
  horseCheck: boolean;
  jockeyCheck: boolean;
  trackCheck: boolean;
  note: string;
}

export interface Violation {
  id: string;
  refereeId: string;
  raceId: string;
  minute: string;
  title: string;
  level: string;
  action: string;
}

export interface Report {
  id: string;
  refereeId: string;
  raceId: string;
  title: string;
  status: string;
}

// ─── Referee (live BE) ────────────────────────────────────────────────────────

export interface RefereeRace {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  liveStatus: string;
  participantCount: number;
  hasResult: boolean;
  confirmedAt: string | null;
  publishedAt: string | null;
}

export interface RefereeParticipantCheck {
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  ownerName?: string;
  laneNumber: number;
  clothNumber?: number;
  vetApproved: boolean;
  confirmed: boolean;
}

export interface RefereeResultStatus {
  id: string;
  confirmedAt: string | null;
  publishedAt: string | null;
  rankingsCount: number;
  rankings?: ResultRankingInput[];
}

export interface ViolationRule {
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

export interface RaceViolation {
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

export interface PenalizeInput {
  ruleId: string;
  target: "horse" | "jockey";
  horseId?: string;
  jockeyId?: string;
  affectedHorseId?: string;
  notes?: string;
}

export interface RefereeDashboard {
  upcomingRaces: number;
  completedRaces: number;
  pendingConfirmations: number;
}

export interface ResultRankingInput {
  rank: number;
  horseId: string;
  jockeyId: string;
  ownerId: string;
  finishTime?: number;
  prize?: number;
}

export interface RaceEligibleEntry {
  registrationId: string;
  horseId: string;
  horseName: string;
  ownerId: string;
  ownerName: string;
  jockeyId: string | null;
  jockeyName: string | null;
}

export interface RaceSimHorse {
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

export interface RaceSimTimeline {
  raceId: string;
  name: string;
  distance: number;
  laps: number;
  trackCondition: string;
  trackName: string | null;
  trackLocation: string | null;
  surface: string;
  durationMs: number;
  horses: RaceSimHorse[];
}

export interface RaceLeaderboardRow {
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

export interface RaceLeaderboard {
  raceId: string;
  raceName: string;
  round: number;
  distance: number | null;
  tournamentId: string;
  tournamentName: string | null;
  raceStatus: string;
  /** null = role hiện tại chưa được phép xem (chưa publish / chưa confirm). */
  stage: "published" | "confirmed" | null;
  publishedAt: string | null;
  confirmedAt: string | null;
  rankings: RaceLeaderboardRow[];
}

export interface Tournament {
  id: string;
  name: string;
  location: string;
  range: string;
  startDate: string;
  endDate: string;
  status: string;
  prizePool: string;
  prizePoolValue?: number;
  races: number;
}

export interface LeaderboardHorse {
  id: string;
  name: string;
  points: number;
  stable: string;
}

export interface LeaderboardJockey {
  id: string;
  name: string;
  points: number;
  wins: number;
}

export interface LivePosition {
  position: number;
  horse: string;
  jockey: string;
  gap: string;
}

export interface LiveBoard {
  raceId: string;
  title: string;
  phase: string;
  updatedAt: string;
  positions: LivePosition[];
}

export interface Prediction {
  id: string;
  spectatorId: string;
  raceId: string;
  raceName: string;
  horse: string;
  tickets: string;
  cost: string;
  status: string;
  reward: string;
}

export interface Reward {
  id: string;
  spectatorId: string;
  title: string;
  amount: string;
  status: string;
}

export interface SpectatorPointsSummary {
  currentBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
}

export interface Approval {
  id: string;
  type: string;
  applicant: string;
  requestedRole: string;
  status: string;
  // ── Detail fields (for review before approving) ──
  horseName?: string;
  horseBreed?: string;
  horseAge?: number;
  horseHealth?: string;
  horsePdfUrl?: string;
  horsePdfName?: string;
  raceName?: string;
  raceRound?: number;
  raceDate?: string;
  raceStatus?: string;
  ownerName?: string;
  jockeyName?: string;
  submittedAt?: string;
  processedByName?: string;
  processedAt?: string;
  adminNote?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastSeen: string;
}

export interface Assignment {
  id: string;
  race: string;
  referee: string;
  jockey: string;
  horse: string;
  status: string;
}

export interface PublishItem {
  id: string;
  race: string;
  resultStatus: string;
  predictionStatus: string;
  publishStatus: string;
}

export interface Notification {
  id: string;
  userId: string;
  tone: Tone;
  title: string;
  detail: string;
}

export type TrackSurface = "turf" | "synthetic" | "dirt";

export interface Racetrack {
  id: string;
  name: string;
  location: string;
  countryCode: string;
  surface: TrackSurface;
  isActive: boolean;
}

export interface JockeyApplication {
  id: string;
  jockeyId: string;
  jockeyName: string;
  raceId: string;
  raceName: string;
  horseName: string;
  appliedAt: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface JockeyDashboard {
  pendingInvitations: number;
  upcomingRaces: number;
  completedRaces: number;
}

export interface RaceParticipantDetail {
  id: string;
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  ownerName: string;
  laneNumber: number;
  clothNumber?: number;
  isScratched: boolean;
  confirmedAt?: string | null;
}

export interface RaceDetail {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  liveStatus: string;
  distance?: number;
  surface?: string;
  maxParticipants: number;
  tournamentId: string;
  tournamentName?: string;
  refereeId?: string | null;
  participantCount: number;
  participants: RaceParticipantDetail[];
}

export interface CreateHorseInput {
  name: string;
  breed: string;
  age: number;
  registrationId?: string;
  weight?: number;
  color?: string;
  trainerName?: string;
  profilePdfUrl?: string;
  profilePdfName?: string;
}

export interface OwnerRegistration {
  id: string;
  horseId: string;
  horseName: string;
  raceId: string;
  raceName: string;
  raceDate?: string;
  raceStatus?: string;
  jockeyId?: string;
  jockeyName?: string;
  status: string;
  createdAt?: string;
}

export interface AddParticipantInput {
  horseId: string;
  jockeyId: string;
  ownerId: string;
  laneNumber?: number;
}

export interface NewRaceInput {
  name: string;
  tournamentId: string;
  racetrackId?: string;
  refereeId?: string;
  date: string;
  distance: string;
  round: string;
  maxParticipants?: number;
}

export interface CreateTournamentInput {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool?: number;
  description?: string;
}

export interface PredictionConfig {
  isEnabled: boolean;
  pointsPerCorrect: number;
  bonusPointsTop3: number;
  predictionOpenAt?: string | null;
  predictionCloseAt?: string | null;
  maxPredictionsPerRace: number;
  poolEnabled: boolean;
  entryFee: number;
  /** Giá vé dự đoán (điểm) — fallback về entryFee nếu BE chưa trả. */
  ticketPrice: number;
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

export interface SpectatorRaceParticipant {
  id: string;
  name: string;
  laneNumber: number;
  ticketCount: number;
}

export interface SpectatorRaceResult {
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
    horseId: string | null;
    horseName: string | null;
    type: string;
    description: string;
    penaltyApplied: string | null;
  }>;
}

export interface SpectatorRace {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  liveStatus: string;
  distance?: number;
  tournamentId: string;
  tournamentName: string;
  participants: SpectatorRaceParticipant[];
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
  result?: SpectatorRaceResult | null;
}

// ─── App state ────────────────────────────────────────────────────────────────

export interface AppState {
  horses: Horse[];
  jockeys: Jockey[];
  races: Race[];
  results: Result[];
  invitations: Invitation[];
  refereeChecks: RefereeCheck[];
  violations: Violation[];
  reports: Report[];
  tournaments: Tournament[];
  leaderboardHorses: LeaderboardHorse[];
  leaderboardJockeys: LeaderboardJockey[];
  liveBoard: LiveBoard;
  predictions: Prediction[];
  rewards: Reward[];
  approvals: Approval[];
  users: SystemUser[];
  assignments: Assignment[];
  publishQueue: PublishItem[];
  notifications: Notification[];
  racetracks: Racetrack[];
  jockeyApplications: JockeyApplication[];
  ownerRegistrations: OwnerRegistration[];
  spectatorRaces: SpectatorRace[];
  refereeRaces: RefereeRace[];
  spectatorPoints: SpectatorPointsSummary | null;
}

// ─── Role config ──────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  label: string;
  abbr: string;
}

export interface RoleConfig {
  label: string;
  accent: string;
  homeLabel: string;
  menu: MenuItem[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface AppContextValue {
  user: Account | null;
  appState: AppState;
  authMode: AuthMode;
  authError: string;
  isLoading: boolean;
  loginForm: LoginForm;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  registerForm: RegisterForm;
  setRegisterForm: React.Dispatch<React.SetStateAction<RegisterForm>>;
  handleLoginSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleRegisterSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleAction: (type: string, id: string, value?: string) => void;
  handleCreateRacetrack: (data: Omit<Racetrack, "id">) => Promise<void>;
  handleCreateRace: (data: NewRaceInput) => void;
  handleCreateTournament: (data: CreateTournamentInput) => Promise<void>;
  handleUpdateTournamentStatus: (id: string, status: string) => Promise<void>;
  handleUpdateTournamentPrizePool: (id: string, prizePool: number) => Promise<Tournament>;
  handleGetTournamentById: (id: string) => Promise<Tournament & { raceCount?: number }>;
  handleGetJockeyDashboard: () => Promise<JockeyDashboard>;
  handleGetJockeyRaceById: (id: string) => Promise<Race>;
  handleGetJockeyPenaltyDetail: () => Promise<PenaltyDetail | null>;
  handleGetRaceById: (id: string) => Promise<RaceDetail>;
  handleGetRaceLeaderboard: (raceId: string) => Promise<RaceLeaderboard>;
  handleAddParticipant: (raceId: string, data: AddParticipantInput) => Promise<RaceDetail>;
  handleGetRaceEligibleEntries: (raceId: string) => Promise<RaceEligibleEntry[]>;
  handleSimulateRace: (raceId: string) => Promise<RaceSimTimeline>;
  handleFinishRace: (raceId: string) => Promise<void>;
  handleAssignRaceReferee: (raceId: string, refereeId: string | null) => Promise<RaceDetail>;
  handleUpdateRaceStatus: (raceId: string, status: string) => Promise<RaceDetail>;
  handleCreateHorse: (data: CreateHorseInput) => Promise<void>;
  handleUploadHorsePdf: (file: File) => Promise<{ url: string; name: string }>;
  handleUpdateHorse: (id: string, data: Partial<CreateHorseInput>) => Promise<void>;
  handleRegisterForRace: (raceId: string, horseId: string) => Promise<void>;
  handleCancelRegistration: (id: string) => Promise<void>;
  handleInviteJockey: (raceId: string, horseId: string, jockeyId: string, message?: string) => Promise<void>;
  handleGetSpectatorRaceById: (id: string) => Promise<SpectatorRace>;
  handleGetSpectatorRaceReplay: (id: string) => Promise<{ available: boolean; resultPublished: boolean; timeline: RaceSimTimeline | null }>;
  handleCreatePrediction: (raceId: string, horseId: string, ticketCount?: number) => Promise<void>;
  handleCancelPrediction: (predictionId: string) => Promise<void>;
  handleTopUpPoints: (points: number) => Promise<void>;
  handleCreatePayosTopUp: (points: number) => Promise<string>;
  handleUpdateRegistration: (id: string, status: "Approved" | "Rejected", adminNote?: string) => Promise<void>;
  handleCreateAdminUser: (data: {
    email: string;
    password: string;
    fullName: string;
    role: "horse_owner" | "jockey" | "referee" | "spectator";
    phone?: string;
    licenseNumber?: string;
    licenseExpiry?: string | null;
    certificationId?: string;
  }) => Promise<void>;
  handleUpdateAdminUser: (id: string, data: {
    fullName?: string;
    phone?: string | null;
    role?: "horse_owner" | "jockey" | "referee" | "spectator" | "admin";
    isActive?: boolean;
    password?: string;
    licenseNumber?: string | null;
    licenseExpiry?: string | null;
    certificationId?: string | null;
  }) => Promise<void>;
  handleDeleteTournament: (id: string) => Promise<void>;
  handleDeleteRace: (id: string) => Promise<void>;
  handleDeleteHorse: (id: string) => Promise<void>;
  handleGetPredictionConfig: (id: string) => Promise<PredictionConfig | null>;
  handleUpdatePredictionConfig: (id: string, config: Partial<PredictionConfig>) => Promise<PredictionConfig>;
  handleGetRefereeDashboard: () => Promise<RefereeDashboard>;
  handleRefreshRefereeRaces: () => Promise<void>;
  handleGetRefereeChecks: (raceId: string) => Promise<RefereeParticipantCheck[]>;
  handleToggleRefereeCheck: (raceId: string, horseId: string, field: "vetApprovedAt" | "confirmedAt") => Promise<RefereeParticipantCheck[]>;
  handleStartRefereeRace: (raceId: string) => Promise<void>;
  handleSimulateRefereeDraft: (raceId: string) => Promise<RaceSimTimeline>;
  handleFinishRefereeRace: (raceId: string) => Promise<void>;
  handleGetViolationRules: () => Promise<ViolationRule[]>;
  handleGetRaceViolations: (raceId: string) => Promise<RaceViolation[]>;
  handlePenalize: (raceId: string, input: PenalizeInput) => Promise<void>;
  handleRevokePenalty: (raceId: string, violationId: string) => Promise<void>;
  handleGetRaceResult: (raceId: string) => Promise<RefereeResultStatus | null>;
  handleSubmitRaceResult: (raceId: string, rankings: ResultRankingInput[]) => Promise<void>;
  handleConfirmRaceResult: (raceId: string) => Promise<void>;
  handleLogout: () => void;
  handleModeChange: (mode: AuthMode) => void;
}
