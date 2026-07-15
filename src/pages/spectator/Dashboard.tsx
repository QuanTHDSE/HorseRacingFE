import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { viPredictionStatus } from "../../utils/viLabels";

export default function SpectatorDashboard() {
  const { user, appState } = useApp();
  if (!user) return null;
  const myPredictions = appState.predictions.filter((p) => p.spectatorId === user.id);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Tổng quan Khán giả</Badge>
          <h3>Theo dõi lịch đua, kết quả trực tiếp, dự đoán và phần thưởng ở một nơi</h3>
          <p>Trang này ưu tiên các cuộc đua trực tiếp, dự đoán đang mở và thông báo thưởng mới nhất.</p>
        </div>
      </section>

      <div className="metric-grid three">
        <MetricCard label="Cuộc đua trực tiếp hôm nay" value="8"                          note="Chuyển nhanh giữa các cuộc đua"          />
        <MetricCard label="Vé dự đoán"                 value={String(myPredictions.length)} note="Đang mở, thắng và thua"  tone="accent"  />
        <MetricCard label="Thưởng sẵn sàng"            value="4.8M"                       note="1 phần thưởng cho cuộc đua 07" tone="success" />
      </div>

      <div className="content-grid two">
        <Panel title="Bảng trực tiếp" subtitle="Cuộc đua đang theo dõi">
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
        </Panel>

        <Panel title="Lịch sử dự đoán" subtitle="Kết quả dự đoán gần đây">
          <div className="card-list">
            {myPredictions.map((prediction) => (
              <article key={prediction.id} className="info-card">
                <div className="card-head">
                  <strong>{prediction.horse}</strong>
                  <Badge tone={prediction.status === "Won" ? "success" : prediction.status === "Lost" ? "danger" : "warning"}>
                    {viPredictionStatus(prediction.status)}
                  </Badge>
                </div>
                <p>{prediction.raceId}</p>
                <span>Thưởng {prediction.reward}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
