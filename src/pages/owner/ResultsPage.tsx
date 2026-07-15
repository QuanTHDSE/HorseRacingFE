import { Badge, DataTable, MetricCard, Panel, RaceLeaderboard } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
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
          label="Ngựa trong chuồng"
          value={String(horses.length)}
          note="Tổng đang quản lý"
        />
        <MetricCard
          label="Đơn đã duyệt"
          value={String(totalApproved)}
          note="Đủ điều kiện thi đấu"
          tone="accent"
        />
        <MetricCard
          label="Cuộc đua đã xong"
          value={String(totalCompleted)}
          note="Ngựa của bạn đã về đích"
          tone="success"
        />
      </div>

      <Panel
        title="Các cuộc đua đã hoàn thành"
        subtitle="Đơn đã duyệt cho các cuộc đua đã kết thúc"
      >
        {resultRows.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Chưa có cuộc đua nào hoàn thành. Kết quả sẽ hiện ở đây khi cuộc đua kết thúc.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: "raceName",   label: "Cuộc đua"   },
              { key: "horseName",  label: "Ngựa"       },
              { key: "jockeyName", label: "Nài ngựa"   },
              { key: "tournament", label: "Giải đấu"   },
              { key: "distance",   label: "Cự ly"      },
              { key: "raceDate",   label: "Ngày"       },
              {
                key: "id",
                label: "Tham gia",
                render: () => <Badge tone="success">Đã tham gia</Badge>,
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
        <Panel title="Thành tích nài ngựa" subtitle="Các cuộc đua ngựa của bạn có nài được phân công">
          <DataTable
            columns={[
              { key: "raceName",   label: "Cuộc đua" },
              { key: "horseName",  label: "Ngựa"     },
              { key: "jockeyName", label: "Nài ngựa" },
              { key: "raceDate",   label: "Ngày"     },
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
