import { useState } from "react";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";
import type { PenaltyDetail } from "../types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORY_LABEL: Record<string, string> = {
  race_conduct: "Ứng xử thi đấu",
  medical: "Y tế",
  equipment: "Trang bị",
  administrative: "Hành chính",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "Nhẹ",
  medium: "Trung bình",
  high: "Nặng",
  critical: "Rất nặng",
};

const TARGET_LABEL: Record<string, string> = {
  horse: "Ngựa",
  jockey: "Nài ngựa",
  both: "Ngựa & nài",
};

const PENALTY_APPLIED_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  demote: "Tụt hạng",
  disqualify: "Tước quyền",
  disqualification: "Tước quyền",
  restart: "Chạy lại",
  time_ban: "Cấm có thời hạn",
  permanent_ban: "Cấm vĩnh viễn",
};

export default function SuspensionBanner() {
  const { user, handleGetJockeyPenaltyDetail } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<PenaltyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const penalty = user?.penaltyStatus;
  if (!penalty?.isBanned) return null;

  const label = penalty.bannedUntil
    ? `Bạn bị cấm thi đấu đến hết ${fmtDate(penalty.bannedUntil)}.`
    : "Bạn bị ban tổ chức cấm thi đấu vô thời hạn.";

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && detail === null && !loadingDetail) {
      setLoadingDetail(true);
      try {
        const res = await handleGetJockeyPenaltyDetail();
        setDetail(res);
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  return (
    <div className={cn("notification-card", "notification-danger", "suspension-banner")}>
      <div className="suspension-banner-row">
        <span className="suspension-banner-icon" aria-hidden>⚠</span>
        <p className="suspension-banner-text">
          {label}{penalty.reason ? ` Lý do: ${penalty.reason}` : ""}
        </p>
      </div>
      <button type="button" className="secondary-button btn-xs" onClick={toggle}>
        {expanded ? "Ẩn chi tiết" : "Xem thêm"}
      </button>

      {expanded && (
        <div className="suspension-detail">
          {loadingDetail && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Đang tải chi tiết…</p>
          )}
          {!loadingDetail && detail === null && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Không có chi tiết vi phạm.</p>
          )}
          {!loadingDetail && detail !== null && (
            <>
              {detail.rule && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span><span style={{ color: "var(--text-muted)" }}>Mã luật</span> {detail.rule.code}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Tên luật</span> {detail.rule.name}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Phân loại</span> {CATEGORY_LABEL[detail.rule.category] ?? detail.rule.category}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Mức độ</span> {SEVERITY_LABEL[detail.rule.severity] ?? detail.rule.severity}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Đối tượng</span> {TARGET_LABEL[detail.target] ?? detail.target}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Hình thức phạt</span> {detail.penaltyApplied ? (PENALTY_APPLIED_LABEL[detail.penaltyApplied] ?? detail.penaltyApplied) : "—"}</span>
                  {detail.rule.banDurationDays > 0 && (
                    <span><span style={{ color: "var(--text-muted)" }}>Thời hạn cấm</span> {detail.rule.banDurationDays} ngày</span>
                  )}
                </div>
              )}
              <p style={{ margin: "0 0 4px", fontSize: "0.875rem" }}>{detail.description}</p>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Ghi nhận {fmtDate(detail.recordedAt)}</span>
              {detail.race && (
                <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Cuộc đua liên quan: <strong>{detail.race.name}</strong> · {fmtDate(detail.race.scheduledAt)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
