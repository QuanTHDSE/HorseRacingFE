import { Badge, DataTable, MetricCard, Panel, RaceLeaderboard } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OwnerResultsPage() {
  const { appState } = useApp();

  const horses = appState.horses;
  const regs   = appState.ownerRegistrations;

  // Cross-reference approved registrations with completed races in appState.races
  const completedRegs = regs.filter((reg) => {
    const race = appState.races.find((r) => r.id === reg.raceId);
    return reg.status === "Approved" && race?.liveStatus === "Completed";
  });

  const totalApproved  = regs.filter((r) => r.status === "Approved").length;
  const totalCompleted = completedRegs.length;
  const withJockey     = completedRegs.filter((r) => r.jockeyName).length;

  const myHorseIds = horses.map((h) => h.id);
  // Danh sách race đã hoàn thành (dedup theo raceId) để hiển thị bảng xếp hạng.
  const rankedRaces = Array.from(
    new Map(
      completedRegs
        .filter((reg) => reg.raceId)
        .map((reg) => [reg.raceId, { raceId: reg.raceId, raceName: reg.raceName }]),
    ).values(),
  );

  const resultRows = completedRegs.map((reg) => {
    const race = appState.races.find((r) => r.id === reg.raceId);
    return {
      id:          reg.id,
      raceName:    reg.raceName,
      horseName:   reg.horseName,
      jockeyName:  reg.jockeyName ?? "—",
      raceDate:    fmtDate(reg.raceDate),
      distance:    race?.distance ?? "—",
      tournament:  race ? (appState.tournaments.find((t) => t.id === race.tournamentId)?.name ?? "—") : "—",
    };
  });

  return (
    <div className="page-stack">
      <div className="metric-grid three">
        <MetricCard
          label="Horses in stable"
          value={String(horses.length)}
          note="Total managed"
        />
        <MetricCard
          label="Approved entries"
          value={String(totalApproved)}
          note="Cleared for races"
          tone="accent"
        />
        <MetricCard
          label="Completed races"
          value={String(totalCompleted)}
          note="Races your horses finished"
          tone="success"
        />
      </div>

      <Panel
        title="Completed race entries"
        subtitle="Approved registrations for finished races"
      >
        {resultRows.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No completed races yet. Results will appear here once races finish.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: "raceName",   label: "Race"       },
              { key: "horseName",  label: "Horse"      },
              { key: "jockeyName", label: "Jockey"     },
              { key: "tournament", label: "Tournament" },
              { key: "distance",   label: "Distance"   },
              { key: "raceDate",   label: "Date"       },
              {
                key: "id",
                label: "Entry",
                render: () => <Badge tone="success">Participated</Badge>,
              },
            ]}
            rows={resultRows}
          />
        )}
      </Panel>

      {rankedRaces.length > 0 && (
        <Panel title="Bảng xếp hạng" subtitle="Kết quả chính thức các cuộc đua ngựa của bạn đã tham gia — ngựa của bạn được tô sáng">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {rankedRaces.map((r) => (
              <RaceLeaderboard key={r.raceId} raceId={r.raceId} highlightHorseIds={myHorseIds} />
            ))}
          </div>
        </Panel>
      )}

      {withJockey > 0 && (
        <Panel title="Jockey performance" subtitle="Races where your horse had an assigned jockey">
          <DataTable
            columns={[
              { key: "raceName",   label: "Race"   },
              { key: "horseName",  label: "Horse"  },
              { key: "jockeyName", label: "Jockey" },
              { key: "raceDate",   label: "Date"   },
            ]}
            rows={completedRegs.filter((r) => r.jockeyName).map((reg) => ({
              id:          reg.id,
              raceName:    reg.raceName,
              horseName:   reg.horseName,
              jockeyName:  reg.jockeyName!,
              raceDate:    fmtDate(reg.raceDate),
            }))}
          />
        </Panel>
      )}
    </div>
  );
}
