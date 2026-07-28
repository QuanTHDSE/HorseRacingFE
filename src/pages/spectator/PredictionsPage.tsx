import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, Spinner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { Tone } from "../../types";
import { cn } from "../../utils/cn";
import { viPredictionStatus } from "../../utils/viLabels";

type HistoryFilter = "all" | "open" | "won" | "lost";

const HISTORY_FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "Tất cả",
  open: "Đang mở",
  won: "Đã thắng",
  lost: "Đã thua",
};

function formatDateTime(value?: string): string {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPointText(value: string): string {
  return value.replace(/\bpts\b/gi, "điểm");
}

function predictionTone(status: string): Tone {
  if (status === "Won") return "success";
  if (status === "Lost" || status === "Cancelled") return "danger";
  if (status === "Partial") return "info";
  return "warning";
}

export default function PredictionsPage() {
  const { user, appState, isDataLoading, handleCreatePrediction, handleCancelPrediction } = useApp();
  const feedback = useFeedback();
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [ticketCountInput, setTicketCountInput] = useState("1");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (!user) return null;

  const myPredictions = appState.predictions.filter((prediction) => prediction.spectatorId === user.id);
  const openRaces = appState.spectatorRaces.filter((race) => race.canPredict && !race.hasPrediction);
  const balance = appState.spectatorPoints?.currentBalance ?? 0;
  const activeCount = myPredictions.filter((prediction) => prediction.status === "Open").length;
  const wonCount = myPredictions.filter((prediction) => prediction.status === "Won").length;

  const selectedRace = openRaces.find((race) => race.id === selectedRaceId) ?? null;
  const selectedHorse = selectedRace?.participants.find((participant) => participant.id === selectedHorseId) ?? null;
  const ticketPrice = selectedRace?.predictionConfig.poolEnabled ? selectedRace.predictionConfig.ticketPrice : 0;
  const ticketCount = Math.max(0, Number.parseInt(ticketCountInput, 10) || 0);
  const cost = ticketPrice * ticketCount;
  const remainingBalance = balance - cost;
  const quickCounts = selectedRace?.predictionConfig.quickRiskMultipliers.length
    ? selectedRace.predictionConfig.quickRiskMultipliers
    : [1];

  const filteredPredictions = useMemo(() => myPredictions.filter((prediction) => {
    if (historyFilter === "open") return prediction.status === "Open";
    if (historyFilter === "won") return prediction.status === "Won";
    if (historyFilter === "lost") return prediction.status === "Lost";
    return true;
  }), [historyFilter, myPredictions]);

  function selectRace(raceId: string) {
    setSelectedRaceId(raceId);
    setSelectedHorseId(null);
    setTicketCountInput("1");
  }

  function selectHorse(horseId: string) {
    setSelectedHorseId(horseId);
    setTicketCountInput("1");
  }

  async function submit() {
    if (!selectedRace || !selectedHorse || ticketCount < 1 || cost > balance) return;
    setSubmitting(true);
    try {
      await handleCreatePrediction(selectedRace.id, selectedHorse.id, ticketCount);
      feedback.success("Dự đoán đã được gửi thành công.");
      setSelectedRaceId(null);
      setSelectedHorseId(null);
      setTicketCountInput("1");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Gửi dự đoán thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelPrediction(predictionId: string) {
    setCancellingId(predictionId);
    try {
      await handleCancelPrediction(predictionId);
      feedback.success("Đã hủy dự đoán và cập nhật lại ví điểm.");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không thể hủy dự đoán.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page-stack spectator-friendly-page">
      <div className="metric-grid three">
        <MetricCard
          label="Số dư khả dụng"
          value={balance.toLocaleString("vi-VN")}
          note="Điểm có thể dùng để dự đoán"
          tone="success"
          loading={isDataLoading && !appState.spectatorPoints}
        />
        <MetricCard
          label="Cuộc đua đang mở"
          value={String(openRaces.length)}
          note="Có thể tham gia dự đoán"
          tone="accent"
          loading={isDataLoading && openRaces.length === 0}
        />
        <MetricCard
          label="Dự đoán đang chờ"
          value={String(activeCount)}
          note={`${wonCount} dự đoán đã thắng`}
          tone="warning"
          loading={isDataLoading && myPredictions.length === 0}
        />
      </div>

      <Panel title="Tạo dự đoán mới" subtitle="Hoàn thành lần lượt 3 bước để chọn ngựa chiến thắng">
        {isDataLoading && openRaces.length === 0 ? (
          <LoadingState label="Đang tải cuộc đua mở dự đoán…" />
        ) : openRaces.length === 0 ? (
          <div className="empty-state spectator-empty-state">
            <strong>Chưa có cuộc đua mở dự đoán</strong>
            <p>Hãy quay lại khi ban tổ chức mở cổng dự đoán cho cuộc đua mới.</p>
          </div>
        ) : (
          <div className="spectator-prediction-builder">
            <section className="spectator-prediction-step">
              <div className="spectator-step-heading">
                <span>1</span>
                <div>
                  <h3>Chọn cuộc đua</h3>
                  <p>Chỉ hiển thị những cuộc đua đang nhận dự đoán.</p>
                </div>
              </div>
              <div className="spectator-prediction-races">
                {openRaces.map((race) => (
                  <button
                    key={race.id}
                    type="button"
                    className={cn("spectator-prediction-race", selectedRaceId === race.id && "is-selected")}
                    onClick={() => selectRace(race.id)}
                  >
                    <span>{race.tournamentName}</span>
                    <strong>{race.name}</strong>
                    <p>{formatDateTime(race.scheduledAt)}</p>
                    <div>
                      <small>{race.participants.length} ngựa</small>
                      <small>{race.predictionConfig.ticketPrice.toLocaleString("vi-VN")} điểm/vé</small>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selectedRace && (
              <section className="spectator-prediction-step">
                <div className="spectator-step-heading">
                  <span>2</span>
                  <div>
                    <h3>Chọn ngựa chiến thắng</h3>
                    <p>Chọn một ngựa mà bạn tin sẽ về đích đầu tiên.</p>
                  </div>
                </div>
                <div className="spectator-prediction-horses">
                  {selectedRace.participants.map((horse) => (
                    <button
                      key={horse.id}
                      type="button"
                      className={cn("spectator-prediction-horse", selectedHorseId === horse.id && "is-selected")}
                      onClick={() => selectHorse(horse.id)}
                    >
                      <span>Làn {horse.laneNumber || "—"}</span>
                      <strong>{horse.name}</strong>
                      <small>{horse.ticketCount.toLocaleString("vi-VN")} vé đã chọn</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {selectedHorse && (
              <section className="spectator-prediction-step">
                <div className="spectator-step-heading">
                  <span>3</span>
                  <div>
                    <h3>Chọn số vé và xác nhận</h3>
                    <p>Số vé càng nhiều thì mức đóng góp vào quỹ dự đoán càng cao.</p>
                  </div>
                </div>

                <div className="spectator-ticket-layout">
                  <div className="spectator-ticket-picker">
                    <label htmlFor="prediction-ticket-count">Số vé dự đoán</label>
                    <div className="spectator-ticket-counter">
                      <button type="button" onClick={() => setTicketCountInput(String(Math.max(1, ticketCount - 1)))} aria-label="Giảm số vé">−</button>
                      <input
                        id="prediction-ticket-count"
                        type="number"
                        min={1}
                        value={ticketCountInput}
                        onChange={(event) => setTicketCountInput(event.target.value)}
                      />
                      <button type="button" onClick={() => setTicketCountInput(String(ticketCount + 1))} aria-label="Tăng số vé">+</button>
                    </div>
                    <div className="spectator-ticket-quick" aria-label="Chọn nhanh số vé">
                      {quickCounts.map((count) => (
                        <button
                          key={count}
                          type="button"
                          className={cn(ticketCount === count && "is-selected")}
                          onClick={() => setTicketCountInput(String(count))}
                        >
                          {count} vé
                        </button>
                      ))}
                    </div>
                    {ticketCount < 1 && <p className="spectator-inline-error">Số vé phải lớn hơn 0.</p>}
                    {ticketCount > 0 && cost > balance && (
                      <p className="spectator-inline-error">Bạn còn thiếu {(cost - balance).toLocaleString("vi-VN")} điểm.</p>
                    )}
                  </div>

                  <aside className="spectator-prediction-summary">
                    <div><span>Cuộc đua</span><strong>{selectedRace.name}</strong></div>
                    <div><span>Ngựa đã chọn</span><strong>{selectedHorse.name}</strong></div>
                    <div><span>Đơn giá</span><strong>{ticketPrice.toLocaleString("vi-VN")} điểm</strong></div>
                    <div><span>Số vé</span><strong>{ticketCount}</strong></div>
                    <div className="is-total"><span>Tổng chi phí</span><strong>{cost.toLocaleString("vi-VN")} điểm</strong></div>
                    <div><span>Số dư sau dự đoán</span><strong className={cn(remainingBalance < 0 && "is-negative")}>{remainingBalance.toLocaleString("vi-VN")} điểm</strong></div>
                    <button
                      type="button"
                      className="primary-button full-width"
                      disabled={ticketCount < 1 || cost > balance || submitting}
                      onClick={submit}
                    >
                      {submitting ? <><Spinner size="sm" onPrimary /> Đang gửi…</> : "Xác nhận dự đoán"}
                    </button>
                  </aside>
                </div>
              </section>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Lịch sử dự đoán"
        subtitle={`Đang hiển thị ${filteredPredictions.length} trên ${myPredictions.length} dự đoán`}
        action={
          <div className="filter-tabs spectator-friendly-tabs" aria-label="Lọc lịch sử dự đoán">
            {(["all", "open", "won", "lost"] as HistoryFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cn("filter-tab", historyFilter === item && "is-active")}
                onClick={() => setHistoryFilter(item)}
              >
                {HISTORY_FILTER_LABEL[item]}
              </button>
            ))}
          </div>
        }
      >
        {isDataLoading && myPredictions.length === 0 && <LoadingState label="Đang tải lịch sử dự đoán…" />}
        {!isDataLoading && filteredPredictions.length === 0 && (
          <div className="empty-state spectator-empty-state">
            <strong>Chưa có dự đoán phù hợp</strong>
            <p>Các dự đoán đã gửi sẽ được lưu và cập nhật kết quả tại đây.</p>
          </div>
        )}
        <div className="spectator-prediction-history">
          {filteredPredictions.map((prediction) => (
            <article key={prediction.id} className={cn("spectator-prediction-history-item", prediction.status === "Won" && "is-won")}>
              <div className="spectator-prediction-history-main">
                <span>{prediction.tournamentName}</span>
                <h3>{prediction.raceName}</h3>
                <p>Ngựa dự đoán: <strong>{prediction.horse}</strong></p>
              </div>
              <dl>
                <div><dt>Số vé</dt><dd>{prediction.tickets}</dd></div>
                <div><dt>Chi phí</dt><dd>{formatPointText(prediction.cost)}</dd></div>
                <div><dt>Phần thưởng</dt><dd>{formatPointText(prediction.reward)}</dd></div>
              </dl>
              <div className="spectator-prediction-history-actions">
                <Badge tone={predictionTone(prediction.status)}>{viPredictionStatus(prediction.status)}</Badge>
                {prediction.status === "Open" && (
                  <button
                    className="danger-button btn-xs"
                    type="button"
                    disabled={cancellingId === prediction.id}
                    onClick={() => cancelPrediction(prediction.id)}
                  >
                    {cancellingId === prediction.id ? "Đang hủy…" : "Hủy dự đoán"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
