import { useNavigate } from "react-router-dom";
import { Badge, LoadingState, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { SpectatorRace } from "../../types";
import { viPredictionStatus } from "../../utils/viLabels";

function formatRaceTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật thời gian";

  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function byScheduledTime(a: SpectatorRace, b: SpectatorRace): number {
  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

export default function SpectatorDashboard() {
  const navigate = useNavigate();
  const { user, appState, isDataLoading } = useApp();
  if (!user) return null;

  const myPredictions = appState.predictions.filter((prediction) => prediction.spectatorId === user.id);
  const liveRaces = appState.spectatorRaces.filter((race) => race.liveStatus === "Live").sort(byScheduledTime);
  const upcomingRaces = appState.spectatorRaces
    .filter((race) => race.liveStatus === "Upcoming")
    .sort(byScheduledTime);
  const nextRace = upcomingRaces[0];
  const openPredictions = myPredictions.filter((prediction) =>
    ["Open", "Pending", "Partial"].includes(prediction.status),
  ).length;
  const wonPredictions = myPredictions.filter((prediction) => prediction.status === "Won").length;
  const pointBalance = appState.spectatorPoints?.currentBalance ?? 0;
  const hasLivePositions = appState.liveBoard.positions.length > 0;

  return (
    <div className="page-stack spectator-dashboard-page">
      <section className="hero-card spectator-dashboard-hero">
        <div>
          <Badge tone="accent">Tổng quan Khán giả</Badge>
          <h3>Theo dõi lịch đua, kết quả trực tiếp, dự đoán và phần thưởng ở một nơi</h3>
          <p>Thông tin quan trọng nhất được cập nhật theo trạng thái thực tế của từng cuộc đua.</p>
          <div className="spectator-dashboard-hero-actions">
            <button className="primary-button" type="button" onClick={() => navigate("/live")}>
              Xem kết quả trực tiếp
            </button>
            <button className="secondary-button" type="button" onClick={() => navigate("/predictions")}>
              Dự đoán ngay
            </button>
          </div>
        </div>
        <div className="spectator-dashboard-hero-mark" aria-hidden="true">
          <span>{liveRaces.length > 0 ? "LIVE" : "LỊCH"}</span>
          <strong>{liveRaces.length > 0 ? liveRaces.length : upcomingRaces.length}</strong>
          <small>{liveRaces.length > 0 ? "cuộc đua đang diễn ra" : "cuộc đua sắp tới"}</small>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard
          label="Đang diễn ra"
          value={String(liveRaces.length)}
          note={liveRaces.length > 0 ? "Có thể theo dõi ngay bây giờ" : nextRace ? `Sắp tới: ${nextRace.name}` : "Chưa có lịch đua mới"}
          tone={liveRaces.length > 0 ? "success" : undefined}
          loading={isDataLoading && appState.spectatorRaces.length === 0}
        />
        <MetricCard
          label="Dự đoán đang chờ"
          value={String(openPredictions)}
          note={`${wonPredictions} dự đoán đã thắng`}
          tone="accent"
          loading={isDataLoading && myPredictions.length === 0}
        />
        <MetricCard
          label="Số dư ví điểm"
          value={pointBalance.toLocaleString("vi-VN")}
          note="Sẵn sàng để tham gia dự đoán"
          tone="success"
          loading={isDataLoading && !appState.spectatorPoints}
        />
      </div>

      <div className="content-grid two spectator-dashboard-content">
        <Panel
          title={liveRaces.length > 0 || hasLivePositions ? "Đang trực tiếp" : "Lịch đua sắp diễn ra"}
          subtitle={liveRaces.length > 0 || hasLivePositions
            ? "Theo dõi diễn biến mới nhất"
            : upcomingRaces.length > 0
              ? `${upcomingRaces.length} cuộc đua đang chờ bắt đầu`
              : "Lịch mới sẽ được cập nhật tại đây"}
          action={
            <button className="secondary-button btn-xs" type="button" onClick={() => navigate("/live")}>
              Xem tất cả
            </button>
          }
        >
          {isDataLoading && appState.spectatorRaces.length === 0 && !hasLivePositions ? (
            <LoadingState label="Đang tải lịch cuộc đua…" />
          ) : hasLivePositions ? (
            <div className="spectator-dashboard-live-wrap">
              <div className="spectator-dashboard-live-head">
                <span className="spectator-live-pulse" aria-hidden="true" />
                <div>
                  <strong>{appState.liveBoard.title || "Cuộc đua đang diễn ra"}</strong>
                  <p>{appState.liveBoard.phase || "Bảng xếp hạng đang được cập nhật"}</p>
                </div>
              </div>
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
            </div>
          ) : liveRaces.length > 0 ? (
            <div className="spectator-dashboard-live-races">
              {liveRaces.slice(0, 2).map((race) => (
                <article className="spectator-dashboard-race-card is-live" key={race.id}>
                  <div className="spectator-dashboard-race-status">
                    <span className="spectator-live-pulse" aria-hidden="true" />
                    <strong>Đang diễn ra</strong>
                  </div>
                  <h3>{race.name}</h3>
                  <p>{race.tournamentName} · Vòng {race.round}</p>
                  <div className="spectator-dashboard-race-facts">
                    <span>{formatRaceTime(race.scheduledAt)}</span>
                    <span>{race.participants.length} ngựa</span>
                    <span>{race.distance ? `${race.distance} m` : "Chưa có cự ly"}</span>
                  </div>
                  <button className="primary-button btn-xs" type="button" onClick={() => navigate("/live")}>
                    Theo dõi cuộc đua
                  </button>
                </article>
              ))}
            </div>
          ) : upcomingRaces.length > 0 ? (
            <div className="spectator-dashboard-upcoming-list">
              {upcomingRaces.slice(0, 4).map((race, index) => (
                <article className="spectator-dashboard-upcoming-row" key={race.id}>
                  <span className="spectator-dashboard-schedule-order" aria-hidden="true">{index + 1}</span>
                  <div>
                    <strong>{race.name}</strong>
                    <p>{race.tournamentName} · Vòng {race.round}</p>
                    <time>{formatRaceTime(race.scheduledAt)}</time>
                  </div>
                  <Badge tone={race.canPredict ? "accent" : "neutral"}>{race.participants.length} ngựa</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="spectator-dashboard-schedule-empty" role="status">
              <div className="spectator-dashboard-empty-icon" aria-hidden="true">LĐ</div>
              <div>
                <strong>Chưa có lịch đua sắp tới</strong>
                <p>Lịch mới sẽ xuất hiện tại đây sau khi được công bố.</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Dự đoán gần đây"
          subtitle={myPredictions.length > 0 ? `${myPredictions.length} dự đoán của bạn` : "Theo dõi các lựa chọn đã gửi"}
          action={
            <button className="secondary-button btn-xs" type="button" onClick={() => navigate("/predictions")}>
              Quản lý dự đoán
            </button>
          }
        >
          {isDataLoading && myPredictions.length === 0 ? (
            <LoadingState label="Đang tải dự đoán…" />
          ) : myPredictions.length === 0 ? (
            <div className="spectator-dashboard-prediction-empty">
              <div className="spectator-dashboard-empty-icon" aria-hidden="true">DĐ</div>
              <strong>Bạn chưa có dự đoán nào</strong>
              <p>Chọn cuộc đua và ngựa bạn tin sẽ chiến thắng để bắt đầu.</p>
              <button className="primary-button btn-xs" type="button" onClick={() => navigate("/predictions")}>
                Tạo dự đoán đầu tiên
              </button>
            </div>
          ) : (
            <div className="spectator-dashboard-predictions">
              {myPredictions.slice(0, 3).map((prediction) => (
                <article key={prediction.id} className="spectator-dashboard-prediction-card">
                  <div className="card-head">
                    <div>
                      <span>{prediction.tournamentName}</span>
                      <strong>{prediction.horse}</strong>
                    </div>
                    <Badge tone={prediction.status === "Won" ? "success" : prediction.status === "Lost" ? "danger" : "warning"}>
                      {viPredictionStatus(prediction.status)}
                    </Badge>
                  </div>
                  <p>{prediction.raceName}</p>
                  <div className="spectator-dashboard-prediction-meta">
                    <span>{prediction.tickets} vé</span>
                    <span>{prediction.reward === "—" ? "Chưa có thưởng" : `Thưởng ${prediction.reward}`}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
