import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function AdminDashboard() {
  const { appState } = useApp();

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Admin dashboard</Badge>
          <h3>Central hub for managing horse racing operations and predictions</h3>
          <p>Admin can manage accounts, schedule races, approve registrations, make assignments, and publish results from a unified dashboard.</p>
        </div>
      </section>

      <div className="metric-grid four">
        <MetricCard
          label="Pending approvals"
          value={String(appState.approvals.filter((a) => a.status === "Pending").length)}
          note="Needs review today"
          tone="warning"
        />
        <MetricCard
          label="Live tournaments"
          value={String(appState.tournaments.filter((t) => t.status === "Live").length)}
          note="Monitor result publishing"
        />
        <MetricCard
          label="Active users"
          value={String(appState.users.filter((u) => u.status === "Active").length)}
          note="Track roles and last seen"
          tone="success"
        />
        <MetricCard
          label="Publish queue"
          value={String(appState.publishQueue.filter((p) => p.publishStatus !== "Published").length)}
          note="Results awaiting publication"
          tone="accent"
        />
      </div>

      <div className="content-grid two">
        <Panel title="Action queue" subtitle="Approval and publish summary">
          <div className="card-list">
            {appState.approvals.map((approval) => (
              <article key={approval.id} className="info-card">
                <div className="card-head">
                  <strong>{approval.type}</strong>
                  <Badge tone={approval.status === "Pending" ? "warning" : approval.status === "Approved" ? "success" : "danger"}>
                    {approval.status}
                  </Badge>
                </div>
                <p>{approval.applicant}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Assignments" subtitle="Race, jockey, and referee">
          <div className="card-list">
            {appState.assignments.map((a) => (
              <article key={a.id} className="info-card">
                <div className="card-head">
                  <strong>{a.race}</strong>
                  <Badge tone={a.status === "Assigned" ? "success" : "warning"}>{a.status}</Badge>
                </div>
                <p>{a.horse} • {a.jockey}</p>
                <span>{a.referee}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
