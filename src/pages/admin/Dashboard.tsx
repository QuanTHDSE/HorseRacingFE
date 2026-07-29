import { Badge, LoadingState, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Tone } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  "Horse registration": "Đăng ký ngựa thi đấu",
  "Jockey registration": "Đăng ký nài ngựa",
  "Owner registration": "Đăng ký chủ ngựa",
};

const RACE_STATUS_PRIORITY: Record<string, number> = {
  Live: 0,
  Ready: 1,
  Upcoming: 2,
  Completed: 3,
  Cancelled: 4,
};

const RACE_STATUS_TONE: Record<string, Tone> = {
  Live: "success",
  Ready: "warning",
  Upcoming: "accent",
  Completed: "neutral",
  Cancelled: "danger",
};

function formatRaceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function AdminDashboard() {
  const { appState, isDataLoading } = useApp();
  const activeRaces = appState.races.filter((race) => !["Completed", "Cancelled"].includes(race.liveStatus));
  const assignedActiveRaces = activeRaces.filter((race) => Boolean(race.refereeId));
  const unassignedActiveRaces = activeRaces.length - assignedActiveRaces.length;
  const refereeNames = new Map(
    appState.users
      .filter((user) => user.role === "referee")
      .map((user) => [user.id, user.name]),
  );
  const tournamentNames = new Map(appState.tournaments.map((tournament) => [tournament.id, tournament.name]));
  const operationRaces = [...appState.races]
    .sort((left, right) => {
      const statusDifference = (RACE_STATUS_PRIORITY[left.liveStatus] ?? 99) - (RACE_STATUS_PRIORITY[right.liveStatus] ?? 99);
      if (statusDifference !== 0) return statusDifference;
      return new Date(left.date).getTime() - new Date(right.date).getTime();
    })
    .slice(0, 5);
  const pendingApprovals = appState.approvals.filter((approval) => approval.status === "Pending");
  const pendingPublishItems = appState.publishQueue.filter((item) => item.publishStatus !== "Published");
  const processingQueue = [
    ...pendingApprovals.map((approval) => ({
      id: `approval-${approval.id}`,
      kind: "approval" as const,
      category: "Hồ sơ đăng ký",
      title: APPROVAL_TYPE_LABEL[approval.type] ?? approval.type,
      description: approval.applicant,
      detail: approval.horseName ? `Ngựa đăng ký: ${approval.horseName}` : "Hồ sơ đang chờ quản trị viên kiểm tra",
      status: "Chờ duyệt",
    })),
    ...pendingPublishItems.map((item) => ({
      id: `publish-${item.id}`,
      kind: "publish" as const,
      category: "Kết quả cuộc đua",
      title: item.race,
      description: item.tournament,
      detail: item.resultStatus === "Referee confirmed"
        ? "Trọng tài đã xác nhận kết quả"
        : "Đang chờ trọng tài xác nhận kết quả",
      status: "Chờ công bố",
    })),
  ].slice(0, 5);

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
          loading={isDataLoading}
        />
        <MetricCard
          label="Giải đang diễn ra"
          value={String(appState.tournaments.filter((t) => t.status === "Live").length)}
          note="Theo dõi công bố kết quả"
          loading={isDataLoading}
        />
        <MetricCard
          label="Người dùng hoạt động"
          value={String(appState.users.filter((u) => u.status === "Active").length)}
          note="Theo dõi vai trò và lần truy cập"
          tone="success"
          loading={isDataLoading}
        />
        <MetricCard
          label="Hàng chờ công bố"
          value={String(appState.publishQueue.filter((p) => p.publishStatus !== "Published").length)}
          note="Kết quả chờ công bố"
          tone="accent"
          loading={isDataLoading}
        />
      </div>

      <div className="content-grid two">
        <Panel
          title="Hàng chờ xử lý"
          subtitle="Các tác vụ cần quản trị viên ưu tiên giải quyết"
        >
          <div className="admin-operation-summary" aria-label="Tổng quan hàng chờ">
            <div className="admin-operation-stat">
              <span>Tổng cần xử lý</span>
              <strong>{pendingApprovals.length + pendingPublishItems.length}</strong>
            </div>
            <div className="admin-operation-stat is-unassigned">
              <span>Đơn chờ duyệt</span>
              <strong>{pendingApprovals.length}</strong>
            </div>
            <div className="admin-operation-stat is-publish">
              <span>Chờ công bố</span>
              <strong>{pendingPublishItems.length}</strong>
            </div>
          </div>

          {isDataLoading && processingQueue.length === 0 && <LoadingState label="Đang tải hàng chờ…" />}
          {!isDataLoading && processingQueue.length === 0 && (
            <div className="admin-operation-empty">
              <strong>Hàng chờ đã được xử lý</strong>
              <p>Hiện không có đơn đăng ký hoặc kết quả nào cần quản trị viên xử lý.</p>
            </div>
          )}

          <div className="admin-queue-list">
            {processingQueue.map((item) => (
              <article key={item.id} className={`admin-queue-card is-${item.kind}`}>
                <div className="admin-queue-head">
                  <div>
                    <span className="admin-queue-category">{item.category}</span>
                    <strong>{item.title}</strong>
                  </div>
                  <Badge tone={item.kind === "approval" ? "warning" : "accent"}>{item.status}</Badge>
                </div>
                <p className="admin-queue-description">{item.description}</p>
                <div className="admin-queue-detail">{item.detail}</div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          title="Điều phối cuộc đua"
          subtitle="Lịch vận hành và tình trạng phân công trọng tài"
        >
          <div className="admin-operation-summary" aria-label="Tổng quan điều phối">
            <div className="admin-operation-stat">
              <span>Đang theo dõi</span>
              <strong>{activeRaces.length}</strong>
            </div>
            <div className="admin-operation-stat is-assigned">
              <span>Đã có trọng tài</span>
              <strong>{assignedActiveRaces.length}</strong>
            </div>
            <div className="admin-operation-stat is-unassigned">
              <span>Cần phân công</span>
              <strong>{unassignedActiveRaces}</strong>
            </div>
          </div>

          {isDataLoading && operationRaces.length === 0 && <LoadingState label="Đang tải lịch vận hành…" />}
          {!isDataLoading && operationRaces.length === 0 && (
            <div className="admin-operation-empty">
              <strong>Chưa có cuộc đua để điều phối</strong>
              <p>Các cuộc đua mới sẽ xuất hiện tại đây sau khi được tạo trong giải đấu.</p>
            </div>
          )}

          <div className="admin-operation-list">
            {operationRaces.map((race) => {
              const refereeName = race.refereeId ? refereeNames.get(race.refereeId) : null;
              const hasReferee = Boolean(race.refereeId);
              return (
                <article key={race.id} className="admin-operation-card">
                  <div className="admin-operation-head">
                    <div>
                      <span className="admin-operation-tournament">
                        {tournamentNames.get(race.tournamentId) ?? "Chưa xác định giải đấu"}
                      </span>
                      <strong>{race.name}</strong>
                    </div>
                    <Badge tone={RACE_STATUS_TONE[race.liveStatus] ?? "neutral"}>
                      {viRaceStatus(race.liveStatus)}
                    </Badge>
                  </div>

                  <div className="admin-operation-meta">
                    <span>{formatRaceTime(race.date)}</span>
                    <span>{race.distance}</span>
                    <span>Số vòng {race.round}</span>
                  </div>

                  <div className="admin-operation-assignment">
                    <div>
                      <span>Trọng tài phụ trách</span>
                      <strong>{refereeName ?? (hasReferee ? "Đã gán trọng tài" : "Chưa phân công")}</strong>
                    </div>
                    <Badge tone={hasReferee ? "success" : "warning"}>
                      {hasReferee ? "Đã phân công" : "Cần xử lý"}
                    </Badge>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
