import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function SpectatorDashboard() {
  const { user, appState } = useApp();
  const myPredictions = appState.predictions.filter((p) => p.spectatorId === user.id);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Spectator dashboard</Badge>
          <h3>Watch race schedules, live results, predictions, and rewards in one flow</h3>
          <p>This dashboard prioritizes live races, open predictions, and the latest reward notifications.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard label="Live races today" value="8" note="Switch quickly between races" />
        <MetricCard label="Prediction tickets" value={String(myPredictions.length)} note="Open, won, and lost" tone="accent" />
        <MetricCard label="Rewards ready" value="4.8M" note="1 reward available for race 07" tone="success" />
      </div>

      <div className="content-grid two">
        <Panel title="Live board" subtitle="Currently tracking race">
          <div className="live-board">
            {appState.liveBoard.positions.map((item) => (
              <article key={item.position} className="live-row">
                <span>{item.position}</span>
                <div>
                  <strong>{item.horse}</strong>
                  <p>{item.jockey}</p>
                </div>
                <b>{item.gap}</b>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Prediction history" subtitle="Recent prediction results">
          <div className="card-list">
            {myPredictions.map((prediction) => (
              <article key={prediction.id} className="info-card">
                <div className="card-head">
                  <strong>{prediction.horse}</strong>
                  <Badge tone={prediction.status === "Won" ? "success" : prediction.status === "Lost" ? "danger" : "warning"}>
                    {prediction.status}
                  </Badge>
                </div>
                <p>{prediction.raceId}</p>
                <span>Reward {prediction.reward}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
