import { Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function MonitorPage() {
  const { appState } = useApp();
  const { liveBoard } = appState;

  return (
    <div className="page-stack">
      <Panel title={liveBoard.title} subtitle={`${liveBoard.phase} • ${liveBoard.updatedAt}`}>
        <div className="live-board">
          {liveBoard.positions.map((item) => (
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
    </div>
  );
}
