export const initialAccounts = [
  {
    id: "owner-1",
    role: "owner",
    name: "Nguyen Minh Chau",
    organization: "Royal Stables",
    email: "owner@royalstables.vn",
    password: "owner123",
    badge: "HO"
  },
  {
    id: "jockey-1",
    role: "jockey",
    name: "Tran Bao Long",
    organization: "Elite Rider Squad",
    email: "jockey@eliterider.vn",
    password: "jockey123",
    badge: "JK"
  },
  {
    id: "referee-1",
    role: "referee",
    name: "Le Quoc Binh",
    organization: "Central Track Officials",
    email: "referee@centraltrack.vn",
    password: "ref123456",
    badge: "RF"
  },
  {
    id: "spectator-1",
    role: "spectator",
    name: "Pham Thanh Ha",
    organization: "Race Fan Club",
    email: "spectator@racefan.vn",
    password: "spectator123",
    badge: "SP"
  },
  {
    id: "admin-1",
    role: "admin",
    name: "Hoang Gia Bao",
    organization: "HorseRacing System Admin",
    email: "admin@horseracing.vn",
    password: "admin123",
    badge: "AD"
  }
];

export const roleConfigs = {
  owner: {
    label: "Horse Owner",
    accent: "Quan ly ngua, xac nhan lich dua va chon jockey",
    homeLabel: "Owner workspace",
    menu: [
      { id: "dashboard", label: "Tong quan" },
      { id: "horses", label: "Ngua cua toi" },
      { id: "jockeys", label: "Thue jockey" },
      { id: "schedule", label: "Lich thi dau" },
      { id: "results", label: "Ket qua va thuong" }
    ]
  },
  jockey: {
    label: "Jockey",
    accent: "Nhan loi moi, quan ly race duoc giao va thanh tich",
    homeLabel: "Jockey workspace",
    menu: [
      { id: "dashboard", label: "Tong quan" },
      { id: "invitations", label: "Loi moi" },
      { id: "assigned", label: "Race duoc giao" },
      { id: "schedule", label: "Lich ca nhan" },
      { id: "performance", label: "Thanh tich" }
    ]
  },
  referee: {
    label: "Race Referee",
    accent: "Checklist truoc race, vi pham va xac nhan ket qua",
    homeLabel: "Referee control room",
    menu: [
      { id: "dashboard", label: "Tong quan" },
      { id: "checks", label: "Pre-race checks" },
      { id: "monitor", label: "Theo doi race" },
      { id: "violations", label: "Vi pham" },
      { id: "reports", label: "Bien ban va ket qua" }
    ]
  },
  spectator: {
    label: "Spectator",
    accent: "Theo doi live, du doan ket qua va nhan thuong",
    homeLabel: "Spectator hub",
    menu: [
      { id: "dashboard", label: "Tong quan" },
      { id: "tournaments", label: "Giai dau" },
      { id: "live", label: "Live results" },
      { id: "predictions", label: "Du doan" },
      { id: "rewards", label: "Thuong du doan" }
    ]
  },
  admin: {
    label: "Admin",
    accent: "Dieu hanh he thong, duyet dang ky va cong bo ket qua",
    homeLabel: "Admin command center",
    menu: [
      { id: "dashboard", label: "Tong quan" },
      { id: "users", label: "Tai khoan" },
      { id: "tournaments", label: "Quan ly giai" },
      { id: "approvals", label: "Duyet dang ky" },
      { id: "results", label: "Ket qua va du doan" }
    ]
  }
};

