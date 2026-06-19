import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function RewardsPage() {
  const { user, appState, handleTopUpPoints } = useApp();
  const [topUpPoints, setTopUpPoints] = useState(100);
  const [topUpError, setTopUpError] = useState("");
  const [topUpMessage, setTopUpMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!user) return null;
  const myRewards = appState.rewards.filter((r) => r.spectatorId === user.id);

  async function submitTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError("");
    setTopUpMessage("");
    if (!Number.isInteger(topUpPoints) || topUpPoints < 100) {
      setTopUpError("Minimum top-up is 100 points.");
      return;
    }
    setSubmitting(true);
    try {
      await handleTopUpPoints(topUpPoints);
      setTopUpMessage(`Top-up successful: ${topUpPoints} points.`);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Top-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel title="Points wallet" subtitle="100 VND = 1 point · minimum top-up 100 points">
        <div className="metric-grid three">
          <div className="metric-card">
            <span>Current balance</span>
            <strong>{appState.spectatorPoints?.currentBalance ?? 0} pts</strong>
            <p>Internal points only</p>
          </div>
          <div className="metric-card">
            <span>Total earned</span>
            <strong>{appState.spectatorPoints?.totalPointsEarned ?? 0} pts</strong>
            <p>Top-ups and rewards</p>
          </div>
          <div className="metric-card">
            <span>Total spent</span>
            <strong>{appState.spectatorPoints?.totalPointsSpent ?? 0} pts</strong>
            <p>Entries and redemptions</p>
          </div>
        </div>

        <form className="inline-form" onSubmit={submitTopUp} style={{ marginTop: "16px" }}>
          <label className="field">
            <span>Top-up points</span>
            <input
              min={100}
              step={100}
              type="number"
              value={topUpPoints}
              onChange={(event) => setTopUpPoints(Number(event.target.value))}
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Processing..." : `Top up ${(topUpPoints * 100).toLocaleString()} VND`}
          </button>
        </form>
        {topUpError ? <div className="form-banner form-banner-error">{topUpError}</div> : null}
        {topUpMessage ? <div className="form-banner form-banner-success">{topUpMessage}</div> : null}
      </Panel>

      <Panel title="Prediction rewards" subtitle="Track your reward status and claims">
        <DataTable
          columns={[
            { key: "title",  label: "Reward" },
            { key: "amount", label: "Amount" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Claimed" ? "neutral" : "success"}>{row.status}</Badge>
              ),
            },
          ]}
          rows={myRewards}
        />
      </Panel>
    </div>
  );
}
