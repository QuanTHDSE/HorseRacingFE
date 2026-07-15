import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { viHealth, viRegStatus } from "../../utils/viLabels";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

const HEALTH_TONE: Record<string, string> = { Fit: "success", Injured: "warning", Retired: "neutral" };
const REG_TONE: Record<string, string>    = { Pending: "warning", Approved: "success", Rejected: "danger" };

export default function OwnerDashboard() {
  const { user, appState } = useApp();
  if (!user) return null;

  const horses    = appState.horses;
  const regs      = appState.ownerRegistrations;
  const fitCount  = horses.filter((h) => h.health === "Fit").length;
  const pendingRegs  = regs.filter((r) => r.status === "Pending").length;
  const approvedRegs = regs.filter((r) => r.status === "Approved").length;

  const recentHorses = horses.slice(0, 4);
  const recentRegs   = regs.slice(0, 5);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Tổng quan Chủ ngựa</Badge>
          <h3>Chào mừng trở lại, {user.name}</h3>
          <p>Quản lý ngựa, đăng ký cuộc đua và thuê nài ngựa — tất cả ở một nơi.</p>
        </div>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Tổng số ngựa"          value={String(horses.length)}    note="Trong chuồng của bạn"               />
        <MetricCard label="Ngựa khỏe mạnh"         value={String(fitCount)}          note="Sẵn sàng thi đấu"          tone="success" />
        <MetricCard label="Đăng ký đang hoạt động" value={String(approvedRegs)}      note="Đã duyệt cho cuộc đua"     tone="accent"  />
        <MetricCard label="Đăng ký chờ duyệt"      value={String(pendingRegs)}       note="Đang chờ admin xét duyệt"  tone="warning" />
      </div>

      <div className="content-grid two">
        <Panel title="Ngựa của tôi" subtitle="Tổng quan sức khỏe và phân công">
          {recentHorses.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa đăng ký ngựa nào.</p>
          )}
          <div className="card-list">
            {recentHorses.map((horse) => (
              <article key={horse.id} className="info-card">
                <div className="card-head">
                  <strong>{horse.name}</strong>
                  <Badge tone={HEALTH_TONE[horse.health] as any ?? "neutral"}>{viHealth(horse.health)}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px", fontSize: "0.875rem" }}>
                  {horse.breed} · {horse.age} tuổi{horse.color ? ` · ${horse.color}` : ""}
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {horse.jockeyName ? `Nài: ${horse.jockeyName}` : "Chưa có nài"}
                  {horse.weight ? ` · ${horse.weight}kg` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Đăng ký gần đây" subtitle="Trạng thái đăng ký cuộc đua">
          {recentRegs.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa có đăng ký cuộc đua nào.</p>
          )}
          <div className="card-list">
            {recentRegs.map((reg) => (
              <article key={reg.id} className="info-card">
                <div className="card-head">
                  <strong>{reg.raceName}</strong>
                  <Badge tone={REG_TONE[reg.status] as any ?? "neutral"}>{viRegStatus(reg.status)}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px", fontSize: "0.875rem" }}>
                  Ngựa: <strong>{reg.horseName}</strong>
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {fmtDate(reg.raceDate)}
                  {reg.jockeyName ? ` · Nài: ${reg.jockeyName}` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
