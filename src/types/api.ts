export type UserRole = 'spectator' | 'jockey' | 'horse_owner' | 'referee' | 'admin';

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUserDto;
}

export interface TournamentDto {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
}

export interface SpectatorRaceDto {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  distance?: number;
  tournament: { id: string; name: string };
  participants: Array<{ id: string; name: string; laneNumber: number }>;
  canPredict: boolean;
  hasPrediction: boolean;
  result?: { id: string; rankings: unknown[]; publishedAt?: string | null } | null;
  viewingTicket: {
    requiresTicket: boolean;
    hasPass: boolean;
    canPurchase: boolean;
    pricePoints: number;
  };
  streamUrl?: string;
}

export interface PredictionDto {
  id: string;
  raceId: string;
  raceName: string;
  tournamentName: string;
  predictedRanks: Array<{ rank: number; horseId: string; horseName?: string }>;
  status: string;
  pointsEarned: number;
  bonusPoints: number;
  totalPoints: number;
  createdAt: string;
}

export interface SpectatorPointsDto {
  currentBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  transactions: Array<{ id: string; type: string; points: number; note?: string; createdAt: string }>;
}

export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  category: string;
  pointsCost: number;
  stock: number;
  isInStock: boolean;
}

export interface InvitationDto {
  id: string;
  status: string;
  message?: string;
  createdAt: string;
  horse: { id: string; name: string };
  race: { id: string; name: string; scheduledAt?: string; status: string };
  owner: { id: string; fullName: string };
}

export interface JockeyRaceDto {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  distance?: number;
  tournament: { id: string; name: string };
  participant: {
    horse: { id: string; name: string };
    owner: { id: string; fullName: string };
    laneNumber: number;
    confirmedAt?: string | null;
  };
  result?: { id: string; rankings: unknown[]; publishedAt?: string | null } | null;
}

export interface HorseDto {
  id: string;
  name: string;
  breed: string;
  age: number;
  healthStatus: string;
  currentJockey?: { id: string; fullName: string } | null;
}

export interface RegistrationDto {
  id: string;
  status: string;
  horse: { id: string; name: string; healthStatus: string };
  race: { id: string; name: string; round: number; status: string; scheduledAt?: string };
  jockey?: { id: string; fullName: string } | null;
}

export interface AdminUserDto {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RefereeRaceDto {
  id: string;
  name: string;
  round: number;
  scheduledAt: string;
  status: string;
  participantCount: number;
  hasResult: boolean;
  confirmedAt: string | null;
  publishedAt: string | null;
}

export interface RefereeCheckDto {
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string;
  jockeyName: string;
  laneNumber: number;
  vetApproved: boolean;
  confirmed: boolean;
}

export interface PublishQueueItem {
  raceId: string;
  raceName: string;
  confirmedAt: string | null;
  publishedAt: string | null;
}
