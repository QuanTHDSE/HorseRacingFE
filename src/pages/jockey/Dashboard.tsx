import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function JockeyDashboard() {
  const { user, appState } = useApp();
  if (!user) return null;
  const jockeyInvites  = appState.invitations.filter((inv) => inv.jockeyId === user.id);
  const assignedRaces  = appState.races.filter((r) => r.jockeyId === user.id);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Jockey dashboard</Badge>
          <h3>One screen to handle invitations, assigned races, and personal performance</h3>
          <p>All critical tasks are surfaced at the top so jockeys don't miss an upcoming race.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard
          label="Unanswered invitations"
          value={String(jockeyInvites.filter((i) => i.status === "Pending").length)}
          note="Needs to be handled soon"
          tone="warning"
        />
        <MetricCard label="Accepted races" value={String(assignedRaces.length)} note="Includes live and upcoming" />
        <MetricCard label="Current ranking" value="#4" note="Personal top — 2026 season" tone="success" />
      </div>

      <div className="content-grid two">
        <Panel title="Priority inbox" subtitle="New invitations need a response">
          <div className="card-list">
            {jockeyInvites.map((invite) => (
              <article key={invite.id} className="info-card">
                <div className="card-head">
                  <strong>{appState.races.find((r) => r.id === invite.raceId)?.name ?? invite.raceId}</strong>
                  <Badge tone={invite.status === "Accepted" ? "success" : invite.status === "Declined" ? "danger" : "warning"}>
                    {invite.status}
                  </Badge>
                </div>
                <p>{appState.horses.find((h) => h.id === invite.horseId)?.name ?? invite.horseId}</p>
                <span>Offer {invite.offer}</span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Assigned races" subtitle="Horse and race schedule overview">
          <div className="card-list">
            {assignedRaces.map((race) => (
              <article key={race.id} className="info-card">
                <div className="card-head">
                  <strong>{race.name}</strong>
                  <Badge tone={race.liveStatus === "Live" ? "success" : "neutral"}>{race.liveStatus}</Badge>
                </div>
                <p>{race.date}</p>
                <span>{race.track}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
