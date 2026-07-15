import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";

export default function RewardsPage() {
  const { user, appState, handleTopUpPoints, handleCreatePayosTopUp } = useApp();
  const [topUpPoints, setTopUpPoints] = useState(100);
  const fb = useFeedback();
  const topUpError: string = ""; const setTopUpError = fb.error;
  const topUpMessage: string = ""; const setTopUpMessage = fb.success;
  const [submitting, setSubmitting] = useState(false);
  if (!user) return null;
  const myRewards = appState.rewards.filter((r) => r.spectatorId === user.id);

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
      <Panel title="Ví điểm" subtitle="1000 VND = 1 điểm · nạp tối thiểu 100 điểm">
        <div className="metric-grid three">
          <div className="metric-card">
            <span>Số dư hiện tại</span>
            <strong>{appState.spectatorPoints?.currentBalance ?? 0} điểm</strong>
            <p>Chỉ dùng nội bộ</p>
          </div>
          <div className="metric-card">
            <span>Tổng đã nhận</span>
            <strong>{appState.spectatorPoints?.totalPointsEarned ?? 0} điểm</strong>
            <p>Nạp và thưởng</p>
          </div>
          <div className="metric-card">
            <span>Tổng đã tiêu</span>
            <strong>{appState.spectatorPoints?.totalPointsSpent ?? 0} điểm</strong>
            <p>Đặt vé và đổi thưởng</p>
          </div>
        </div>

        <form className="inline-form" onSubmit={submitTopUp} style={{ marginTop: "16px" }}>
          <label className="field">
            <span>Số điểm nạp</span>
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

      <Panel title="Thưởng dự đoán" subtitle="Theo dõi trạng thái và việc nhận thưởng">
        <DataTable
          columns={[
            { key: "title",  label: "Phần thưởng" },
            { key: "amount", label: "Số lượng" },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={row.status === "Claimed" ? "neutral" : "success"}>{row.status === "Claimed" ? "Đã nhận" : "Sẵn sàng"}</Badge>
              ),
            },
          ]}
          rows={myRewards}
        />
      </Panel>
    </div>
  );
}
