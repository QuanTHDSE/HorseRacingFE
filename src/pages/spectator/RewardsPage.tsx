import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, Spinner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import { cn } from "../../utils/cn";

const VND_PER_POINT = 0.01;
const MIN_TOP_UP_POINTS = 100;
const QUICK_TOP_UP_POINTS = [100_000, 500_000, 1_000_000];

type WalletFilter = "all" | "credit" | "debit" | "prediction" | "topup";

const FILTER_LABEL: Record<WalletFilter, string> = {
  all: "Tất cả",
  credit: "Điểm nhận",
  debit: "Điểm chi",
  prediction: "Dự đoán",
  topup: "Nạp điểm",
};

const TRANSACTION_LABELS: Record<string, string> = {
  topup: "Nạp điểm",
  earned_prediction: "Thưởng dự đoán",
  earned_bonus: "Thưởng bổ sung",
  spent_redemption: "Đổi phần thưởng",
  refunded_redemption: "Hoàn điểm đổi thưởng",
  spent_pool_entry: "Mua vé dự đoán",
  earned_pool_share: "Thưởng từ quỹ dự đoán",
  earned_race_prize_owner: "Thưởng cuộc đua cho chủ ngựa",
  earned_race_prize_jockey: "Thưởng cuộc đua cho nài ngựa",
  refunded_pool: "Hoàn vé dự đoán",
  spent_viewing_ticket: "Mua vé xem cuộc đua",
  refunded_viewing_ticket: "Hoàn vé xem cuộc đua",
};

function formatPoints(value: number): string {
  return `${value.toLocaleString("vi-VN")} điểm`;
}

