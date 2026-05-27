import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function JockeySchedulePage() {
  const { user, appState } = useApp();
  if (!user) return null;
  const assignedRaces = appState.races.filter((r) => r.jockeyId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Personal race schedule" subtitle="All upcoming and live races">
        <div className="timeline-list">
          {assignedRaces.map((race) => (
            <article key={race.id} className="timeline-item">
              <div className="timeline-dot"></div>
              <div>
                <strong>{race.name}</strong>
                <p>{race.date} • {race.track} • {race.distance}</p>
              </div>
              <Badge tone={race.liveStatus === "Live" ? "success" : "neutral"}>{race.liveStatus}</Badge>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
