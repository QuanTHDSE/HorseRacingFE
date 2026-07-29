import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, NotificationBell, Panel, PointChangeNotifier } from "../components";
import { roleConfigs } from "../config/roleConfigs";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";
import { viTournamentStatus } from "../utils/viLabels";
import OwnerPages from "../pages/owner";
import JockeyPages from "../pages/jockey";
import RefereePages from "../pages/referee";
import SpectatorPages from "../pages/spectator";
import AdminPages from "../pages/admin";
import AccountPage from "../pages/AccountPage";
import type { Role } from "../types";

interface RolePagesProps {
  role: Role;
  page: string;
}

function formatSidebarDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function RolePages({ role, page }: RolePagesProps) {
  if (page === "account") return <AccountPage />;

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
  const { user, appState, handleLogout, handleSyncPointWallet, isDataLoading } = useApp();
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
  const featuredTournaments = (
    appState.featuredTournaments.length > 0
      ? appState.featuredTournaments
      : appState.tournaments.filter((tournament) => ["Live", "Registration"].includes(tournament.status))
  )
    .slice()
    .sort((a, b) => {
      if (a.status === "Live" && b.status !== "Live") return -1;
      if (a.status !== "Live" && b.status === "Live") return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    })
    .slice(0, 3);

  return (
    <div className={cn("dashboard-layout", collapsed && "sidebar-collapsed")}>
      <aside className="sidebar">

        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        >
          <span className="toggle-icon">{collapsed ? "›" : "‹"}</span>
          {!collapsed && <span className="toggle-label">Thu gọn</span>}
        </button>

        <div className="brand-block">
          <div className="brand-mark">RT</div>
          {!collapsed && (
            <div>
              <p className="kicker">Quản lý</p>
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
            title={collapsed ? "Đăng xuất" : undefined}
          >
            {collapsed ? "↩" : "Đăng xuất"}
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
            <PointChangeNotifier
              userId={user.id}
              role={user.role}
              onPointsChange={handleSyncPointWallet}
            />
            <NotificationBell notifications={notifications} />
          </div>
        </header>

        <div className="workspace-grid">
          <main className="workspace-main">
            <RolePages role={user.role} page={activePage} />
          </main>

          <aside className="workspace-side">
            <Panel title="Giải đấu nổi bật" subtitle="Giải đang diễn ra và các cuộc đua sắp tới">
              <div className="compact-list">
                {featuredTournaments.map((t) => (
                  <article key={t.id} className="compact-row">
                    <div>
                      <strong>{t.name}</strong>
                      <p>{t.location} • {formatSidebarDate(t.startDate)} – {formatSidebarDate(t.endDate)}</p>
                    </div>
                    <Badge tone={t.status === "Live" ? "success" : "accent"}>{viTournamentStatus(t.status)}</Badge>
                  </article>
                ))}
                {featuredTournaments.length === 0 && (
                  <p className="compact-empty-state" role="status">
                    {isDataLoading ? "Đang tải giải đấu…" : "Chưa có giải đấu đang diễn ra hoặc sắp tới."}
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Bảng xếp hạng nhanh" subtitle="Ngựa và nài xuất sắc mùa này">
              <div className="rank-stack">
                <div>
                  <p className="mini-title">Ngựa dẫn đầu</p>
                  {appState.leaderboardHorses.map((item, i) => (
                    <div key={item.id} className="compact-rank">
                      <span>{i + 1}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.stable}</p>
                      </div>
                      <b>{item.points} thắng</b>
                    </div>
                  ))}
                  {appState.leaderboardHorses.length === 0 && (
                    <p className="compact-empty-state" role="status">
                      {isDataLoading ? "Đang tải xếp hạng…" : "Chưa có kết quả ngựa đã công bố."}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mini-title">Nài ngựa dẫn đầu</p>
                  {appState.leaderboardJockeys.map((item, i) => (
                    <div key={item.id} className="compact-rank">
                      <span>{i + 1}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.wins} thắng • {item.winRate}% • {item.totalRaces} cuộc</p>
                      </div>
                      <b>{item.wins} thắng</b>
                    </div>
                  ))}
                  {appState.leaderboardJockeys.length === 0 && (
                    <p className="compact-empty-state" role="status">
                      {isDataLoading ? "Đang tải xếp hạng…" : "Chưa có kết quả nài ngựa đã công bố."}
                    </p>
                  )}
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
