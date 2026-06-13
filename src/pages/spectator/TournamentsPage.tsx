import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_TONE: Record<string, string> = {
  published: "accent",
  ongoing:   "success",
  completed: "neutral",
  draft:     "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Registration",
  ongoing:   "Live",
  completed: "Completed",
  draft:     "Draft",
};

export default function TournamentsPage() {
  const { appState } = useApp();
  const tournaments = appState.tournaments;

  const live       = tournaments.filter((t) => t.status === "Live");
  const open       = tournaments.filter((t) => t.status === "Registration");
  const completed  = tournaments.filter((t) => t.status === "Completed");

  function renderCard(t: (typeof tournaments)[0]) {
    const apiStatus = t.status === "Live" ? "ongoing"
      : t.status === "Registration" ? "published"
      : t.status === "Completed" ? "completed"
      : "draft";
    return (
      <article key={t.id} className="feature-card">
        <div className="card-head">
          <strong>{t.name}</strong>
          <Badge tone={STATUS_TONE[apiStatus] as any ?? "neutral"}>
            {STATUS_LABEL[apiStatus] ?? t.status}
          </Badge>
        </div>
        {t.location && (
          <p style={{ margin: "6px 0 4px", fontSize: "0.875rem" }}>
            📍 {t.location}
          </p>
        )}
        <p style={{ margin: "2px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {fmtDate(t.startDate)} — {fmtDate(t.endDate)}
        </p>
        {t.prizePool && (
          <p style={{ margin: "6px 0 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--accent)" }}>
            Prize pool: {Number(t.prizePool).toLocaleString()} pts
          </p>
        )}
      </article>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="page-stack">
        <Panel title="Tournaments" subtitle="No tournaments available at the moment">
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Check back later for upcoming events.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {live.length > 0 && (
        <Panel
          title="Live now"
          subtitle={`${live.length} tournament${live.length > 1 ? "s" : ""} in progress`}
          action={<Badge tone="success">Live</Badge>}
        >
          <div className="card-grid three">
            {live.map(renderCard)}
          </div>
        </Panel>
      )}

      {open.length > 0 && (
        <Panel
          title="Open registration"
          subtitle="Tournaments currently accepting entries"
        >
          <div className="card-grid three">
            {open.map(renderCard)}
          </div>
        </Panel>
      )}

      {completed.length > 0 && (
        <Panel
          title="Completed"
          subtitle="Past tournaments"
        >
          <div className="card-grid three">
            {completed.map(renderCard)}
          </div>
        </Panel>
      )}

      {live.length === 0 && open.length === 0 && (
        <Panel title="All tournaments" subtitle={`${tournaments.length} tournaments`}>
          <div className="card-grid three">
            {tournaments.map(renderCard)}
          </div>
        </Panel>
      )}
    </div>
  );
}
