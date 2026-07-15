import { Badge, DataTable, MetricCard, Panel, RaceLeaderboard } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
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
  return `Hạng ${rank}`;
}

export default function PerformancePage() {
  const { appState, user } = useApp();
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
          label="Cuộc đua đã xong"
          value={String(completed.length)}
          note="Tổng lượt đã hoàn thành"
        />
        <MetricCard
          label="Chiến thắng"
          value={String(wins)}
          note="Số lần về nhất"
          tone="success"
        />
        <MetricCard
          label="Vào top 3"
          value={String(podiums)}
          note="Về trong top 3"
          tone="accent"
        />
        <MetricCard
          label="Tỷ lệ thắng"
          value={withResult.length > 0 ? `${winRate}%` : "—"}
          note="Từ kết quả đã công bố"
          tone="info"
        />
      </div>

      <Panel title="Kết quả thi đấu" subtitle="Lịch sử cá nhân từ các cuộc đua đã hoàn thành">
        {resultRows.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa có cuộc đua nào hoàn thành.</p>
        )}
        <DataTable
          columns={[
            { key: "name",       label: "Cuộc đua" },
            { key: "horse",      label: "Ngựa"     },
            { key: "tournament", label: "Giải đấu" },
            { key: "date",       label: "Ngày"     },
            {
              key: "position",
              label: "Về đích",
              render: (row) => {
                const rank = (row as typeof resultRows[number])._rank;
                const tone = rank === 1 ? "success" : rank === 2 ? "accent" : rank === 3 ? "info" : "neutral";
                return <Badge tone={tone as any}>{row.position as string}</Badge>;
              },
            },
            { key: "time",  label: "Thời gian"    },
            { key: "prize", label: "Giải thưởng"  },
          ]}
          rows={resultRows}
        />
      </Panel>

      {completed.length > 0 && (
        <Panel title="Bảng xếp hạng đầy đủ" subtitle="Kết quả chính thức từng cuộc đua — lượt của bạn được tô sáng">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {completed.map((r) => (
              <RaceLeaderboard key={r.id} raceId={r.id} highlightJockeyId={user?.id} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
