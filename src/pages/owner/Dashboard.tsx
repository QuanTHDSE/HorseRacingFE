import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function OwnerDashboard() {
  const { user, appState } = useApp();
  if (!user) return null;
  const ownedHorses = appState.horses.filter((h) => h.ownerId === user.id);
  const ownerHorseIds = new Set(ownedHorses.map((h) => h.id));
  const ownerRaces = appState.races.filter((r) => r.ownerId === user.id || ownerHorseIds.has(r.horseId));

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Owner dashboard</Badge>
          <h3>One place to manage horses, race schedules, jockeys, and rewards</h3>
          <p>
            This dashboard surfaces the key tasks an owner needs to complete first: confirm races, track horse profiles,
            check jockeys, and view the latest results.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button">Register new horse</button>
          <button className="secondary-button" type="button">Open race schedule</button>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard label="Horses under management" value={String(ownedHorses.length)} note="2 approved, 1 pending approval" />
        <MetricCard
          label="Races awaiting confirmation"
          value={String(ownerRaces.filter((r) => !r.ownerConfirmed).length)}
          note="Needs to be handled before today's deadline"
          tone="warning"
        />
        <MetricCard label="Rewards this season" value="830M" note="Updated after each published result" tone="success" />
      </div>

      <div className="content-grid two">
        <Panel title="Priority horses" subtitle="Focus on readiness and upcoming race schedule">
          <div className="card-list">
            {ownedHorses.map((horse) => (
              <article key={horse.id} className="info-card">
                <div className="card-head">
                  <strong>{horse.name}</strong>
                  <Badge tone={horse.status === "Approved" ? "success" : "warning"}>{horse.status}</Badge>
                </div>
                <p>{horse.breed} • {horse.age} yrs old • {horse.health}</p>
                <span>Ranking {horse.ranking} • Earnings {horse.earnings}</span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Upcoming races" subtitle="Changes confirmed directly on the table">
          <div className="card-list">
            {ownerRaces.map((race) => (
              <article key={race.id} className="info-card">
                <div className="card-head">
                  <strong>{race.name}</strong>
                  <Badge tone={race.ownerConfirmed ? "success" : "warning"}>
                    {race.ownerConfirmed ? "Confirmed" : "Needs confirmation"}
                  </Badge>
                </div>
                <p>{race.date} • {race.track}</p>
                <span>{race.distance}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
