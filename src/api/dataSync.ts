import { adminApi } from '../api/admin.api';
import { jockeyApi } from '../api/jockey.api';
import { ownerApi } from '../api/owner.api';
import { refereeApi } from '../api/referee.api';
import { spectatorApi } from '../api/spectator.api';
import { initialAppState } from '../data/mockData';
import type {
  Account,
  AppState,
  Approval,
  Invitation,
  Notification,
  Prediction,
  PublishItem,
  Race,
  RefereeCheck,
  SystemUser,
  Tournament,
} from '../types';
import type { NotificationDto } from '../types/api';
import { backendRoleToFe } from '../utils/roleMap';

function mapNotifications(userId: string, items: NotificationDto[]): Notification[] {
  return items.map((n) => ({
    id: n.id,
    userId,
    tone: n.isRead ? 'neutral' : 'info',
    title: n.title,
    detail: n.message,
  }));
}

function mapTournaments(items: { id: string; name: string; location: string; startDate: string; endDate: string; status: string }[]): Tournament[] {
  return items.map((t) => ({
    id: t.id,
    name: t.name,
    location: t.location,
    range: `${t.startDate.slice(0, 10)} - ${t.endDate.slice(0, 10)}`,
    status: t.status.charAt(0).toUpperCase() + t.status.slice(1),
    prizePool: '-',
    races: 0,
  }));
}

function mapPredictions(userId: string, items: Awaited<ReturnType<typeof spectatorApi.listPredictions>>['predictions']): Prediction[] {
  return items.map((p) => ({
    id: p.id,
    spectatorId: userId,
    raceId: p.raceId,
    horse: p.predictedRanks[0]?.horseName ?? p.predictedRanks[0]?.horseId ?? '-',
    odds: '-',
    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    reward: p.totalPoints > 0 ? `${p.totalPoints} pts` : '-',
  }));
}

function mapInvitations(userId: string, items: Awaited<ReturnType<typeof jockeyApi.listInvitations>>['invitations']): Invitation[] {
  return items.map((inv) => ({
    id: inv.id,
    ownerId: inv.owner.id,
    jockeyId: userId,
    horseId: inv.horse.id,
    raceId: inv.race.id,
    offer: inv.message ?? '-',
    status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
  }));
}

function mapJockeyRaces(userId: string, items: Awaited<ReturnType<typeof jockeyApi.listRaces>>['races']): Race[] {
  return items.map((r) => ({
    id: r.id,
    ownerId: r.participant.owner.id,
    horseId: r.participant.horse.id,
    jockeyId: userId,
    refereeId: '',
    tournamentId: r.tournament.id,
    name: r.name,
    round: String(r.round),
    date: r.scheduledAt.replace('T', ' ').slice(0, 16),
    track: r.tournament.name,
    distance: r.distance ? `${r.distance}m` : '-',
    ownerConfirmed: true,
    jockeyConfirmed: !!r.participant.confirmedAt,
    refereeStatus: r.status,
    liveStatus: r.status === 'ongoing' ? 'Live' : r.status === 'completed' ? 'Completed' : 'Upcoming',
  }));
}

function mapApprovals(items: Awaited<ReturnType<typeof adminApi.listRegistrations>>['registrations']): Approval[] {
  return items.map((r) => ({
    id: r.id,
    type: 'Horse registration',
    applicant: `${r.horse.name}`,
    requestedRole: 'owner',
    status:
      r.status === 'approved'
        ? 'Approved'
        : r.status === 'rejected'
          ? 'Rejected'
          : 'Pending',
  }));
}

function mapPublishQueue(items: Awaited<ReturnType<typeof adminApi.publishQueue>>['queue']): PublishItem[] {
  return items.map((q) => ({
    id: q.raceId,
    race: q.raceName,
    resultStatus: q.confirmedAt ? 'Referee confirmed' : 'Pending',
    predictionStatus: 'Locked',
    publishStatus: q.publishedAt ? 'Published' : 'Pending publish',
  }));
}

function mapRefereeChecks(
  refereeId: string,
  checks: Awaited<ReturnType<typeof refereeApi.listChecks>>['checks'],
): RefereeCheck[] {
  return checks.map((c) => ({
    id: `${c.raceId}:${c.horseId}`,
    refereeId,
    raceId: c.raceId,
    horseCheck: c.vetApproved,
    jockeyCheck: c.confirmed,
    trackCheck: false,
    note: `${c.horseName} / ${c.jockeyName} (lane ${c.laneNumber})`,
  }));
}

