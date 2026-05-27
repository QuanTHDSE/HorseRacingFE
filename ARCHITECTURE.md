# HorseRacing — Kiến trúc dự án

## Tổng quan

React SPA xây dựng với Vite, tổ chức theo cấu trúc phân tầng lấy cảm hứng từ **Node.js workflow**: tách biệt data, business logic (context), layout, và page views.

---

## Cấu trúc thư mục

```
src/
├── config/
│   └── roleConfigs.js       # Role labels, menus, accent text
├── data/
│   └── mockData.js          # initialAccounts + initialAppState
├── utils/
│   ├── storage.js           # localStorage helpers + storage keys
│   └── cn.js                # className utility
├── components/
│   ├── Badge.jsx
│   ├── Panel.jsx
│   ├── MetricCard.jsx
│   ├── DataTable.jsx
│   └── index.js             # Barrel export
├── context/
│   └── AppContext.jsx       # Global state + all action handlers
├── layouts/
│   ├── AuthScreen.jsx       # Login / Register layout
│   └── AppShell.jsx         # Dashboard shell (sidebar, topbar, notifications)
├── pages/
│   ├── owner/
│   │   ├── index.jsx        # Page router cho role owner
│   │   ├── Dashboard.jsx
│   │   ├── HorsesPage.jsx
│   │   ├── JockeysPage.jsx
│   │   ├── SchedulePage.jsx
│   │   └── ResultsPage.jsx
│   ├── jockey/
│   │   ├── index.jsx
│   │   ├── Dashboard.jsx
│   │   ├── InvitationsPage.jsx
│   │   ├── AssignedPage.jsx
│   │   ├── SchedulePage.jsx
│   │   └── PerformancePage.jsx
│   ├── referee/
│   │   ├── index.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ChecksPage.jsx
│   │   ├── MonitorPage.jsx
│   │   ├── ViolationsPage.jsx
│   │   └── ReportsPage.jsx
│   ├── spectator/
│   │   ├── index.jsx
│   │   ├── Dashboard.jsx
│   │   ├── TournamentsPage.jsx
│   │   ├── LivePage.jsx
│   │   ├── PredictionsPage.jsx
│   │   └── RewardsPage.jsx
│   └── admin/
│       ├── index.jsx
│       ├── Dashboard.jsx
│       ├── UsersPage.jsx
│       ├── TournamentsPage.jsx
│       ├── ApprovalsPage.jsx
│       └── ResultsPage.jsx
├── App.jsx                  # Root component (thin orchestrator)
├── main.jsx                 # Entry point
└── styles.css               # Global styles
```

---

## So sánh với Node.js workflow

| Node.js layer | React equivalent | Vai trò |
|---|---|---|
| `config/` | `src/config/` | Role configs, constants |
| `models/` | `src/data/` | Mock data, data shapes |
| `middleware/` | `src/context/AppContext.jsx` | Shared state, side effects, auth guard |
| `controllers/` | handlers trong `AppContext.jsx` | Business logic (handleAction, login, register) |
| `routes/` | `src/pages/*/index.jsx` | Page dispatcher theo role |
| `views/` | `src/pages/*/*.jsx` | UI pages |
| `utils/` | `src/utils/` | Pure utility functions |

---

## Data flow

```
src/data/mockData.js
        │  initialAccounts, initialAppState
        ▼
src/context/AppContext.jsx
        │  useState, useEffect, handlers
        │  Provides: user, appState, activePage, authState, onAction...
        ▼
src/App.jsx
        │  Chọn AuthScreen hoặc AppShell dựa trên session
        ▼
src/layouts/AuthScreen.jsx      src/layouts/AppShell.jsx
        │                               │
        │                               ▼
        │                   src/pages/[role]/index.jsx
        │                               │
        │                               ▼
        │                   src/pages/[role]/XxxPage.jsx
        │                               │
        └───────────────────────────────▼
                        src/components/
                        Badge, Panel, MetricCard, DataTable
```

---

## Roles & pages

| Role | Pages |
|---|---|
| `owner` | dashboard, horses, jockeys, schedule, results |
| `jockey` | dashboard, invitations, assigned, schedule, performance |
| `referee` | dashboard, checks, monitor, violations, reports |
| `spectator` | dashboard, tournaments, live, predictions, rewards |
| `admin` | dashboard, users, tournaments, approvals, results |

---

## State management

Tất cả state toàn cục được quản lý tại `AppContext`. Mỗi page component đọc state qua hook `useApp()`:

```jsx
import { useApp } from "../../context/AppContext";

export default function HorsesPage() {
  const { user, appState, onAction } = useApp();
  const ownedHorses = appState.horses.filter(h => h.ownerId === user.id);
  // ...
}
```

Không có prop drilling — mọi component đều truy cập trực tiếp context.

---

## Persistent storage

| Key | Nội dung |
|---|---|
| `horse-racing-session` | `{ userId }` — session hiện tại |
| `horse-racing-state` | `initialAppState` — toàn bộ app state |
| `horse-racing-accounts` | `initialAccounts` — danh sách tài khoản |
