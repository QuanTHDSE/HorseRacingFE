import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function TournamentsPage() {
  const { appState } = useApp();

  return (
    <div className="page-stack">
      <Panel title="Tournaments and race schedule" subtitle="Browse live, open registration, and upcoming tournaments">
        <div className="card-grid three">
          {appState.tournaments.map((t) => (
            <article key={t.id} className="feature-card">
              <div className="card-head">
                <strong>{t.name}</strong>
                <Badge tone={t.status === "Live" ? "success" : "neutral"}>{t.status}</Badge>
              </div>
              <p>{t.location} • {t.range}</p>
              <span>{t.prizePool} prize pool</span>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
