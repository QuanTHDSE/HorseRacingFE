import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function PredictionsPage() {
  const { user, appState, handleCreatePrediction, handleCancelPrediction } = useApp();
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [ticketCountInput, setTicketCountInput] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  if (!user) return null;
  const myPredictions = appState.predictions.filter((p) => p.spectatorId === user.id);
  const openRaces = appState.spectatorRaces.filter((race) => race.canPredict && !race.hasPrediction);
  const balance = appState.spectatorPoints?.currentBalance ?? 0;

  const selectedRace = openRaces.find((r) => r.id === selectedRaceId) ?? null;
  const selectedHorse = selectedRace?.participants.find((p) => p.id === selectedHorseId) ?? null;
  const ticketPrice = selectedRace?.predictionConfig.poolEnabled ? selectedRace.predictionConfig.ticketPrice : 0;
  const ticketCount = Math.max(0, parseInt(ticketCountInput, 10) || 0);
  const cost = ticketPrice * ticketCount;
  const quickCounts = selectedRace?.predictionConfig.quickRiskMultipliers.length
    ? selectedRace.predictionConfig.quickRiskMultipliers
    : [1];

  function selectRace(raceId: string) {
    setSelectedRaceId(raceId);
    setSelectedHorseId(null);
    setTicketCountInput("1");
    setSubmitError("");
  }

  function selectHorse(horseId: string) {
    setSelectedHorseId(horseId);
    setTicketCountInput("1");
  }

  async function submit() {
    if (!selectedRace || !selectedHorse || ticketCount < 1 || cost > balance) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await handleCreatePrediction(selectedRace.id, selectedHorse.id, ticketCount);
      setSelectedRaceId(null);
      setSelectedHorseId(null);
      setTicketCountInput("1");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit prediction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel title="Create a prediction" subtitle={`Wallet balance: ${balance} pts`}>
        {submitError && (
          <div className="form-banner form-banner-error" style={{ marginBottom: "12px" }}>
            {submitError}
          </div>
        )}

        {openRaces.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No races are open for predictions right now.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>1. Choose a race</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {openRaces.map((race) => (
                  <button
                    key={race.id}
                    type="button"
                    className="secondary-button"
                    style={{
                      textAlign: "left",
                      background: selectedRaceId === race.id ? "var(--c-surf-highest)" : undefined,
                    }}
                    onClick={() => selectRace(race.id)}
                  >
                    {race.name} · {race.tournamentName} · {new Date(race.scheduledAt).toLocaleString("en-GB")}
                  </button>
                ))}
              </div>
            </div>

            {selectedRace && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>2. Choose the winning horse</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedRace.participants.map((horse) => (
                    <button
                      key={horse.id}
                      type="button"
                      className="secondary-button"
                      style={{
                        textAlign: "left",
                        background: selectedHorseId === horse.id ? "var(--c-surf-highest)" : undefined,
                      }}
                      onClick={() => selectHorse(horse.id)}
                    >
                      Lane {horse.laneNumber} · {horse.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedHorse && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>3. Number of tickets</h4>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min={1}
                    value={ticketCountInput}
                    onChange={(e) => setTicketCountInput(e.target.value)}
                    style={{ width: "90px" }}
                  />
                  {quickCounts.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="secondary-button btn-xs"
                      onClick={() => setTicketCountInput(String(n))}
                    >
                      {n}
                    </button>
                  ))}
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Price per ticket: {ticketPrice.toLocaleString()} pts
                  </span>
                </div>

                {ticketCount <= 0 && (
                  <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--danger, #dc2626)" }}>
                    Enter a ticket count greater than 0.
                  </p>
                )}
                {ticketCount > 0 && cost > balance && (
                  <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--danger, #dc2626)" }}>
                    Not enough points for {ticketCount} ticket{ticketCount > 1 ? "s" : ""} ({cost} pts).
                  </p>
                )}

                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: "12px" }}
                  disabled={ticketCount < 1 || cost > balance || submitting}
                  onClick={submit}
                >
                  {submitting ? "Submitting…" : `Place prediction · ${cost.toLocaleString()} pts`}
                </button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Your predictions" subtitle={`${myPredictions.length} prediction${myPredictions.length !== 1 ? "s" : ""}`}>
        <DataTable
          columns={[
            { key: "raceName", label: "Race"     },
            { key: "horse",  label: "Your pick" },
            { key: "tickets", label: "Tickets" },
            { key: "cost", label: "Cost" },
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
