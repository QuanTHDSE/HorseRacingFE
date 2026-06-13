import { useEffect, useState } from "react";
import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { JockeyDashboard } from "../../types";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function JockeyDashboardPage() {
  const { user, appState, handleGetJockeyDashboard } = useApp();
  const [stats, setStats] = useState<JockeyDashboard | null>(null);

  useEffect(() => {
    handleGetJockeyDashboard()
      .then(setStats)
      .catch(() => null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const pendingInvites  = stats?.pendingInvitations ?? appState.invitations.filter((i) => i.status === "Pending").length;
  const upcomingRaces   = stats?.upcomingRaces      ?? appState.races.filter((r) => r.liveStatus === "Upcoming").length;
  const completedRaces  = stats?.completedRaces     ?? appState.races.filter((r) => r.liveStatus === "Completed").length;

  const recentInvites = appState.invitations.slice(0, 5);
  const recentRaces   = appState.races.filter((r) => r.liveStatus !== "Completed").slice(0, 5);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Jockey dashboard</Badge>
          <h3>Welcome back, {user.name}</h3>
          <p>Track your invitations, upcoming races, and personal performance.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard
          label="Pending invitations"
          value={String(pendingInvites)}
          note="Needs a response"
          tone="warning"
        />
        <MetricCard
          label="Upcoming races"
          value={String(upcomingRaces)}
          note="Scheduled &amp; live"
          tone="accent"
        />
        <MetricCard
          label="Completed races"
          value={String(completedRaces)}
          note="All-time finished"
          tone="success"
        />
      </div>

      <div className="content-grid two">
        <Panel title="Recent invitations" subtitle="Latest ride invitations">
          <div className="card-list">
            {recentInvites.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No invitations yet.</p>
            )}
            {recentInvites.map((inv) => (
              <article key={inv.id} className="info-card">
                <div className="card-head">
                  <strong>{inv.raceName ?? inv.raceId}</strong>
                  <Badge tone={inv.status === "Accepted" ? "success" : inv.status === "Declined" ? "danger" : "warning"}>
                    {inv.status}
                  </Badge>
                </div>
                <p style={{ margin: "4px 0 2px" }}>
                  Horse: <strong>{inv.horseName ?? inv.horseId}</strong>
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {inv.ownerName ? `Owner: ${inv.ownerName}` : ""}{inv.raceDate ? ` · ${fmtDate(inv.raceDate)}` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Upcoming races" subtitle="Your next scheduled starts">
          <div className="card-list">
            {recentRaces.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No upcoming races.</p>
            )}
            {recentRaces.map((race) => (
              <article key={race.id} className="info-card">
                <div className="card-head">
                  <strong>{race.name}</strong>
                  <Badge tone={race.liveStatus === "Live" ? "success" : "neutral"}>{race.liveStatus}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px" }}>
                  Horse: <strong>{race.horseName ?? "—"}</strong>
                  {race.laneNumber !== undefined ? <span> · Lane {race.laneNumber}</span> : null}
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