export const initialAppState = {
  horses: [
    {
      id: "horse-1",
      ownerId: "owner-1",
      name: "Thunder Echo",
      breed: "Arabian",
      age: 4,
      health: "Fit",
      status: "Approved",
      nextRaceId: "race-1",
      earnings: "420M",
      ranking: "#2",
      jockeyId: "jockey-1"
    },
    {
      id: "horse-2",
      ownerId: "owner-1",
      name: "Copper Blaze",
      breed: "Thoroughbred",
      age: 5,
      health: "Ready",
      status: "Approved",
      nextRaceId: "race-2",
      earnings: "315M",
      ranking: "#5",
      jockeyId: "jockey-2"
    },
    {
      id: "horse-3",
      ownerId: "owner-1",
      name: "Desert Comet",
      breed: "Arabian",
      age: 3,
      health: "Observation",
      status: "Pending approval",
      nextRaceId: "race-4",
      earnings: "95M",
      ranking: "#14",
      jockeyId: null
    }
  ],
  jockeys: [
    {
      id: "jockey-1",
      name: "Tran Bao Long",
      stable: "Elite Rider Squad",
      winRate: "61%",
      seasonWins: 18,
      availability: "Assigned",
      style: "Strong finish",
      fee: "35M"
    },
    {
      id: "jockey-2",
      name: "Ngo Gia Huy",
      stable: "Golden Saddle Club",
      winRate: "54%",
      seasonWins: 14,
      availability: "Available",
      style: "Balanced pace",
      fee: "28M"
    },
    {
      id: "jockey-3",
      name: "Phan Anh Kiet",
      stable: "Riverline Riders",
      winRate: "49%",
      seasonWins: 11,
      availability: "Available",
      style: "Early sprint",
      fee: "24M"
    }
  ],
  races: [
    {
      id: "race-1",
      ownerId: "owner-1",
      horseId: "horse-1",
      jockeyId: "jockey-1",
      refereeId: "referee-1",
      tournamentId: "tour-1",
      name: "Race 05 - Central Sprint",
      round: "Semi-final",
      date: "2026-06-03 15:30",
      track: "Central Track",
      distance: "1800m",
      ownerConfirmed: false,
      jockeyConfirmed: true,
      refereeStatus: "Pending horse verification",
      liveStatus: "Upcoming"
    },
    {
      id: "race-2",
      ownerId: "owner-1",
      horseId: "horse-2",
      jockeyId: "jockey-2",
      refereeId: "referee-1",
      tournamentId: "tour-1",
      name: "Race 06 - Bronze Cup",
      round: "Semi-final",
      date: "2026-06-04 10:00",
      track: "Central Track",
      distance: "2200m",
      ownerConfirmed: true,
      jockeyConfirmed: false,
      refereeStatus: "Checklist in progress",
      liveStatus: "Upcoming"
    },
    {
      id: "race-3",
      ownerId: "owner-2",
      horseId: "horse-4",
      jockeyId: "jockey-1",
      refereeId: "referee-1",
      tournamentId: "tour-1",
      name: "Race 03 - Copper Mile",
      round: "Quarter-final",
      date: "2026-05-26 14:00",
      track: "Central Track",
      distance: "1600m",
      ownerConfirmed: true,
      jockeyConfirmed: true,
      refereeStatus: "Live monitoring",
      liveStatus: "Live"
    },
    {
      id: "race-4",
      ownerId: "owner-1",
      horseId: "horse-3",
      jockeyId: null,
      refereeId: "referee-1",
      tournamentId: "tour-2",
      name: "Race 01 - Sunset Derby",
      round: "Registration",
      date: "2026-06-10 09:00",
      track: "Sunset Arena",
      distance: "1400m",
      ownerConfirmed: false,
      jockeyConfirmed: false,
      refereeStatus: "Not assigned",
      liveStatus: "Draft"
    }
  ],
  results: [
    {
      id: "result-1",
      raceId: "race-7",
      horse: "Thunder Echo",
      jockey: "Tran Bao Long",
      position: 1,
      reward: "180M",
      points: 30,
      publishStatus: "Published"
    },
    {
      id: "result-2",
      raceId: "race-8",
      horse: "Copper Blaze",
      jockey: "Ngo Gia Huy",
      position: 3,
      reward: "55M",
      points: 12,
      publishStatus: "Published"
    },
    {
      id: "result-3",
      raceId: "race-9",
      horse: "River Storm",
      jockey: "Tran Bao Long",
      position: 2,
      reward: "96M",
      points: 18,
      publishStatus: "Awaiting publish"
    }
  ],
  invitations: [
    {
      id: "invite-1",
      ownerId: "owner-1",
      jockeyId: "jockey-1",
      horseId: "horse-1",
      raceId: "race-1",
      offer: "35M",
      status: "Accepted"
    },
    {
      id: "invite-2",
      ownerId: "owner-1",
      jockeyId: "jockey-1",
      horseId: "horse-2",
      raceId: "race-2",
      offer: "32M",
      status: "Pending"
    },
    {
      id: "invite-3",
      ownerId: "owner-3",
      jockeyId: "jockey-1",
      horseId: "horse-5",
      raceId: "race-10",
      offer: "29M",
      status: "Pending"
    }
  ],
  refereeChecks: [
    {
      id: "check-1",
      refereeId: "referee-1",
      raceId: "race-1",
      horseCheck: true,
      jockeyCheck: false,
      trackCheck: true,
      note: "Horse fit, jockey weight-in pending"
    },
    {
      id: "check-2",
      refereeId: "referee-1",
      raceId: "race-2",
      horseCheck: true,
      jockeyCheck: true,
      trackCheck: false,
      note: "Track wet section needs recheck"
    }
  ],
  violations: [
    {
      id: "vio-1",
      refereeId: "referee-1",
      raceId: "race-3",
      minute: "02:14",
      title: "Late gate alignment",
      level: "Warning",
      action: "5M fine"
    },
    {
      id: "vio-2",
      refereeId: "referee-1",
      raceId: "race-8",
      minute: "01:42",
      title: "Lane obstruction",
      level: "Review",
      action: "Pending decision"
    }
  ],
  reports: [
    {
      id: "report-1",
      refereeId: "referee-1",
      raceId: "race-7",
      title: "Match report - Summer Cup race 07",
      status: "Awaiting sign-off"
    },
    {
      id: "report-2",
      refereeId: "referee-1",
      raceId: "race-8",
      title: "Violation summary - Bronze Cup",
      status: "Submitted"
    }
  ],
  tournaments: [
    {
      id: "tour-1",
      name: "Summer Cup 2026",
      location: "Ho Chi Minh City",
      range: "01 Jun - 12 Jun",
      status: "Live",
      prizePool: "3.2B",
      races: 12
    },
    {
      id: "tour-2",
      name: "Sunset Derby",
      location: "Da Nang",
      range: "10 Jun - 17 Jun",
      status: "Registration",
      prizePool: "1.8B",
      races: 8
    },
    {
      id: "tour-3",
      name: "Golden Saddle Classic",
      location: "Can Tho",
      range: "20 Jun - 29 Jun",
      status: "Planned",
      prizePool: "2.4B",
      races: 10
    }
  ],
  leaderboardHorses: [
    { id: "lb-h-1", name: "Thunder Echo", points: 86, stable: "Royal Stables" },
    { id: "lb-h-2", name: "Night Arrow", points: 80, stable: "Silver Hoof" },
    { id: "lb-h-3", name: "Copper Blaze", points: 72, stable: "Royal Stables" }
  ],
  leaderboardJockeys: [
    { id: "lb-j-1", name: "Tran Bao Long", points: 74, wins: 18 },
    { id: "lb-j-2", name: "Ngo Gia Huy", points: 61, wins: 14 },
    { id: "lb-j-3", name: "Le Minh Khoa", points: 57, wins: 12 }
  ],
  liveBoard: {
    raceId: "race-3",
    title: "Race 03 - Copper Mile",
    phase: "Lap 2 / 3",
    updatedAt: "Updated 30s ago",
    positions: [
      { position: 1, horse: "Thunder Echo", jockey: "Tran Bao Long", gap: "+0.0" },
      { position: 2, horse: "Night Arrow", jockey: "Le Minh Khoa", gap: "+0.4" },
      { position: 3, horse: "Copper Blaze", jockey: "Ngo Gia Huy", gap: "+0.8" },
      { position: 4, horse: "River Storm", jockey: "Pham Duc Huy", gap: "+1.5" }
    ]
  },
  predictions: [
    {
      id: "pred-1",
      spectatorId: "spectator-1",
      raceId: "race-3",
      horse: "Thunder Echo",
      odds: "2.4",
      status: "Open",
      reward: "-"
    },
    {
      id: "pred-2",
      spectatorId: "spectator-1",
      raceId: "race-7",
      horse: "Night Arrow",
      odds: "3.1",
      status: "Won",
      reward: "4.8M"
    },
    {
      id: "pred-3",
      spectatorId: "spectator-1",
      raceId: "race-8",
      horse: "Copper Blaze",
      odds: "2.9",
      status: "Lost",
      reward: "-"
    }
  ],
  rewards: [
    {
      id: "reward-1",
      spectatorId: "spectator-1",
      title: "Prediction reward for race 07",
      amount: "4.8M",
      status: "Ready to claim"
    },
    {
      id: "reward-2",
      spectatorId: "spectator-1",
      title: "Top predictor weekly bonus",
      amount: "1.5M",
      status: "Claimed"
    }
  ],
  approvals: [
    {
      id: "approval-1",
      type: "Horse registration",
      applicant: "Royal Stables / Desert Comet",
      requestedRole: "owner",
      status: "Pending"
    },
    {
      id: "approval-2",
      type: "Jockey profile",
      applicant: "Pham Duc Huy",
      requestedRole: "jockey",
      status: "Pending"
    },
    {
      id: "approval-3",
      type: "Tournament enrollment",
      applicant: "Golden River Farm",
      requestedRole: "owner",
      status: "Needs review"
    }
  ],
  users: [
    { id: "user-1", name: "Nguyen Minh Chau", role: "owner", status: "Active", lastSeen: "5 minutes ago" },
    { id: "user-2", name: "Tran Bao Long", role: "jockey", status: "Active", lastSeen: "2 minutes ago" },
    { id: "user-3", name: "Le Quoc Binh", role: "referee", status: "Active", lastSeen: "Just now" },
    { id: "user-4", name: "Pham Thanh Ha", role: "spectator", status: "Active", lastSeen: "1 hour ago" },
    { id: "user-5", name: "Hoang Gia Bao", role: "admin", status: "Active", lastSeen: "Just now" }
  ],
  assignments: [
    {
      id: "assign-1",
      race: "Race 05 - Central Sprint",
      referee: "Le Quoc Binh",
      jockey: "Tran Bao Long",
      horse: "Thunder Echo",
      status: "Assigned"
    },
    {
      id: "assign-2",
      race: "Race 06 - Bronze Cup",
      referee: "Le Quoc Binh",
      jockey: "Ngo Gia Huy",
      horse: "Copper Blaze",
      status: "Jockey pending"
    }
  ],
  publishQueue: [
    {
      id: "publish-1",
      race: "Race 09 - Silver Track",
      resultStatus: "Ready",
      predictionStatus: "Locked",
      publishStatus: "Pending publish"
    },
    {
      id: "publish-2",
      race: "Race 08 - Bronze Cup",
      resultStatus: "Referee confirmed",
      predictionStatus: "Calculated",
      publishStatus: "Published"
    }
  ],
  notifications: [
    {
      id: "noti-1",
      userId: "owner-1",
      tone: "warning",
      title: "Race 05 is waiting for owner confirmation",
      detail: "Thunder Echo needs confirmation before 18:00 today."
    },
    {
      id: "noti-2",
      userId: "jockey-1",
      tone: "info",
      title: "New invitation from Royal Stables",
      detail: "Copper Blaze invitation offer 32M is pending your response."
    },
    {
      id: "noti-3",
      userId: "referee-1",
      tone: "warning",
      title: "Track verification still open",
      detail: "Race 06 has one unresolved wet track note."
    },
    {
      id: "noti-4",
      userId: "spectator-1",
      tone: "success",
      title: "Prediction reward is ready to claim",
      detail: "Weekly bonus 1.5M has been added to your wallet."
    },
    {
      id: "noti-5",
      userId: "admin-1",
      tone: "warning",
      title: "Three approvals need review",
      detail: "Pending horse registration, jockey profile, and enrollment requests."
    }
  ]
};
