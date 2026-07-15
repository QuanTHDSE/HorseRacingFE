import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { viRegStatus } from "../../utils/viLabels";

export default function AdminDashboard() {
  const { appState } = useApp();

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <Badge tone="accent">Tổng quan Quản trị</Badge>
          <h3>Trung tâm quản lý vận hành đua ngựa và dự đoán</h3>
          <p>Quản trị viên có thể quản lý tài khoản, lên lịch đua, duyệt đăng ký, phân công và công bố kết quả từ một bảng điều khiển thống nhất.</p>
        </div>
      </section>

      <div className="metric-grid four">
        <MetricCard
          label="Đơn chờ duyệt"
          value={String(appState.approvals.filter((a) => a.status === "Pending").length)}
          note="Cần xét duyệt hôm nay"
          tone="warning"
        />
        <MetricCard
          label="Giải đang diễn ra"
          value={String(appState.tournaments.filter((t) => t.status === "Live").length)}
          note="Theo dõi công bố kết quả"
        />
        <MetricCard
          label="Người dùng hoạt động"
          value={String(appState.users.filter((u) => u.status === "Active").length)}
          note="Theo dõi vai trò và lần truy cập"
          tone="success"
        />
        <MetricCard
          label="Hàng chờ công bố"
          value={String(appState.publishQueue.filter((p) => p.publishStatus !== "Published").length)}
          note="Kết quả chờ công bố"
          tone="accent"
        />
      </div>

      <div className="content-grid two">
        <Panel title="Hàng chờ xử lý" subtitle="Tóm tắt duyệt đơn và công bố">
          <div className="card-list">
            {appState.approvals.map((approval) => (
              <article key={approval.id} className="info-card">
                <div className="card-head">
                  <strong>{approval.type}</strong>
                  <Badge tone={approval.status === "Pending" ? "warning" : approval.status === "Approved" ? "success" : "danger"}>
                    {viRegStatus(approval.status)}
                  </Badge>
                </div>
                <p>{approval.applicant}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Phân công" subtitle="Cuộc đua, nài ngựa và trọng tài">
          <div className="card-list">
            {appState.assignments.map((a) => (
              <article key={a.id} className="info-card">
                <div className="card-head">
                  <strong>{a.race}</strong>
                  <Badge tone={a.status === "Assigned" ? "success" : "warning"}>{a.status === "Assigned" ? "Đã phân công" : "Chờ"}</Badge>
                </div>
                <p>{a.horse} • {a.jockey}</p>
                <span>{a.referee}</span>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
