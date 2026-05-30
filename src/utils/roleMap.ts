import type { UserRole } from '../types/api';

export type FeRole = 'owner' | 'jockey' | 'referee' | 'spectator' | 'admin';

export function backendRoleToFe(role: UserRole): FeRole {
  if (role === 'horse_owner') return 'owner';
  return role;
}

export function feRoleToBackend(role: FeRole): UserRole {
  if (role === 'owner') return 'horse_owner';
  return role;
}

const badgeMap: Record<FeRole, string> = {
  owner: 'HO',
  jockey: 'JK',
  referee: 'RF',
  spectator: 'SP',
  admin: 'AD',
};

export function roleBadge(role: FeRole): string {
  return badgeMap[role] ?? '?';
}
