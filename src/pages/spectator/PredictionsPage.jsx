import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function PredictionsPage() {
  const { user, appState, handleAction } = useApp();
  const myPredictions = appState.predictions.filter((p) => p.spectatorId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Create and track predictions" subtitle="Pick a horse for the live race">
        <div className="prediction-actions">
          {appState.liveBoard.positions.slice(0, 3).map((item) => (
            <button
              key={item.horse}
              className="secondary-button"
              type="button"
              onClick={() => handleAction("makePrediction", item.horse)}
            >
              Predict {item.horse}
            </button>
          ))}
        </div>
        <DataTable
          columns={[
            { key: "raceId", label: "Race" },
            { key: "horse", label: "Your pick" },
            { key: "odds", label: "Odds" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Won" ? "success" : row.status === "Lost" ? "danger" : "warning"}>
                  {row.status}
                </Badge>
              )
            },
            { key: "reward", label: "Reward" }
          ]}
          rows={myPredictions}
        />
      </Panel>
    </div>
  );
}
