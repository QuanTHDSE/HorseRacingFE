import type { Role, RoleConfig } from "../types";

export const roleConfigs: Record<Role, RoleConfig> = {
  owner: {
    label: "Horse Owner",
    accent: "Manage horses, confirm race schedules, and select jockeys",
    homeLabel: "Owner workspace",
    menu: [
      { id: "dashboard", label: "Dashboard", abbr: "DB" },
      { id: "horses", label: "My Horses", abbr: "MH" },
      { id: "jockeys", label: "Hire Jockeys", abbr: "HJ" },
      { id: "schedule", label: "Race Schedule", abbr: "RS" },
      { id: "results", label: "Results & Rewards", abbr: "RR" },
    ],
  },
  jockey: {
    label: "Jockey",
    accent: "Accept invitations, manage assigned races, and track performance",
    homeLabel: "Jockey workspace",
    menu: [
      { id: "dashboard", label: "Dashboard", abbr: "DB" },
      { id: "invitations", label: "Invitations", abbr: "IN" },
      { id: "assigned", label: "Assigned Races", abbr: "AR" },
      { id: "schedule", label: "My Schedule", abbr: "MS" },
      { id: "performance", label: "Performance", abbr: "PF" },
    ],
  },
  referee: {
    label: "Race Referee",
    accent: "Pre-race checklists and race result confirmation",
    homeLabel: "Referee control room",
    menu: [
      { id: "dashboard", label: "Dashboard", abbr: "DB" },
      { id: "checks", label: "Pre-race Checks", abbr: "PC" },
      { id: "penalties", label: "Penalties", abbr: "PN" },
      { id: "results", label: "Results", abbr: "RS" },
    ],
  },
  spectator: {
    label: "Spectator",
    accent: "Follow live races, predict results, and claim rewards",
    homeLabel: "Spectator hub",
    menu: [
      { id: "dashboard", label: "Dashboard", abbr: "DB" },
      { id: "tournaments", label: "Tournaments", abbr: "TN" },
      { id: "live", label: "Live Results", abbr: "LR" },
      { id: "predictions", label: "Predictions", abbr: "PD" },
      { id: "rewards", label: "Reward History", abbr: "RH" },
    ],
  },
  admin: {
    label: "Admin",
    accent: "Manage system operations, approve registrations, and publish results",
    homeLabel: "Admin command center",
    menu: [
      { id: "dashboard", label: "Dashboard", abbr: "DB" },
      { id: "users", label: "User Accounts", abbr: "UA" },
      { id: "racetracks", label: "Racetracks", abbr: "RT" },
      { id: "races", label: "Race Setup", abbr: "RC" },
      { id: "tournaments", label: "Tournaments", abbr: "TN" },
      { id: "approvals", label: "Approvals", abbr: "AP" },
      { id: "results", label: "Results & Predictions", abbr: "RP" },
    ],
  },
};
