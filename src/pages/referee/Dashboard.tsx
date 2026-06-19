import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { RefereeDashboard } from "../../types";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_TONE: Record<string, string> = {
  Upcoming: "accent", Live: "success", Completed: "neutral", Cancelled: "danger",
};

export default function RefereeDashboard() {
  const { user, appState, handleGetRefereeDashboard } = useApp();
  const [stats, setStats] = useState<RefereeDashboard | null>(null);

  const races = appState.refereeRaces;

  useEffect(() => {
    let alive = true;
    handleGetRefereeDashboard().then((d) => alive && setStats(d)).catch(() => {});
    return () => { alive = false; };
  }, [handleGetRefereeDashboard]);

  // Fallback derived from the loaded race list
  const upcoming = stats?.upcomingRaces ?? races.filter((r) => r.liveStatus === "Upcoming" || r.liveStatus === "Live").length;
  const completed = stats?.completedRaces ?? races.filter((r) => r.liveStatus === "Completed").length;
  const pending = stats?.pendingConfirmations ?? races.filter((r) => r.hasResult && !r.confirmedAt).length;

  if (!user) return null;

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Referee control room</Badge>
          <h3>Xin chào, {user.name}</h3>
          <p>Duyệt checklist trước đua và xác nhận kết quả các cuộc đua bạn phụ trách.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard label="Sắp / đang diễn ra" value={String(upcoming)} note="Cần duyệt checklist" tone="accent" />
        <MetricCard label="Đã hoàn thành" value={String(completed)} note="Các cuộc đua đã xong" tone="neutral" />
        <MetricCard label="Chờ xác nhận kết quả" value={String(pending)} note="Có kết quả, chưa xác nhận" tone="warning" />
      </div>

      <Panel title="Các cuộc đua bạn phụ trách" subtitle={`${races.length} cuộc đua`}>
        <DataTable
          columns={[
            { key: "name", label: "Cuộc đua" },
            { key: "round", label: "Vòng", render: (r) => `#${r.round}` },
            { key: "scheduledAt", label: "Thời gian", render: (r) => fmtDate(r.scheduledAt) },
            { key: "participantCount", label: "Số ngựa" },
            {
              key: "liveStatus",
              label: "Trạng thái",
              render: (r) => <Badge tone={STATUS_TONE[r.liveStatus] as any ?? "neutral"}>{r.liveStatus}</Badge>,
            },
            {
              key: "id",
              label: "Kết quả",
              render: (r) => {
                if (r.publishedAt) return <Badge tone="success">Đã công bố</Badge>;
                if (r.confirmedAt) return <Badge tone="accent">Đã xác nhận</Badge>;
                if (r.hasResult) return <Badge tone="warning">Chờ xác nhận</Badge>;
                return <span style={{ color: "var(--c-muted)", fontSize: "0.8rem" }}>Chưa nhập</span>;
              },
            },
          ]}
          rows={races}
          empty="Bạn chưa được phân công cuộc đua nào."
        />
      </Panel>
    </div>
  );
}
