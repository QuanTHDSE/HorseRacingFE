import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function PredictionsPage() {
  const { user, appState, handleCreatePrediction, handleCancelPrediction } = useApp();
  if (!user) return null;
  const myPredictions = appState.predictions.filter((p) => p.spectatorId === user.id);
  const openRaces = appState.spectatorRaces.filter((race) => race.canPredict && !race.hasPrediction);
  const balance = appState.spectatorPoints?.currentBalance ?? 0;

  return (
    <div className="page-stack">
      <Panel title="Create and track predictions" subtitle={`Wallet balance: ${balance} pts`}>
        {openRaces.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No races are open for predictions right now.
          </p>
        ) : (
          <div className="prediction-actions">
            {openRaces.slice(0, 3).flatMap((race) => {
              const entryFee = race.predictionConfig.poolEnabled ? race.predictionConfig.entryFee : 0;
              const multipliers = race.predictionConfig.quickRiskMultipliers.length
                ? race.predictionConfig.quickRiskMultipliers
                : [1];
              return race.participants.slice(0, 4).flatMap((horse) =>
                multipliers.map((risk) => {
                  const cost = entryFee * risk;
                  const disabled = cost > balance;
                  return (
                    <button
                      key={`${race.id}-${horse.id}-${risk}`}
                      className="secondary-button"
                      type="button"
                      disabled={disabled}
                      title={disabled ? "Not enough points" : undefined}
                      onClick={() => handleCreatePrediction(race.id, horse.id, risk)}
                    >
                      Predict {horse.name} · {risk}x · {cost} pts
                    </button>
                  );
                }),
              );
            })}
          </div>
        )}
        <DataTable
          columns={[
            { key: "raceId", label: "Race"     },
            { key: "horse",  label: "Your pick" },
            { key: "odds",   label: "Odds"     },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Won" ? "success" : row.status === "Lost" ? "danger" : "warning"}>
                  {row.status}
                </Badge>
              ),
            },
            { key: "reward", label: "Reward" },
            {
              key: "actions",
              label: "Actions",
              render: (row) =>
                row.status === "Open" ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleCancelPrediction(row.id)}
                  >
                    Cancel
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={myPredictions}
        />
      </Panel>
    </div>
  );
}