function mapRefereeRaces(refereeId: string, items: Awaited<ReturnType<typeof refereeApi.listRaces>>['races']): Race[] {
  return items.map((r) => ({
    id: r.id,
    ownerId: '',
    horseId: '',
    jockeyId: null,
    refereeId,
    tournamentId: '',
    name: r.name,
    round: String(r.round),
    date: r.scheduledAt.replace('T', ' ').slice(0, 16),
    track: '-',
    distance: '-',
    ownerConfirmed: true,
    jockeyConfirmed: true,
    refereeStatus: r.hasResult ? (r.confirmedAt ? 'Confirmed' : 'Result pending confirm') : 'Checks in progress',
    liveStatus: r.status === 'ongoing' ? 'Live' : r.status === 'completed' ? 'Completed' : 'Upcoming',
  }));
}

function mapUsers(items: Awaited<ReturnType<typeof adminApi.listUsers>>['users']): SystemUser[] {
  return items.map((u) => ({
    id: u.id,
    name: u.fullName,
    role: backendRoleToFe(u.role),
    status: u.isActive ? 'Active' : 'Inactive',
    lastSeen: new Date(u.createdAt).toLocaleDateString(),
  }));
}

export async function syncAppState(user: Account): Promise<AppState> {
  const base = { ...initialAppState, notifications: [] as Notification[] };

  try {
    if (user.role === 'spectator') {
      const [tournaments, races, predictions, points, notifications] = await Promise.all([
        spectatorApi.listTournaments(),
        spectatorApi.listRaces(),
        spectatorApi.listPredictions(),
        spectatorApi.getPoints(),
        spectatorApi.listNotifications(),
      ]);
      const liveRace = races.races.find((r) => r.status === 'ongoing') ?? races.races[0];
      return {
        ...base,
        tournaments: mapTournaments(tournaments.tournaments),
        predictions: mapPredictions(user.id, predictions.predictions),
        notifications: mapNotifications(user.id, notifications.notifications),
        liveBoard: liveRace
          ? {
              raceId: liveRace.id,
              title: liveRace.name,
              phase: liveRace.status,
              updatedAt: new Date().toLocaleTimeString(),
              positions: liveRace.participants.map((p, i) => ({
                position: i + 1,
                horse: p.name,
                jockey: '-',
                gap: `+${(i * 0.2).toFixed(1)}`,
              })),
            }
          : base.liveBoard,
        rewards: points.points.transactions
          .filter((t) => t.points > 0)
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            spectatorId: user.id,
            title: t.note ?? t.type,
            amount: `${t.points} pts`,
            status: 'Ready to claim',
          })),
      };
    }

    if (user.role === 'jockey') {
      const [invitations, races, notifications] = await Promise.all([
        jockeyApi.listInvitations(),
        jockeyApi.listRaces(),
        jockeyApi.listNotifications(),
      ]);
      const mappedRaces = mapJockeyRaces(user.id, races.races);
      return {
        ...base,
        invitations: mapInvitations(user.id, invitations.invitations),
        races: mappedRaces,
        notifications: mapNotifications(user.id, notifications.notifications),
      };
    }

    if (user.role === 'owner') {
      const [horses, registrations] = await Promise.all([
        ownerApi.listHorses(),
        ownerApi.listRegistrations(),
      ]);
      return {
        ...base,
        horses: horses.horses.map((h) => ({
          id: h.id,
          ownerId: user.id,
          name: h.name,
          breed: h.breed,
          age: h.age,
          health: h.healthStatus,
          status: h.healthStatus === 'fit' ? 'Approved' : 'Pending approval',
          nextRaceId: '-',
          earnings: '-',
          ranking: '-',
          jockeyId: h.currentJockey?.id ?? null,
        })),
        races: registrations.registrations.map((r) => ({
          id: r.race.id,
          ownerId: user.id,
          horseId: r.horse.id,
          jockeyId: r.jockey?.id ?? null,
          refereeId: '',
          tournamentId: '',
          name: r.race.name,
          round: String(r.race.round),
          date: r.race.scheduledAt?.replace('T', ' ').slice(0, 16) ?? '-',
          track: '-',
          distance: '-',
          ownerConfirmed: r.status === 'approved',
          jockeyConfirmed: !!r.jockey,
          refereeStatus: r.status,
          liveStatus: r.race.status,
        })),
      };
    }

    if (user.role === 'admin') {
      const [registrations, users, queue, tournaments] = await Promise.all([
        adminApi.listRegistrations('pending'),
        adminApi.listUsers(),
        adminApi.publishQueue(),
        adminApi.listTournaments(),
      ]);
      return {
        ...base,
        approvals: mapApprovals(registrations.registrations),
        users: mapUsers(users.users),
        publishQueue: mapPublishQueue(queue.queue),
        tournaments: mapTournaments(tournaments.tournaments),
      };
    }

    if (user.role === 'referee') {
      const racesRes = await refereeApi.listRaces();
      const firstRace = racesRes.races[0];
      const checks = firstRace
        ? await refereeApi.listChecks(firstRace.id)
        : { checks: [] };
      return {
        ...base,
        races: mapRefereeRaces(user.id, racesRes.races),
        refereeChecks: mapRefereeChecks(user.id, checks.checks),
      };
    }
  } catch {
    return base;
  }

  return base;
}
