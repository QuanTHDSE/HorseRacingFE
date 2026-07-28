import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { viInvitationStatus, viRaceStatus } from "../../utils/viLabels";
import { formatRaceDateTime, raceTimestamp } from "./jockeyUi";

type Filter = "all" | "pending" | "accepted" | "declined";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Tất cả",
  pending: "Chờ phản hồi",
  accepted: "Đã chấp nhận",
  declined: "Đã từ chối",
};

const STATUS_TONE = {
  Pending: "warning",
  Accepted: "success",
  Declined: "danger",
} as const;

const INVITATION_PRIORITY: Record<string, number> = {
  Pending: 0,
  Accepted: 1,
  Declined: 2,
};

export default function InvitationsPage() {
  const { appState, isDataLoading, handleRespondJockeyInvitation } = useApp();
  const feedback = useFeedback();
  const [filter, setFilter] = useState<Filter>("all");
  const [acting, setActing] = useState<string | null>(null);

  const all = appState.invitations;
  const pendingCount = all.filter((invitation) => invitation.status === "Pending").length;
  const acceptedCount = all.filter((invitation) => invitation.status === "Accepted").length;
  const declinedCount = all.filter((invitation) => invitation.status === "Declined").length;

  const filtered = useMemo(() => all
    .filter((invitation) => {
      if (filter === "pending") return invitation.status === "Pending";
      if (filter === "accepted") return invitation.status === "Accepted";
      if (filter === "declined") return invitation.status === "Declined";
      return true;
    })
    .sort((left, right) => {
      const statusDiff = (INVITATION_PRIORITY[left.status] ?? 9) - (INVITATION_PRIORITY[right.status] ?? 9);
      return statusDiff || raceTimestamp(left.raceDate) - raceTimestamp(right.raceDate);
    }), [all, filter]);

  async function respond(id: string, action: "Accepted" | "Declined") {
    setActing(id);
    try {
      await handleRespondJockeyInvitation(id, action);
      feedback.success(action === "Accepted" ? "Đã chấp nhận lời mời." : "Đã từ chối lời mời.");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không thể phản hồi lời mời. Vui lòng thử lại.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="page-stack jockey-page">
      <SuspensionBanner />

      <div className="metric-grid three">
        <MetricCard
          label="Chờ phản hồi"
          value={String(pendingCount)}
          note="Ưu tiên xử lý sớm"
          tone="warning"
          loading={isDataLoading && all.length === 0}
        />
        <MetricCard
          label="Đã chấp nhận"
          value={String(acceptedCount)}
          note="Lời mời đã xác nhận"
          tone="success"
          loading={isDataLoading && all.length === 0}
        />
        <MetricCard
          label="Đã từ chối"
          value={String(declinedCount)}
          note="Lời mời không tham gia"
          tone="neutral"
          loading={isDataLoading && all.length === 0}
        />
      </div>

      <Panel
        title="Lời mời tham gia cuộc đua"
        subtitle={`Đang hiển thị ${filtered.length} trên ${all.length} lời mời`}
        action={
          <div className="filter-tabs jockey-filter-tabs" aria-label="Lọc lời mời">
            {(["all", "pending", "accepted", "declined"] as Filter[]).map((item) => (
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
        {isDataLoading && all.length === 0 && <LoadingState label="Đang tải lời mời…" />}
        {!isDataLoading && filtered.length === 0 && (
          <div className="empty-state jockey-empty-state">
            <strong>Không có lời mời trong mục này</strong>
            <p>Các lời mời phù hợp sẽ xuất hiện tại đây.</p>
          </div>
        )}

        <div className="jockey-card-grid">
          {filtered.map((invitation) => (
            <article
              key={invitation.id}
              className={cn("jockey-card", invitation.status === "Pending" && "is-pending")}
            >
              <div className="jockey-card-topline">
                <span>Lời mời từ {invitation.ownerName ?? "chủ ngựa"}</span>
                <Badge tone={STATUS_TONE[invitation.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                  {viInvitationStatus(invitation.status)}
                </Badge>
              </div>

              <div className="jockey-card-heading">
                <h3>{invitation.raceName ?? invitation.raceId}</h3>
                <p>Kiểm tra thông tin trước khi xác nhận tham gia.</p>
              </div>

              <dl className="jockey-detail-grid">
                <div>
                  <dt>Ngựa thi đấu</dt>
                  <dd>{invitation.horseName ?? "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>{formatRaceDateTime(invitation.raceDate)}</dd>
                </div>
                <div>
                  <dt>Chủ ngựa</dt>
                  <dd>{invitation.ownerName ?? "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Trạng thái cuộc đua</dt>
                  <dd>{invitation.raceStatus ? viRaceStatus(invitation.raceStatus) : "Chưa cập nhật"}</dd>
                </div>
              </dl>

              {invitation.message && (
                <blockquote className="jockey-invitation-message">“{invitation.message}”</blockquote>
              )}

              {invitation.status === "Pending" && (
                <div className="jockey-card-actions">
                  <button
                    type="button"
                    className="danger-button jockey-action-button"
                    disabled={acting === invitation.id}
                    onClick={() => respond(invitation.id, "Declined")}
                  >
                    {acting === invitation.id ? "Đang xử lý…" : "Từ chối"}
                  </button>
                  <button
                    type="button"
                    className="primary-button jockey-action-button"
                    disabled={acting === invitation.id}
                    onClick={() => respond(invitation.id, "Accepted")}
                  >
                    {acting === invitation.id ? "Đang xử lý…" : "Chấp nhận lời mời"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