function formatVnd(value: number): string {
  return `${Math.max(0, Math.ceil(value)).toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function translateTransactionTitle(title: string, type: string): string {
  const normalizedType = type.replace(/_/g, " ");
  if (!title || title.toLowerCase() === normalizedType.toLowerCase()) {
    return TRANSACTION_LABELS[type] ?? "Giao dịch điểm";
  }

  return title
    .replace(/^Seed demo top-up:/i, "Nạp điểm mẫu:")
    .replace(/^Seed demo spend:/i, "Chi điểm mẫu:")
    .replace(/^Seed demo pool entry:/i, "Vé dự đoán mẫu:")
    .replace(/^Seed no-winner pool entry:/i, "Vé dự đoán không có người thắng:")
    .replace(/viewing ticket/gi, "vé xem cuộc đua")
    .replace(/prediction refund/gi, "hoàn điểm dự đoán")
    .replace(/prediction reward/gi, "thưởng dự đoán")
    .replace(/\bpoints\b/gi, "điểm")
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (value) => Number(value.replace(/,/g, "")).toLocaleString("vi-VN"));
}

function transactionStatus(direction: "credit" | "debit" | "neutral"): string {
  if (direction === "credit") return "Đã nhận";
  if (direction === "debit") return "Đã chi";
  return "Đã ghi nhận";
}

export default function RewardsPage() {
  const { user, appState, isDataLoading, handleTopUpPoints, handleCreatePayosTopUp } = useApp();
  const feedback = useFeedback();
  const [topUpPoints, setTopUpPoints] = useState(100_000);
  const [filter, setFilter] = useState<WalletFilter>("all");
  const [submitting, setSubmitting] = useState<"mock" | "payos" | null>(null);

  if (!user) return null;

  const allTransactions = appState.rewards.filter((reward) => reward.spectatorId === user.id);
  const myTransactions = useMemo(() => allTransactions.filter((transaction) => {
    if (filter === "credit") return transaction.direction === "credit";
    if (filter === "debit") return transaction.direction === "debit";
    if (filter === "prediction") return transaction.type.includes("pool") || transaction.type.includes("prediction");
    if (filter === "topup") return transaction.type === "topup";
    return true;
  }), [allTransactions, filter]);

  const predictionSpent = allTransactions
    .filter((transaction) => transaction.type === "spent_pool_entry")
    .reduce((sum, transaction) => sum + Math.abs(transaction.rawPoints), 0);
  const predictionReceived = allTransactions
    .filter((transaction) => ["earned_pool_share", "refunded_pool", "earned_prediction", "earned_bonus"].includes(transaction.type))
    .reduce((sum, transaction) => sum + Math.max(0, transaction.rawPoints), 0);
  const pointSummary = appState.spectatorPoints;
  const convertedVnd = Number.isFinite(topUpPoints) ? Math.ceil(topUpPoints * VND_PER_POINT) : 0;
  const isValidAmount = Number.isInteger(topUpPoints) && topUpPoints >= MIN_TOP_UP_POINTS;

  function validateTopUp(): boolean {
    if (!isValidAmount) {
      feedback.error(`Số điểm nạp tối thiểu là ${MIN_TOP_UP_POINTS.toLocaleString("vi-VN")} điểm.`);
      return false;
    }
    return true;
  }

  async function submitTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateTopUp()) return;
    setSubmitting("mock");
    try {
      await handleTopUpPoints(topUpPoints);
      feedback.success(`Đã nạp thành công ${formatPoints(topUpPoints)}.`);
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Nạp điểm thất bại.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitPayosTopUp() {
    if (!validateTopUp()) return;
    setSubmitting("payos");
    try {
      const paymentUrl = await handleCreatePayosTopUp(topUpPoints);
      window.location.href = paymentUrl;
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không tạo được giao dịch PayOS.");
      setSubmitting(null);
    }
  }

  return (
    <div className="page-stack spectator-friendly-page">
      <div className="metric-grid three">
        <MetricCard
          label="Số dư hiện tại"
          value={(pointSummary?.currentBalance ?? 0).toLocaleString("vi-VN")}
          note="Điểm sẵn sàng để sử dụng"
          tone="success"
          loading={isDataLoading && !pointSummary}
        />
        <MetricCard
          label="Tổng điểm đã nhận"
          value={(pointSummary?.totalPointsEarned ?? 0).toLocaleString("vi-VN")}
          note="Nạp điểm, hoàn điểm và phần thưởng"
          tone="accent"
          loading={isDataLoading && !pointSummary}
        />
        <MetricCard
          label="Tổng điểm đã chi"
          value={(pointSummary?.totalPointsSpent ?? 0).toLocaleString("vi-VN")}
          note="Vé dự đoán và các lần đổi thưởng"
          tone="warning"
          loading={isDataLoading && !pointSummary}
        />
      </div>

      <div className="spectator-wallet-insights">
        <article>
          <span>Đã chi cho dự đoán</span>
          <strong>{formatPoints(predictionSpent)}</strong>
          <p>Tổng điểm dùng để mua vé dự đoán.</p>
        </article>
        <article className="is-positive">
          <span>Đã nhận từ dự đoán</span>
          <strong>{formatPoints(predictionReceived)}</strong>
          <p>Bao gồm tiền thắng và các khoản hoàn điểm.</p>
        </article>
        <article className={cn(predictionReceived - predictionSpent >= 0 ? "is-positive" : "is-negative")}>
          <span>Chênh lệch dự đoán</span>
          <strong>{formatPoints(predictionReceived - predictionSpent)}</strong>
          <p>Điểm nhận được trừ điểm đã sử dụng.</p>
        </article>
      </div>

      <Panel title="Nạp điểm vào ví" subtitle="Tỷ giá hiện tại: 100.000 điểm = 1.000 VND">
        <form className="spectator-topup-layout" onSubmit={submitTopUp}>
          <div className="spectator-topup-inputs">
            <label htmlFor="wallet-topup-points">Số điểm muốn nạp</label>
            <div className="spectator-topup-field">
              <input
                id="wallet-topup-points"
                min={MIN_TOP_UP_POINTS}
                step={100}
                type="number"
                value={topUpPoints}
                onChange={(event) => setTopUpPoints(Number(event.target.value))}
              />
              <span>điểm</span>
            </div>
            <div className="spectator-topup-presets" aria-label="Chọn nhanh số điểm nạp">
              {QUICK_TOP_UP_POINTS.map((points) => (
                <button
                  key={points}
                  type="button"
                  className={cn(topUpPoints === points && "is-selected")}
                  onClick={() => setTopUpPoints(points)}
                >
                  {points.toLocaleString("vi-VN")}
                </button>
              ))}
            </div>
          </div>

          <aside className="spectator-topup-summary">
            <span>Số tiền thanh toán dự kiến</span>
            <strong>{formatVnd(convertedVnd)}</strong>
            <p>Bạn sẽ nhận {Number.isFinite(topUpPoints) ? formatPoints(topUpPoints) : "0 điểm"} vào ví.</p>
            <div className="spectator-topup-actions">
              <button className="primary-button" type="button" disabled={submitting !== null} onClick={submitPayosTopUp}>
                {submitting === "payos" ? <><Spinner size="sm" onPrimary /> Đang chuyển hướng…</> : "Thanh toán qua PayOS"}
              </button>
              <button className="secondary-button" type="submit" disabled={submitting !== null}>
                {submitting === "mock" ? <><Spinner size="sm" /> Đang nạp…</> : "Nạp nhanh bản demo"}
              </button>
            </div>
            <small>“Nạp nhanh bản demo” dùng cho kiểm thử và không mở cổng thanh toán.</small>
          </aside>
        </form>
      </Panel>

      <Panel
        title="Lịch sử ví điểm"
        subtitle={`Đang hiển thị ${myTransactions.length} trên ${allTransactions.length} giao dịch`}
        action={
          <div className="filter-tabs spectator-friendly-tabs" aria-label="Lọc lịch sử Ví điểm">
            {(["all", "credit", "debit", "prediction", "topup"] as WalletFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cn("filter-tab", filter === item && "is-active")}
                onClick={() => setFilter(item)}
              >
                {FILTER_LABEL[item]}
              </button>
            ))}
          </div>
        }
      >
        {isDataLoading && allTransactions.length === 0 && <LoadingState label="Đang tải lịch sử Ví điểm…" />}
        {!isDataLoading && myTransactions.length === 0 && (
          <div className="empty-state spectator-empty-state">
            <strong>Chưa có giao dịch phù hợp</strong>
            <p>Các lần nạp, chi, nhận thưởng và hoàn điểm sẽ xuất hiện tại đây.</p>
          </div>
        )}

        <div className="spectator-wallet-history">
          {myTransactions.map((transaction) => (
            <article key={transaction.id} className={cn("spectator-wallet-transaction", `is-${transaction.direction}`)}>
              <div className="spectator-wallet-direction" aria-hidden>{transaction.rawPoints >= 0 ? "+" : "−"}</div>
              <div className="spectator-wallet-transaction-main">
                <span>{TRANSACTION_LABELS[transaction.type] ?? "Giao dịch điểm"}</span>
                <h3>{translateTransactionTitle(transaction.title, transaction.type)}</h3>
                <p>{formatDateTime(transaction.createdAt)}</p>
              </div>
              <div className="spectator-wallet-amount">
                <strong>{transaction.rawPoints > 0 ? "+" : ""}{formatPoints(transaction.rawPoints)}</strong>
                <span>Số dư sau giao dịch: {formatPoints(transaction.balanceAfter)}</span>
              </div>
              <Badge tone={transaction.direction === "credit" ? "success" : transaction.direction === "debit" ? "danger" : "neutral"}>
                {transactionStatus(transaction.direction)}
              </Badge>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
