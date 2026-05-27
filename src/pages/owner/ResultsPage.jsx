import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function OwnerResultsPage() {
  const { user, appState } = useApp();
  const ownedHorses = appState.horses.filter((h) => h.ownerId === user.id);
  const ownerResults = appState.results.filter((r) => ownedHorses.some((h) => h.name === r.horse));

  return (
    <div className="page-stack">
      <div className="metric-grid three">
        <MetricCard label="Total rewards this season" value="830M" note="Aggregated from all published races" tone="success" />
        <MetricCard label="Best horse ranking" value="#2" note="Thunder Echo is leading the stable" tone="accent" />
        <MetricCard label="Completed races" value={String(ownerResults.length)} note="Results announced and rewards published" />
      </div>
      <Panel title="Results, rankings, and rewards" subtitle="Track performance of all horses in the stable">
        <DataTable
          columns={[
            { key: "horse", label: "Horse" },
            { key: "position", label: "Position" },
            { key: "reward", label: "Reward" },
            { key: "points", label: "Points" },
            {
              key: "publishStatus",
              label: "Published",
              render: (row) => (
                <Badge tone={row.publishStatus === "Published" ? "success" : "warning"}>{row.publishStatus}</Badge>
              )
            }
          ]}
          rows={ownerResults}
        />
      </Panel>
    </div>
  );
}
