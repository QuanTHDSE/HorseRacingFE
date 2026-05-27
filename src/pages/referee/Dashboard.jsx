import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function RefereeDashboard() {
  const { user, appState } = useApp();
  const refereeChecks = appState.refereeChecks.filter((c) => c.refereeId === user.id);
  const refereeViolations = appState.violations.filter((v) => v.refereeId === user.id);
  const refereeReports = appState.reports.filter((r) => r.refereeId === user.id);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Referee dashboard</Badge>
          <h3>Control race before, during, and after competition</h3>
          <p>This control room focuses on checklists, live monitoring, incident logs, and result confirmation reports.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard label="Assigned races" value="3" note="In the next 48 hours" />
        <MetricCard
          label="Incomplete checklists"
          value={String(refereeChecks.filter((c) => !c.trackCheck || !c.jockeyCheck).length)}
          note="Needs to be done before race time"
          tone="warning"
        />
        <MetricCard
          label="Violations under review"
          value={String(refereeViolations.length)}
          note="Incidents require follow-up"
          tone="accent"
        />
      </div>

      <div className="content-grid two">
        <Panel title="Pre-race queue" subtitle="Races coming up that need inspection">
          <div className="card-list">
            {refereeChecks.map((check) => (
              <article key={check.id} className="info-card">
                <div className="card-head">
                  <strong>{appState.races.find((r) => r.id === check.raceId)?.name ?? check.raceId}</strong>
                  <Badge tone={!check.trackCheck || !check.jockeyCheck ? "warning" : "success"}>
                    {!check.trackCheck || !check.jockeyCheck ? "Open" : "Ready"}
                  </Badge>
                </div>
                <p>{check.note}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Report queue" subtitle="Reports pending signature or already submitted">
          <div className="card-list">
            {refereeReports.map((report) => (
              <article key={report.id} className="info-card">
                <div className="card-head">
                  <strong>{report.title}</strong>
                  <Badge tone={report.status === "Submitted" ? "success" : "warning"}>{report.status}</Badge>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
