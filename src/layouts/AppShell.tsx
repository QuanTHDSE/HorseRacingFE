import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, NotificationBell, Panel } from "../components";
import { roleConfigs } from "../config/roleConfigs";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";
import OwnerPages from "../pages/owner";
import JockeyPages from "../pages/jockey";
import RefereePages from "../pages/referee";
import SpectatorPages from "../pages/spectator";
import AdminPages from "../pages/admin";
import type { Role } from "../types";

interface RolePagesProps {
  role: Role;
  page: string;
}

function RolePages({ role, page }: RolePagesProps) {
  switch (role) {
    case "owner":     return <OwnerPages     page={page} />;
    case "jockey":    return <JockeyPages    page={page} />;
    case "referee":   return <RefereePages   page={page} />;
    case "spectator": return <SpectatorPages page={page} />;
    case "admin":     return <AdminPages     page={page} />;
  }
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, appState, handleLogout } = useApp();
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();

  if (!user) return null;

  const role = roleConfigs[user.role];
  const validPage = role.menu.some((m) => m.id === page);
  const activePage = validPage ? (page as string) : role.menu[0].id;

  useEffect(() => {
    if (!validPage) navigate("/" + role.menu[0].id, { replace: true });
  }, [validPage, role, navigate]);

  const notifications = appState.notifications.filter((n) => n.userId === user.id);

  return (
    <div className={cn("dashboard-layout", collapsed && "sidebar-collapsed")}>
      <aside className="sidebar">

        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="toggle-icon">{collapsed ? "›" : "‹"}</span>
          {!collapsed && <span className="toggle-label">Collapse</span>}
        </button>

        <div className="brand-block">
          <div className="brand-mark">RT</div>
          {!collapsed && (
            <div>
              <p className="kicker">Management</p>
              <h1>RacetrackVN</h1>
            </div>
          )}
        </div>

        <div className="user-card">
          <div className="user-badge">{user.badge}</div>
          {!collapsed && (
            <div>
              <strong>{user.name}</strong>
              <p>{role.label}</p>
              <span>{user.organization}</span>
            </div>
          )}
        </div>

        <nav className="side-menu">
          {role.menu.map((item) => (
            <button
              key={item.id}
              className={cn("menu-item", item.id === activePage && "is-active")}
              type="button"
              onClick={() => navigate("/" + item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="menu-abbr">{item.abbr}</span>
              {!collapsed && <span className="menu-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="ghost-button full-width"
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Sign Out" : undefined}
          >
            {collapsed ? "↩" : "Sign Out"}
          </button>
        </div>

      </aside>

      <div className="workspace-shell">
        <header className="topbar">
          <div>
            <p className="kicker">{role.label}</p>
            <h2>{role.accent}</h2>
          </div>
          <div className="topbar-actions">
            <Badge tone="accent">{role.menu.find((item) => item.id === activePage)?.label}</Badge>
            <Badge tone="neutral">Active session</Badge>
            <NotificationBell notifications={notifications} />
          </div>
        </header>

        <div className="workspace-grid">
          <main className="workspace-main">
            <RolePages role={user.role} page={activePage} />
          </main>

          <aside className="workspace-side">
            <Panel title="Featured Tournaments" subtitle="Active tournaments and upcoming races">
              <div className="compact-list">
                {appState.tournaments.map((t) => (
                  <article key={t.id} className="compact-row">
                    <div>
                      <strong>{t.name}</strong>
                      <p>{t.location} • {t.range}</p>
                    </div>
                    <Badge tone={t.status === "Live" ? "success" : "neutral"}>{t.status}</Badge>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Quick Leaderboard" subtitle="Top horses and jockeys this season">
              <div className="rank-stack">
                <div>
                  <p className="mini-title">Top horses</p>
                  {appState.leaderboardHorses.map((item, i) => (
                    <div key={item.id} className="compact-rank">
                      <span>{i + 1}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.stable}</p>
                      </div>
                      <b>{item.points}</b>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mini-title">Top jockeys</p>
                  {appState.leaderboardJockeys.map((item, i) => (
                    <div key={item.id} className="compact-rank">
                      <span>{i + 1}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.wins} wins</p>
                      </div>
                      <b>{item.points}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
