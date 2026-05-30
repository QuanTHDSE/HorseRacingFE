// ─── Domain primitives ────────────────────────────────────────────────────────

export type Role = "owner" | "jockey" | "referee" | "spectator" | "admin";
export type Tone = "default" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export type AuthMode = "login" | "register";

// ─── Auth / Account ───────────────────────────────────────────────────────────

export interface Account {
  id: string;
  role: Role;
  name: string;
  organization: string;
  email: string;
  password: string;
  badge: string;
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

export interface Tournament {
  id: string;
  name: string;
  location: string;
  range: string;
  status: string;
  prizePool: string;
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
  horse: string;
  odds: string;
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

export interface Approval {
  id: string;
  type: string;
  applicant: string;
  requestedRole: string;
  status: string;
}

export interface SystemUser {
  id: string;
  name: string;
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
  accounts: Account[];
  appState: AppState;
  authMode: AuthMode;
  authError: string;
  authLoading?: boolean;
  loginForm: LoginForm;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  registerForm: RegisterForm;
  setRegisterForm: React.Dispatch<React.SetStateAction<RegisterForm>>;
  handleLoginSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleRegisterSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleAction: (type: string, id: string, value?: string) => void;
  handleLogout: () => void;
  handleSelectAccount: (account: Account) => void;
  handleModeChange: (mode: AuthMode) => void;
  refreshAppData?: () => Promise<void>;
}
