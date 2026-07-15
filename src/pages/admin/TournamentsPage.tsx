import { useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { Tournament } from "../../types";
import { cn } from "../../utils/cn";
import { viTournamentStatus } from "../../utils/viLabels";
import PredictionConfigForm from "./PredictionConfigForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentStatus = "Draft" | "Registration" | "Live" | "Completed";

const API_STATUS: Record<string, string> = {
  Draft: "draft",
  Registration: "published",
  Live: "ongoing",
  Completed: "completed",
};

const NEXT_STATUS: Record<string, TournamentStatus> = {
  Draft: "Registration",
  Registration: "Live",
  Live: "Completed",
};

const STATUS_LABEL: Record<string, string> = {
  Draft: "Mở đăng ký",
  Registration: "Bắt đầu giải",
  Live: "Hoàn tất giải",
};

const STATUS_TONE: Record<string, string> = {
  Draft: "neutral",
  Registration: "accent",
  Live: "success",
  Completed: "default",
};

// ─── Form empty state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  prizePool: "",
  description: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTournamentsPage() {
  const { appState, handleCreateTournament, handleUpdateTournamentStatus, handleUpdateTournamentPrizePool, handleGetTournamentById, handleDeleteTournament } =
    useApp();

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const fb = useFeedback();
  const formSuccess = ""; const setFormSuccess = fb.success;
  const [formLoading, setFormLoading] = useState(false);

  // List filter
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Detail panel
  const [selected, setSelected] = useState<(Tournament & { raceCount?: number }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailError = ""; const setDetailError = fb.error;

  // Status update
  const [statusLoading, setStatusLoading] = useState(false);
  const statusMsg: string = ""; const setStatusMsg = fb.success;
  const [prizePoolInput, setPrizePoolInput] = useState("");
  const [prizePoolSaving, setPrizePoolSaving] = useState(false);

  // Prediction config panel
  const [showPredConfig, setShowPredConfig] = useState(false);

  // ─── Derived data ───────────────────────────────────────────────────────────

  const tournaments = appState.tournaments;

  const filtered = tournaments.filter((t) => {
    if (filter === "active") return t.status === "Live" || t.status === "Registration";
    if (filter === "completed") return t.status === "Completed";
    return true;
  });

  const total = tournaments.length;
  const liveCount = tournaments.filter((t) => t.status === "Live").length;
  const regCount = tournaments.filter((t) => t.status === "Registration").length;
  const doneCount = tournaments.filter((t) => t.status === "Completed").length;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors([]);
    setFormSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Vui lòng nhập tên giải đấu.");
    if (!form.location.trim()) errs.push("Vui lòng nhập địa điểm tổ chức.");
    if (!form.startDate) errs.push("Vui lòng chọn ngày bắt đầu.");
    if (!form.endDate) errs.push("Vui lòng chọn ngày kết thúc.");
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      errs.push("Ngày kết thúc phải sau ngày bắt đầu.");
    if (errs.length) { setFormErrors(errs); return; }

    setFormLoading(true);
    try {
      await handleCreateTournament({
        name: form.name.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        prizePool: form.prizePool ? Number(form.prizePool) : undefined,
        description: form.description.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setFormSuccess("Đã tạo giải đấu thành công!");
      setTimeout(() => setFormSuccess(""), 3500);
    } catch (err: unknown) {
      setFormErrors([err instanceof Error ? err.message : "Không tạo được giải đấu."]);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleSelectRow(t: Tournament) {
    setShowPredConfig(false);
    if (selected?.id === t.id) {
      setSelected(null);
      setDetailError("");
      setStatusMsg("");
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    setStatusMsg("");
    try {
      const detail = await handleGetTournamentById(t.id);
      setSelected(detail);
      setPrizePoolInput(String(detail.prizePoolValue ?? 0));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Không tải được thông tin giải đấu.");
      setSelected(t);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusUpdate(nextStatus: TournamentStatus) {
    if (!selected) return;
    const apiStatus = API_STATUS[nextStatus];
    if (!apiStatus) return;

    setStatusLoading(true);
    setStatusMsg("");
    try {
      await handleUpdateTournamentStatus(selected.id, apiStatus);
      // Refresh detail
      const updated = await handleGetTournamentById(selected.id);
      setSelected(updated);
      setPrizePoolInput(String(updated.prizePoolValue ?? 0));
      setStatusMsg(`Đã cập nhật trạng thái thành "${viTournamentStatus(nextStatus)}".`);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePrizePoolSave() {
    if (!selected) return;
    const nextPrizePool = Number(prizePoolInput);
    if (!Number.isFinite(nextPrizePool) || nextPrizePool < 0) {
      setStatusMsg("Tổng giải thưởng phải là số không âm.");
      return;
    }

    setPrizePoolSaving(true);
    setStatusMsg("");
    try {
      const updated = await handleUpdateTournamentPrizePool(selected.id, nextPrizePool);
      const detail = await handleGetTournamentById(updated.id);
      setSelected(detail);
      setPrizePoolInput(String(detail.prizePoolValue ?? 0));
      setStatusMsg("Đã cập nhật tổng giải thưởng ban đầu.");
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Cập nhật tổng giải thưởng thất bại.");
    } finally {
      setPrizePoolSaving(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-stack">

      {/* ── Metrics ── */}
      <div className="metric-grid four">
        <MetricCard label="Tổng số giải đấu" value={String(total)} note="Tất cả giải đấu" />
        <MetricCard label="Đang diễn ra" value={String(liveCount)} note="Đang thi đấu" tone="success" />
        <MetricCard label="Đang mở đăng ký" value={String(regCount)} note="Đang nhận hồ sơ tham gia" tone="accent" />
        <MetricCard label="Đã hoàn tất" value={String(doneCount)} note="Giải đã kết thúc" tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Tạo giải đấu mới" subtitle="Nhập thông tin để lên lịch một giải đấu mới">
        {formSuccess && <div className="form-banner form-banner-success">{formSuccess}</div>}
        {formErrors.length > 0 && (
          <div className="form-banner form-banner-error">
            {formErrors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            {/* Name — full width */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Tên giải đấu <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="vd: Summer Cup 2026"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Địa điểm <span className="required">*</span></span>
              <input
                value={form.location}
                onChange={(e) => handleField("location", e.target.value)}
                placeholder="vd: TP. Hồ Chí Minh"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Tổng giải thưởng ban đầu (điểm)</span>
              <input
                type="number"
                min={0}
                value={form.prizePool}
                onChange={(e) => handleField("prizePool", e.target.value)}
                placeholder="vd: 50000000"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Ngày bắt đầu <span className="required">*</span></span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleField("startDate", e.target.value)}
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Ngày kết thúc <span className="required">*</span></span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleField("endDate", e.target.value)}
                disabled={formLoading}
              />
            </label>

            {/* Description — full width */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Mô tả</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
                placeholder="Thông tin bổ sung về giải đấu…"
                disabled={formLoading}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setForm(EMPTY_FORM); setFormErrors([]); }}
              disabled={formLoading}
            >
              Đặt lại
            </button>
            <button type="submit" className="primary-button" disabled={formLoading}>
              {formLoading ? "Đang tạo…" : "Tạo giải đấu"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Tournament list ── */}
      <Panel
        title="Danh sách giải đấu"
        subtitle={`${filtered.length} / ${total} giải đấu`}
        action={
          <div className="filter-tabs">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={cn("filter-tab", filter === f && "is-active")}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Tất cả" : f === "active" ? "Đang hoạt động" : "Đã hoàn tất"}
              </button>
            ))}
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Tên giải" },
            { key: "location", label: "Địa điểm" },
            { key: "range", label: "Thời gian" },
            { key: "prizePool", label: "Tổng thưởng" },
            { key: "races", label: "Số cuộc đua", render: (row) => String(row.races) },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any}>{viTournamentStatus(row.status)}</Badge>
              ),
            },
            {
              key: "id",
              label: "Chi tiết",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button", "btn-xs", selected?.id === row.id && "is-active")}
                  onClick={() => handleSelectRow(row)}
                >
                  {selected?.id === row.id ? "Đóng" : "Xem"}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="Không tìm thấy giải đấu nào."
        />
      </Panel>

      {/* ── Detail panel ── */}
      {(selected || detailLoading) && (
        <Panel
          title={detailLoading ? "Đang tải…" : `Chi tiết — ${selected?.name}`}
          subtitle="Thông tin đầy đủ và quản lý trạng thái giải đấu"
          action={
            <button
              type="button"
              className="secondary-button btn-xs"
              onClick={() => { setSelected(null); setStatusMsg(""); }}
            >
              Đóng
            </button>
          }
        >
          {detailError && <div className="form-banner form-banner-error">{detailError}</div>}
          {statusMsg && (
            <div className={cn("form-banner", statusMsg.includes("failed") || statusMsg.includes("Failed") ? "form-banner-error" : "form-banner-success")}>
              {statusMsg}
            </div>
          )}

          {selected && !detailLoading && (
            <div className="detail-body">
              {/* Info grid */}
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Tên giải</span>
                  <strong>{selected.name}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Địa điểm</span>
                  <strong>{selected.location}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Thời gian</span>
                  <strong>{selected.range}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tổng thưởng</span>
                  <strong>{selected.prizePool}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Số cuộc đua</span>
                  <strong>{selected.races}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Trạng thái hiện tại</span>
                  <Badge tone={STATUS_TONE[selected.status] as any}>{viTournamentStatus(selected.status)}</Badge>
                </div>
              </div>

              {(selected.status === "Draft" || selected.status === "Registration") && (
                <div className="detail-actions" style={{ marginTop: "12px" }}>
                  <div className="form-grid-2" style={{ alignItems: "end" }}>
                    <label className="field">
                      <span>Tổng giải thưởng ban đầu (điểm)</span>
                      <input
                        type="number"
                        min={0}
                        value={prizePoolInput}
                        onChange={(e) => setPrizePoolInput(e.target.value)}
                        disabled={prizePoolSaving}
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={prizePoolSaving}
                      onClick={handlePrizePoolSave}
                    >
                      {prizePoolSaving ? "Đang lưu..." : "Lưu tổng thưởng"}
                    </button>
                  </div>
                </div>
              )}

              {/* Status transition */}
              {NEXT_STATUS[selected.status] && (() => {
                // Publishing (Draft → Registration) requires at least one race set up
                const needsRaces = selected.status === "Draft" && (selected.races ?? 0) === 0;
                return (
                  <div className="detail-actions">
                    <p className="detail-action-hint">
                      {needsRaces
                        ? "Cần tạo ít nhất một cuộc đua trước khi mở đăng ký giải đấu."
                        : "Chuyển giải đấu sang giai đoạn tiếp theo:"}
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={statusLoading || needsRaces}
                      title={needsRaces ? "Bạn cần thiết lập ít nhất một cuộc đua trước." : undefined}
                      onClick={() => handleStatusUpdate(NEXT_STATUS[selected.status] as TournamentStatus)}
                    >
                      {statusLoading
                        ? "Đang cập nhật…"
                        : `${STATUS_LABEL[selected.status]} → ${viTournamentStatus(NEXT_STATUS[selected.status])}`}
                    </button>
                  </div>
                );
              })()}

              {selected.status === "Completed" && (
                <p className="detail-action-hint" style={{ marginTop: "12px" }}>
                  Giải đấu này đã kết thúc và không thể chuyển sang giai đoạn tiếp theo.
                </p>
              )}

              {/* ── Prediction configuration ── */}
              <div className="detail-actions" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <p className="detail-action-hint" style={{ margin: 0 }}>
                    Cấu hình dự đoán: điểm thưởng, quỹ pool, tỷ lệ chia thưởng.
                  </p>
                  <button
                    type="button"
                    className={cn("secondary-button", "btn-xs", showPredConfig && "is-active")}
                    onClick={() => setShowPredConfig((v) => !v)}
                  >
                    {showPredConfig ? "Ẩn cấu hình" : "Cấu hình dự đoán"}
                  </button>
                </div>
                {showPredConfig && (
                  <div style={{ marginTop: "14px" }}>
                    <PredictionConfigForm
                      tournamentId={selected.id}
                      editable={selected.status === "Draft" || selected.status === "Registration"}
                    />
                  </div>
                )}
              </div>

              {/* Danger zone — delete (only draft / registration with no races) */}
              {(selected.status === "Draft" || selected.status === "Registration") && (
                <div className="detail-actions" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <p className="detail-action-hint">
                    Xóa giải đấu này. Chỉ có thể xóa trước khi giải diễn ra và khi chưa có cuộc đua nào.
                  </p>
                  <ConfirmDeleteButton
                    label="Xóa giải đấu"
                    onConfirm={() => handleDeleteTournament(selected.id)}
                    onDeleted={() => { setSelected(null); setStatusMsg(""); }}
                  />
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

    </div>
  );
}
