import { DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function PerformancePage() {
  const { user, appState } = useApp();
  if (!user) return null;
  const myResults = appState.results.filter((r) => r.jockey === user.name);

  return (
    <div className="page-stack">
      <div className="metric-grid three">
        <MetricCard label="Current ranking" value="#4"  note="Jockey leaderboard — 2026 season" tone="accent"  />
        <MetricCard label="Win rate"        value="61%" note="Updated from published results"    tone="success" />
        <MetricCard label="Podiums"         value="27"  note="Total top-3 finishes over the last 2 seasons"    />
      </div>
      <Panel title="Personal results" subtitle="Racing history and jockey performance">
        <DataTable
          columns={[
            { key: "horse",    label: "Horse"    },
            { key: "position", label: "Position" },
            { key: "reward",   label: "Reward"   },
            { key: "points",   label: "Points"   },
          ]}
          rows={myResults}
        />
      </Panel>
    </div>
  );
}
