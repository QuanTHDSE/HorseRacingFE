import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrize(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M`;
  return String(n);
}

function fmtTime(ms?: number): string {
  if (!ms) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

function rankLabel(rank?: number): string {
  if (!rank) return "—";
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

export default function PerformancePage() {
  const { appState } = useApp();
  const allRaces     = appState.races;
  const completed    = allRaces.filter((r) => r.liveStatus === "Completed");
  const withResult   = completed.filter((r) => r.result?.rank !== undefined);
  const wins         = withResult.filter((r) => r.result!.rank === 1).length;
  const podiums      = withResult.filter((r) => r.result!.rank! <= 3).length;
  const winRate      = withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : 0;

  const resultRows = completed.map((r) => ({
    id: r.id,
    name: r.name,
    horse: r.horseName ?? "—",
    tournament: r.tournamentName ?? r.track,
    date: fmtDate(r.date),
    position: rankLabel(r.result?.rank),
    time: fmtTime(r.result?.finishTime),
    prize: fmtPrize(r.result?.prize),
    _rank: r.result?.rank,
  }));

  return (
    <div className="page-stack">
      <div className="metric-grid four">
        <MetricCard
          label="Completed races"
          value={String(completed.length)}
          note="All finished starts"
        />
        <MetricCard
          label="Wins"
          value={String(wins)}
          note="1st place finishes"
          tone="success"
        />
        <MetricCard
          label="Podiums"
          value={String(podiums)}
          note="Top 3 finishes"
          tone="accent"
        />
        <MetricCard
          label="Win rate"
          value={withResult.length > 0 ? `${winRate}%` : "—"}
          note="From published results"
          tone="info"
        />
      </div>

      <Panel title="Race results" subtitle="Personal history from completed races">
        {resultRows.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No completed races yet.</p>
        )}
        <DataTable
          columns={[
            { key: "name",       label: "Race"       },
            { key: "horse",      label: "Horse"      },
            { key: "tournament", label: "Tournament" },
            { key: "date",       label: "Date"       },
            {
              key: "position",
              label: "Finish",
              render: (row) => {
                const rank = (row as typeof resultRows[number])._rank;
                const tone = rank === 1 ? "success" : rank === 2 ? "accent" : rank === 3 ? "info" : "neutral";
                return <Badge tone={tone as any}>{row.position as string}</Badge>;
              },
            },
            { key: "time",  label: "Time"  },
            { key: "prize", label: "Prize" },
          ]}
          rows={resultRows}
        />
      </Panel>
    </div>
  );
}
