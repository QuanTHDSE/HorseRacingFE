import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";

const TX_LABELS: Record<string, string> = {
  topup: "Top-up",
  earned_prediction: "Prediction reward",
  earned_bonus: "Bonus reward",
  spent_redemption: "Redemption",
  refunded_redemption: "Redemption refund",
  spent_pool_entry: "Prediction entry",
  earned_pool_share: "Pool reward",
  earned_race_prize_owner: "Owner race prize",
  earned_race_prize_jockey: "Jockey race prize",
  refunded_pool: "Prediction refund",
  spent_viewing_ticket: "Viewing ticket",
  refunded_viewing_ticket: "Viewing ticket refund",
};

export default function RewardsPage() {
  const { user, appState, handleTopUpPoints, handleCreatePayosTopUp } = useApp();
  const [topUpPoints, setTopUpPoints] = useState(100);
  const [filter, setFilter] = useState<"all" | "credit" | "debit" | "prediction" | "topup">("all");
  const fb = useFeedback();
  const topUpError: string = ""; const setTopUpError = fb.error;
  const topUpMessage: string = ""; const setTopUpMessage = fb.success;
  const [submitting, setSubmitting] = useState(false);
  if (!user) return null;
  const myTransactions = appState.rewards
    .filter((r) => r.spectatorId === user.id)
    .filter((tx) => {
      if (filter === "credit") return tx.direction === "credit";
      if (filter === "debit") return tx.direction === "debit";
      if (filter === "prediction") return tx.type.includes("pool") || tx.type.includes("prediction");
      if (filter === "topup") return tx.type === "topup";
      return true;
    });

  const predictionSpent = appState.rewards
    .filter((r) => r.spectatorId === user.id && r.type === "spent_pool_entry")
    .reduce((sum, tx) => sum + Math.abs(tx.rawPoints), 0);
  const predictionReceived = appState.rewards
    .filter((r) => r.spectatorId === user.id && ["earned_pool_share", "refunded_pool", "earned_prediction", "earned_bonus"].includes(r.type))
    .reduce((sum, tx) => sum + Math.max(0, tx.rawPoints), 0);

  async function submitTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError("");
    setTopUpMessage("");
    if (!Number.isInteger(topUpPoints) || topUpPoints < 100) {
      setTopUpError("Nạp tối thiểu 100 điểm.");
      return;
    }
    setSubmitting(true);
    try {
      await handleTopUpPoints(topUpPoints);
      setTopUpMessage(`Nạp thành công: ${topUpPoints} điểm.`);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Nạp điểm thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayosTopUp() {
    setTopUpError("");
    setTopUpMessage("");
    if (!Number.isInteger(topUpPoints) || topUpPoints < 100) {
      setTopUpError("Nạp tối thiểu 100 điểm.");
      return;
    }
    setSubmitting(true);
    try {
      const paymentUrl = await handleCreatePayosTopUp(topUpPoints);
      window.location.href = paymentUrl;
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : "Không tạo được thanh toán PayOS.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel title="Point Wallet" subtitle="1000 VND = 1 point · minimum top-up is 100 points">
        <div className="metric-grid three">
          <div className="metric-card">
            <span>Current balance</span>
            <strong>{appState.spectatorPoints?.currentBalance ?? 0} điểm</strong>
            <p>Available for predictions</p>
          </div>
          <div className="metric-card">
            <span>Total received</span>
            <strong>{appState.spectatorPoints?.totalPointsEarned ?? 0} điểm</strong>
            <p>Top-ups, refunds and rewards</p>
          </div>
          <div className="metric-card">
            <span>Total spent</span>
            <strong>{appState.spectatorPoints?.totalPointsSpent ?? 0} điểm</strong>
            <p>Prediction entries and redemptions</p>
          </div>
        </div>

        <div className="metric-grid two" style={{ marginTop: 12 }}>
          <div className="metric-card">
            <span>Prediction entries</span>
            <strong>{predictionSpent.toLocaleString("vi-VN")} điểm</strong>
            <p>Points deducted when betting</p>
          </div>
          <div className="metric-card">
            <span>Prediction returns</span>
            <strong>{predictionReceived.toLocaleString("vi-VN")} điểm</strong>
            <p>Refunds and winning payouts</p>
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
            {submitting ? "Đang xử lý..." : `Nạp ${(topUpPoints * 1000).toLocaleString()} VND`}
          </button>
          <button className="secondary-button" type="button" disabled={submitting} onClick={submitPayosTopUp}>
            Thanh toán qua PayOS
          </button>
        </form>
        {topUpError ? <div className="form-banner form-banner-error">{topUpError}</div> : null}
        {topUpMessage ? <div className="form-banner form-banner-success">{topUpMessage}</div> : null}
      </Panel>

      <Panel title="Point History" subtitle="Full wallet ledger: top-ups, bets, wins, losses, cancellations and refunds">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {([
            ["all", "All"],
            ["credit", "Received"],
            ["debit", "Spent"],
            ["prediction", "Predictions"],
            ["topup", "Top-ups"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "primary-button btn-xs" : "secondary-button btn-xs"}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <DataTable
          columns={[
            { key: "title",  label: "Activity" },
            {
              key: "type",
              label: "Type",
              render: (row) => TX_LABELS[row.type] ?? row.type.replace(/_/g, " "),
            },
            {
              key: "amount",
              label: "Points",
              render: (row) => (
                <strong style={{ color: row.rawPoints < 0 ? "var(--danger, #dc2626)" : "var(--success, #16a34a)" }}>
                  {row.amount}
                </strong>
              ),
            },
            {
              key: "balanceAfter",
              label: "Balance after",
              render: (row) => `${row.balanceAfter.toLocaleString("vi-VN")} pts`,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.direction === "credit" ? "success" : row.direction === "debit" ? "danger" : "neutral"}>
                  {row.status}
                </Badge>
              ),
            },
            {
              key: "createdAt",
              label: "Time",
              render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
            },
          ]}
          rows={myTransactions}
          empty="No point history yet."
        />
      </Panel>
    </div>
  );
}
