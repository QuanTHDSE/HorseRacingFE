import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
          <Badge tone="accent">Owner dashboard</Badge>
          <h3>Welcome back, {user.name}</h3>
          <p>Manage horses, register for races, and hire jockeys — all in one place.</p>
        </div>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Total horses"           value={String(horses.length)}    note="In your stable"               />
        <MetricCard label="Fit horses"             value={String(fitCount)}          note="Ready to race"          tone="success" />
        <MetricCard label="Active registrations"   value={String(approvedRegs)}      note="Approved for races"     tone="accent"  />
        <MetricCard label="Pending registrations"  value={String(pendingRegs)}       note="Awaiting admin review"  tone="warning" />
      </div>

      <div className="content-grid two">
        <Panel title="My horses" subtitle="Health and assignment overview">
          {recentHorses.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No horses registered yet.</p>
          )}
          <div className="card-list">
            {recentHorses.map((horse) => (
              <article key={horse.id} className="info-card">
                <div className="card-head">
                  <strong>{horse.name}</strong>
                  <Badge tone={HEALTH_TONE[horse.health] as any ?? "neutral"}>{horse.health}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px", fontSize: "0.875rem" }}>
                  {horse.breed} · {horse.age} yrs{horse.color ? ` · ${horse.color}` : ""}
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {horse.jockeyName ? `Jockey: ${horse.jockeyName}` : "No jockey assigned"}
                  {horse.weight ? ` · ${horse.weight}kg` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Recent registrations" subtitle="Race entry status">
          {recentRegs.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No race registrations yet.</p>
          )}
          <div className="card-list">
            {recentRegs.map((reg) => (
              <article key={reg.id} className="info-card">
                <div className="card-head">
                  <strong>{reg.raceName}</strong>
                  <Badge tone={REG_TONE[reg.status] as any ?? "neutral"}>{reg.status}</Badge>
                </div>
                <p style={{ margin: "4px 0 2px", fontSize: "0.875rem" }}>
                  Horse: <strong>{reg.horseName}</strong>
                </p>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {fmtDate(reg.raceDate)}
                  {reg.jockeyName ? ` · Jockey: ${reg.jockeyName}` : ""}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
