import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function AdminTournamentsPage() {
  const { appState } = useApp();

  return (
    <div className="page-stack">
      <Panel title="Tournament, race, and round management" subtitle="Consolidated tournament info and assignments">
        <div className="card-grid three">
          {appState.tournaments.map((t) => (
            <article key={t.id} className="feature-card">
              <div className="card-head">
                <strong>{t.name}</strong>
                <Badge tone={t.status === "Live" ? "success" : "neutral"}>{t.status}</Badge>
              </div>
              <p>{t.location}</p>
              <span>{t.races} races • {t.prizePool}</span>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Personnel assignments" subtitle="Track horses, jockeys, and referees per race">
        <DataTable
          columns={[
            { key: "race", label: "Race" },
            { key: "horse", label: "Horse" },
            { key: "jockey", label: "Jockey" },
            { key: "referee", label: "Referee" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Assigned" ? "success" : "warning"}>{row.status}</Badge>
              )
            }
          ]}
          rows={appState.assignments}
        />
      </Panel>
    </div>
  );
}
