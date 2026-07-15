import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { Approval } from "../../types";
import { cn } from "../../utils/cn";
import { viHealth, viRegStatus } from "../../utils/viLabels";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const HEALTH_TONE: Record<string, string> = {
  Fit: "success", Injured: "warning", Retired: "neutral",
};

export default function ApprovalsPage() {
  const { appState, handleUpdateRegistration } = useApp();

  // Detail panel (horse approval) state
  const [selected, setSelected]   = useState<Approval | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const fb = useFeedback();
  const actionMsg: string = "";
  const setActionMsg = (m?: string) => {
    if (!m || !m.trim()) return;
    const low = m.toLowerCase();
    if (low.includes("fail") || low.includes("thất bại") || low.includes("lỗi")) fb.error(m); else fb.success(m);
  };

  const all = appState.approvals;

  // ── Pipeline stages ──────────────────────────────────────────────────────
  const pendingHorse   = all.filter((a) => a.status === "Pending");
  const awaitingJockey = all.filter((a) => a.status === "Approved" && !a.jockeyName);
  const completed      = all.filter((a) => a.status === "Approved" && a.jockeyName);

  function openDetail(row: Approval) {
    if (selected?.id === row.id) {
      setSelected(null); setActionMsg(""); setAdminNote("");
      return;
    }
    setSelected(row); setActionMsg(""); setAdminNote("");
  }

  async function doDecision(status: "Approved" | "Rejected") {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg("");
    try {
      await handleUpdateRegistration(selected.id, status, adminNote.trim() || undefined);
      setActionMsg(status === "Approved" ? "Đã duyệt đơn đăng ký ngựa thành công." : "Đã từ chối đơn đăng ký ngựa.");
      setSelected(null);
      setAdminNote("");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Thao tác thất bại.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="page-stack">

      {/* ── Pipeline summary chips ── */}
      <div className="approvals-summary">
        <div className="summary-chip">
          <span className="summary-chip-label">1 · Chờ duyệt ngựa</span>
          <Badge tone={pendingHorse.length > 0 ? "warning" : "success"}>{pendingHorse.length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">2 · Chờ nài ngựa</span>
          <Badge tone={awaitingJockey.length > 0 ? "accent" : "neutral"}>{awaitingJockey.length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">3 · Hoàn tất</span>
          <Badge tone="success">{completed.length}</Badge>
        </div>
      </div>

      {/* ══ STAGE 1 — Horse approvals ══ */}
      <Panel
        title="Bước 1 · Duyệt ngựa"
        subtitle="Xem suất đua của ngựa và duyệt hoặc từ chối — chưa cần nài ở bước này"
      >
        {actionMsg && !selected && (
          <div className={cn("form-banner", actionMsg.toLowerCase().includes("fail") ? "form-banner-error" : "form-banner-success")}>
            {actionMsg}
          </div>
        )}
        <DataTable
          columns={[
            { key: "ownerName",   label: "Chủ ngựa",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",   label: "Ngựa",  render: (row) => row.horseName ?? "—" },
            { key: "horseBreed",  label: "Giống",  render: (row) => row.horseBreed ?? "—" },
            { key: "raceName",    label: "Cuộc đua",   render: (row) => row.raceName ?? "—" },
            {
              key: "horsePdfUrl",
              label: "PDF",
              render: (row) => row.horsePdfUrl ? (
                <a className="secondary-button btn-xs" href={row.horsePdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Xem</a>
              ) : <span style={{ color: "var(--text-muted)" }}>—</span>,
            },
            { key: "submittedAt", label: "Đã gửi", render: (row) => fmtDate(row.submittedAt) },
            {
              key: "id",
              label: "Xét duyệt",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button", "btn-xs", selected?.id === row.id && "is-active")}
                  onClick={() => openDetail(row)}
                >
                  {selected?.id === row.id ? "Đóng" : "Xét duyệt"}
                </button>
              ),
            },
          ]}
          rows={pendingHorse}
          empty="Không có đơn đăng ký ngựa nào chờ duyệt."
        />
      </Panel>

      {/* ── Horse approval detail panel (no jockey field) ── */}
      {selected && (
        <Panel
          title={`Xét duyệt ngựa — ${selected.horseName ?? selected.applicant}`}
          subtitle="Chi tiết ngựa và cuộc đua của đơn đăng ký này"
          action={
            <button type="button" className="secondary-button btn-xs" onClick={() => { setSelected(null); setActionMsg(""); setAdminNote(""); }}>
              Đóng
            </button>
          }
        >
          {actionMsg && (
            <div className={cn("form-banner", actionMsg.toLowerCase().includes("fail") ? "form-banner-error" : "form-banner-success")}>
              {actionMsg}
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Chủ ngựa</span>
              <strong>{selected.ownerName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Đã gửi</span>
              <strong>{fmtDate(selected.submittedAt)}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <Badge tone="warning">{viRegStatus(selected.status)}</Badge>
            </div>

            <div className="detail-item">
              <span className="detail-label">Ngựa</span>
              <strong>{selected.horseName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Giống / Tuổi</span>
              <strong>
                {selected.horseBreed ?? "—"}
                {selected.horseAge ? ` · ${selected.horseAge} tuổi` : ""}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Sức khỏe</span>
              <span>
                {selected.horseHealth
                  ? <Badge tone={HEALTH_TONE[selected.horseHealth] as any ?? "neutral"}>{viHealth(selected.horseHealth)}</Badge>
                  : "—"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Hồ sơ ngựa (PDF)</span>
              {selected.horsePdfUrl ? (
                <a className="secondary-button btn-xs" href={selected.horsePdfUrl} target="_blank" rel="noreferrer">
                  📄 {selected.horsePdfName || "Xem PDF"}
                </a>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Chưa có</span>
              )}
            </div>

            <div className="detail-item">
              <span className="detail-label">Cuộc đua</span>
              <strong>{selected.raceName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Vòng</span>
              <strong>{selected.raceRound ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ngày đua</span>
              <strong>{fmtDate(selected.raceDate)}</strong>
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <label className="field">
              <span>Ghi chú của quản trị viên (không bắt buộc)</span>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Lý do duyệt / từ chối…"
                disabled={actionLoading}
                style={{ resize: "vertical" }}
              />
            </label>
            <div className="form-actions" style={{ marginTop: "10px" }}>
              <button type="button" className="danger-button" disabled={actionLoading} onClick={() => doDecision("Rejected")}>
                {actionLoading ? "…" : "Từ chối"}
              </button>
              <button type="button" className="primary-button" disabled={actionLoading} onClick={() => doDecision("Approved")}>
                {actionLoading ? "Đang xử lý…" : "Duyệt ngựa"}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* ══ STAGE 2 — Awaiting jockey ══ */}
      <Panel
        title="Bước 2 · Chờ nài ngựa"
        subtitle="Ngựa đã duyệt — đang chờ chủ ngựa thuê nài và nài chấp nhận cưỡi"
      >
        <DataTable
          columns={[
            { key: "ownerName",  label: "Chủ ngựa",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",  label: "Ngựa",  render: (row) => row.horseName ?? "—" },
            { key: "raceName",   label: "Cuộc đua",   render: (row) => row.raceName ?? "—" },
            { key: "raceDate",   label: "Ngày đua", render: (row) => fmtDate(row.raceDate) },
            {
              key: "status",
              label: "Giai đoạn",
              render: () => <Badge tone="accent">Đang thuê nài…</Badge>,
            },
          ]}
          rows={awaitingJockey}
          empty="Không có đơn đã duyệt nào đang chờ nài."
        />
      </Panel>

      {/* ══ STAGE 3 — Completed ══ */}
      <Panel
        title="Bước 3 · Hoàn tất"
        subtitle="Ngựa đã duyệt và nài đã chấp nhận — suất đua đã vào danh sách thi đấu"
      >
        <DataTable
          columns={[
            { key: "ownerName",  label: "Chủ ngựa",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",  label: "Ngựa",  render: (row) => row.horseName ?? "—" },
            { key: "jockeyName", label: "Nài ngựa", render: (row) => (
              <span style={{ color: "var(--text-success)" }}>{row.jockeyName}</span>
            ) },
            { key: "raceName",   label: "Cuộc đua",   render: (row) => row.raceName ?? "—" },
            { key: "raceDate",   label: "Ngày đua", render: (row) => fmtDate(row.raceDate) },
            {
              key: "status",
              label: "Giai đoạn",
              render: () => <Badge tone="success">Hoàn tất</Badge>,
            },
          ]}
          rows={completed}
          empty="Chưa có đơn nào hoàn tất."
        />
      </Panel>

    </div>
  );
}
