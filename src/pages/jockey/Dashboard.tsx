import { useEffect, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { JockeyDashboard } from "../../types";
import { viInvitationStatus, viRaceStatus } from "../../utils/viLabels";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function JockeyDashboardPage() {
  const { user, appState, isDataLoading, handleGetJockeyDashboard } = useApp();
  const [stats, setStats] = useState<JockeyDashboard | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    handleGetJockeyDashboard()
      .then((res) => alive && setStats(res))
      .catch(() => null)
      .finally(() => alive && setStatsLoading(false));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The metrics fall back to `appState`, so they are only unknown while both
  // the dashboard call and the shared fetch are still running.
  const metricsLoading = statsLoading && isDataLoading;

  if (!user) return null;

  const pendingInvites  = stats?.pendingInvitations ?? appState.invitations.filter((i) => i.status === "Pending").length;
  const upcomingRaces   = stats?.upcomingRaces      ?? appState.races.filter((r) => ["Upcoming", "Ready", "Live"].includes(r.liveStatus)).length;
  const completedRaces  = stats?.completedRaces     ?? appState.races.filter((r) => r.liveStatus === "Completed").length;
  const pointBalance = appState.spectatorPoints?.currentBalance ?? 0;

  const recentInvites = appState.invitations.slice(0, 5);
  const recentRaces   = appState.races.filter((r) => r.liveStatus !== "Completed").slice(0, 5);

  return (
    <div className="page-stack">
      <SuspensionBanner />
      <section className="hero-card">
        <div>
          <Badge tone="accent">Tổng quan Nài ngựa</Badge>
          <h3>Chào mừng trở lại, {user.name}</h3>
          <p>Theo dõi lời mời, các cuộc đua sắp tới và thành tích cá nhân.</p>
        </div>
      </section>

      <div className="metric-grid four">
        <MetricCard
          label="Lời mời chờ phản hồi"
          value={String(pendingInvites)}
          note="Cần phản hồi"
          tone="warning"
          loading={metricsLoading}
        />
        <MetricCard
          label="Cuộc đua sắp tới"
          value={String(upcomingRaces)}
          note="Đã lên lịch &amp; đang diễn ra"
          tone="accent"
          loading={metricsLoading}
        />
        <MetricCard
          label="Cuộc đua đã xong"
          value={String(completedRaces)}
          note="Tổng đã hoàn thành"
          tone="success"
          loading={metricsLoading}
        />
        <MetricCard
          label="Số dư ví điểm"
          value={pointBalance.toLocaleString("vi-VN")}
          note="Thưởng từ thành tích cuộc đua"
          tone="success"
          loading={isDataLoading && !appState.spectatorPoints}
        />
      </div>

      <div className="content-grid two">
        <Panel title="Lời mời gần đây" subtitle="Các lời mời cưỡi ngựa mới nhất">
          <div className="card-list">
            {isDataLoading && recentInvites.length === 0 && <LoadingState label="Đang tải lời mời…" />}
            {!isDataLoading && recentInvites.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa có lời mời nào.</p>
            )}
            {recentInvites.map((inv) => (
              <article key={inv.id} className="info-card">
                <div className="card-head">
                  <strong>{inv.raceName ?? inv.raceId}</strong>
                  <Badge tone={inv.status === "Accepted" ? "success" : inv.status === "Declined" ? "danger" : "warning"}>
                    {viInvitationStatus(inv.status)}
                  </Badge>
                </div>
                <p style={{ margin: "4px 0 2px" }}>
                  Ngựa: <strong>{inv.horseName ?? inv.horseId}</strong>
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {inv.ownerName ? `Chủ ngựa: ${inv.ownerName}` : ""}{inv.raceDate ? ` · ${fmtDate(inv.raceDate)}` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Cuộc đua sắp tới" subtitle="Các lượt xuất phát tiếp theo của bạn">
          <div className="card-list">
            {isDataLoading && recentRaces.length === 0 && <LoadingState label="Đang tải lịch đua…" />}
            {!isDataLoading && recentRaces.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Không có cuộc đua sắp tới.</p>
            )}
            {recentRaces.map((race) => (
              <article key={race.id} className="info-card">
                <div className="card-head">
                  <strong>{race.name}</strong>
                  <Badge tone={race.liveStatus === "Live" ? "success" : race.liveStatus === "Ready" ? "warning" : "neutral"}>{viRaceStatus(race.liveStatus)}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px" }}>
                  Ngựa: <strong>{race.horseName ?? "—"}</strong>
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {fmtDate(race.date)}{race.distance ? ` · ${race.distance}` : ""}
                  {race.tournamentName ? ` · ${race.tournamentName}` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
