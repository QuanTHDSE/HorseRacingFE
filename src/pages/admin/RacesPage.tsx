import { useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { AddParticipantInput, Race, RaceDetail, RaceEligibleEntry, RaceSimTimeline } from "../../types";
import { cn } from "../../utils/cn";
import { viRaceStatus } from "../../utils/viLabels";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, string> = {
  Upcoming:  "accent",
  Live:      "success",
  Completed: "neutral",
  Cancelled: "danger",
};

type NextAction = { apiStatus: string; label: string; danger?: boolean };

const NEXT_ACTIONS: Record<string, NextAction[]> = {
  Upcoming: [
    { apiStatus: "cancelled", label: "Hủy cuộc đua", danger: true },
  ],
  Live: [
    { apiStatus: "completed", label: "Hoàn tất cuộc đua" },
    { apiStatus: "cancelled", label: "Hủy cuộc đua",  danger: true },
  ],
};

const EMPTY_FORM = {
  name: "",
  tournamentId: "",
  racetrackId: "",
  refereeId: "",
  round: "1",
  date: "",
  distance: "",
  maxParticipants: "12",
};

const EMPTY_PARTICIPANT = {
  horseId: "",
  jockeyId: "",
  ownerId: "",
  laneNumber: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParticipantsTable({ participants }: { participants: RaceDetail["participants"] }) {
  if (participants.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa thêm ngựa tham gia nào.</p>;
  }
  return (
    <DataTable
      columns={[
        { key: "laneNumber", label: "Làn" },
        { key: "horseName",  label: "Ngựa"  },
        { key: "jockeyName", label: "Nài ngựa" },
        { key: "ownerName",  label: "Chủ ngựa"  },
        {
          key: "isScratched",
          label: "Tình trạng",
          render: (row) => (
            <Badge tone={(row as any).isScratched ? "danger" : "success"}>
              {(row as any).isScratched ? "Đã loại" : "Thi đấu"}
            </Badge>
          ),
        },
      ]}
      rows={participants}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RacesPage() {
  const {
    appState,
    handleCreateRace,
    handleGetRaceById,
    handleAddParticipant,
    handleGetRaceEligibleEntries,
    handleSimulateRace,
    handleFinishRace,
    handleAssignRaceReferee,
    handleUpdateRaceStatus,
    handleDeleteRace,
  } = useApp();

  // ── Create form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const fb = useFeedback();
  const formSuccess: string = ""; const setFormSuccess = fb.success;

  // ── List filters ───────────────────────────────────────────────────────────
  const [filterTournament, setFilterTournament] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "Upcoming" | "Live" | "Completed" | "Cancelled">("all");

  // ── Detail panel ───────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailError: string = ""; const setDetailError = fb.error;

  // ── Status update ──────────────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false);
  const statusMsg: string = ""; const setStatusMsg = fb.success;

  // ── Add participant ────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [pForm, setPForm] = useState(EMPTY_PARTICIPANT);
  const [pLoading, setPLoading] = useState(false);
  const pError: string = ""; const setPError = fb.error;

  // Approved registrations eligible to be added (admin picks from these)
  const [entries, setEntries] = useState<RaceEligibleEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");

  // ── Start race (live simulation) ─────────────────────────────────────────────
  const [simTimeline, setSimTimeline] = useState<RaceSimTimeline | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // ── Assign referee ───────────────────────────────────────────────────────────
  const [refAssigning, setRefAssigning] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────
  const races      = appState.races;
  const tournaments = appState.tournaments;
  const activeTracks = (appState.racetracks ?? []).filter((t) => t.isActive);
  const referees   = appState.users.filter((u) => u.role === "referee" && u.status === "Active");
  const jockeys    = appState.users.filter((u) => u.role === "jockey" && u.status === "Active");

  // Ưu tiên hiển thị: Upcoming lên đầu; trong cùng nhóm thì race mới tạo (ObjectId lớn hơn) lên trước.
  const STATUS_ORDER: Record<string, number> = { Upcoming: 0, Ready: 1, Live: 2, Completed: 3, Cancelled: 4 };
  const filtered = races
    .filter((r) => {
      if (filterTournament && r.tournamentId !== filterTournament) return false;
      if (filterStatus !== "all" && r.liveStatus !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const pa = STATUS_ORDER[a.liveStatus] ?? 9;
      const pb = STATUS_ORDER[b.liveStatus] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.id.localeCompare(a.id); // mới nhất trước
    });

  const totalCount     = races.length;
  const liveCount      = races.filter((r) => r.liveStatus === "Live").length;
  const upcomingCount  = races.filter((r) => r.liveStatus === "Upcoming").length;
  const completedCount = races.filter((r) => r.liveStatus === "Completed").length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setFormErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())   errs.push("Vui lòng nhập tên cuộc đua.");
    if (!form.tournamentId)  errs.push("Vui lòng chọn giải đấu.");
    if (!form.date)          errs.push("Vui lòng nhập ngày & giờ đua.");
    if (!form.distance.trim()) errs.push("Vui lòng nhập cự ly.");
    if (errs.length) { setFormErrors(errs); return; }

    setFormLoading(true);
    try {
      handleCreateRace({
        name: form.name.trim(),
        tournamentId: form.tournamentId,
        racetrackId: form.racetrackId || undefined,
        refereeId: form.refereeId || undefined,
        date: form.date,
        distance: form.distance.trim(),
        round: form.round || "1",
        maxParticipants: Number(form.maxParticipants) || 12,
      });
      setForm(EMPTY_FORM);
      setFormSuccess("Đã tạo cuộc đua! Sẽ xuất hiện trong danh sách ngay.");
      setTimeout(() => setFormSuccess(""), 4000);
    } finally {
      setFormLoading(false);
    }
  }

  async function openDetail(race: Race) {
    if (selectedId === race.id) {
      setSelectedId(null);
      setDetail(null);
      setDetailError("");
      setStatusMsg("");
      setShowAddForm(false);
      return;
    }
    setSelectedId(race.id);
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setStatusMsg("");
    setShowAddForm(false);
    setPForm(EMPTY_PARTICIPANT);
    setPError("");
    setEntries([]);
    setSelectedEntryId("");
    try {
      setDetail(await handleGetRaceById(race.id));
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Không tải được chi tiết cuộc đua.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
    setStatusMsg("");
    setShowAddForm(false);
    setEntries([]);
    setSelectedEntryId("");
  }

  async function toggleAddForm() {
    if (showAddForm) {
      setShowAddForm(false);
      setPForm(EMPTY_PARTICIPANT);
      setSelectedEntryId("");
      setPError("");
      return;
    }
    setShowAddForm(true);
    setPForm(EMPTY_PARTICIPANT);
    setSelectedEntryId("");
    setPError("");
    if (!detail) return;
    setEntriesLoading(true);
    try {
      setEntries(await handleGetRaceEligibleEntries(detail.id));
    } catch (err: unknown) {
      setPError(err instanceof Error ? err.message : "Không tải được danh sách đơn đã duyệt.");
    } finally {
      setEntriesLoading(false);
    }
  }

  function onSelectEntry(entryId: string) {
    setSelectedEntryId(entryId);
    setPError("");
    const entry = entries.find((e) => e.registrationId === entryId);
    setPForm(
      entry
        ? { horseId: entry.horseId, jockeyId: entry.jockeyId ?? "", ownerId: entry.ownerId, laneNumber: "" }
        : EMPTY_PARTICIPANT,
    );
  }

  async function doStatusUpdate(apiStatus: string) {
    if (!detail) return;
    setStatusLoading(true);
    setStatusMsg("");
    try {
      const updated = await handleUpdateRaceStatus(detail.id, apiStatus);
      setDetail(updated);
      setStatusMsg(`Đã cập nhật trạng thái thành "${viRaceStatus(updated.liveStatus)}".`);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function doAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const errs: string[] = [];
    if (!selectedEntryId)  errs.push("Vui lòng chọn một đơn đã duyệt.");
    if (!pForm.jockeyId)   errs.push("Đơn này chưa có nài — vui lòng chọn nài.");
    if (errs.length) { setPError(errs.join(" ")); return; }

    setPLoading(true);
    setPError("");
    try {
      const input: AddParticipantInput = {
        horseId:    pForm.horseId,
        jockeyId:   pForm.jockeyId,
        ownerId:    pForm.ownerId,
        laneNumber: pForm.laneNumber ? Number(pForm.laneNumber) : undefined,
      };
      const updated = await handleAddParticipant(detail.id, input);
      setDetail(updated);
      setPForm(EMPTY_PARTICIPANT);
      setSelectedEntryId("");
      // Bỏ entry vừa thêm khỏi danh sách để có thể thêm tiếp con khác
      setEntries((prev) => prev.filter((x) => x.registrationId !== selectedEntryId));
    } catch (err: unknown) {
      setPError(err instanceof Error ? err.message : "Thêm ngựa thất bại.");
    } finally {
      setPLoading(false);
    }
  }

  async function doStartRace() {
    if (!detail) return;
    setSimLoading(true);
    setStatusMsg("");
    try {
      const timeline = await handleSimulateRace(detail.id);
      setSimTimeline(timeline);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Không bắt đầu được cuộc đua.");
    } finally {
      setSimLoading(false);
    }
  }

  async function onPlayerClose() {
    const raceId = simTimeline?.raceId ?? detail?.id;
    setSimTimeline(null);
    // Kết thúc đua khi đóng màn xem: công bố kết quả + giải đấu trở lại Registration
    if (raceId) {
      try { await handleFinishRace(raceId); } catch { /* ignore */ }
    }
    if (detail) {
      try { setDetail(await handleGetRaceById(detail.id)); } catch { /* ignore */ }
    }
  }

  async function doAssignReferee(refereeId: string) {
    if (!detail) return;
    setRefAssigning(true);
    setStatusMsg("");
    try {
      const updated = await handleAssignRaceReferee(detail.id, refereeId || null);
      setDetail(updated);
      setStatusMsg(refereeId ? "Đã gán trọng tài phụ trách." : "Đã bỏ gán trọng tài.");
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Gán trọng tài thất bại.");
    } finally {
      setRefAssigning(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-stack">
      {simTimeline && <RaceLivePlayer timeline={simTimeline} onClose={onPlayerClose} />}

      {/* ── Metrics ── */}
      <div className="metric-grid four">
        <MetricCard label="Tổng số cuộc đua"  value={String(totalCount)}     note="Tất cả cuộc đua trong hệ thống"      />
        <MetricCard label="Đang diễn ra"      value={String(liveCount)}      note="Đang diễn ra"  tone="success" />
        <MetricCard label="Sắp diễn ra"       value={String(upcomingCount)}  note="Đã lên lịch"          tone="accent"  />
        <MetricCard label="Đã kết thúc"       value={String(completedCount)} note="Đã hoàn thành"           tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Tạo cuộc đua mới" subtitle="Thêm một cuộc đua vào giải đấu hiện có">
        {formSuccess && <div className="form-banner form-banner-success">{formSuccess}</div>}
        {formErrors.length > 0 && (
          <div className="form-banner form-banner-error">
            {formErrors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Tên cuộc đua <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="vd: Vòng 01 — Nước rút Vàng"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Giải đấu <span className="required">*</span></span>
              <select value={form.tournamentId} onChange={(e) => handleField("tournamentId", e.target.value)} disabled={formLoading}>
                <option value="">— Chọn giải đấu —</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Đường đua</span>
              <select value={form.racetrackId} onChange={(e) => handleField("racetrackId", e.target.value)} disabled={formLoading}>
                <option value="">— Không gán —</option>
                {activeTracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} · {t.location} ({t.surface})</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Trọng tài</span>
              <select value={form.refereeId} onChange={(e) => handleField("refereeId", e.target.value)} disabled={formLoading}>
                <option value="">— Chưa gán —</option>
                {referees.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Vòng #</span>
              <input
                type="number" min={1}
                value={form.round}
                onChange={(e) => handleField("round", e.target.value)}
                placeholder="1"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Ngày &amp; giờ <span className="required">*</span></span>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => handleField("date", e.target.value)}
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Cự ly (m) <span className="required">*</span></span>
              <input
                type="number" min={100}
                value={form.distance}
                onChange={(e) => handleField("distance", e.target.value)}
                placeholder="vd: 1800"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Số ngựa tối đa</span>
              <input
                type="number" min={2} max={20}
                value={form.maxParticipants}
                onChange={(e) => handleField("maxParticipants", e.target.value)}
                disabled={formLoading}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={formLoading}
              onClick={() => { setForm(EMPTY_FORM); setFormErrors([]); }}>
              Đặt lại
            </button>
            <button type="submit" className="primary-button" disabled={formLoading}>
              {formLoading ? "Đang tạo…" : "Tạo cuộc đua"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Race list ── */}
      <Panel
        title="Lịch đua"
        subtitle={`${filtered.length} / ${totalCount} cuộc đua`}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={filterTournament}
              onChange={(e) => setFilterTournament(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">Tất cả giải đấu</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="filter-tabs">
              {(["all", "Upcoming", "Live", "Completed", "Cancelled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn("filter-tab", filterStatus === s && "is-active")}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Tất cả" : viRaceStatus(s)}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Cuộc đua" },
            {
              key: "tournamentId",
              label: "Giải đấu",
              render: (row) => tournaments.find((t) => t.id === row.tournamentId)?.name ?? "—",
            },
            { key: "date",     label: "Ngày",     render: (row) => fmtDate(row.date) },
            { key: "distance", label: "Cự ly" },
            { key: "round",    label: "Vòng",    render: (row) => `#${row.round}` },
            {
              key: "liveStatus",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.liveStatus] as any ?? "neutral"}>{viRaceStatus(row.liveStatus)}</Badge>
              ),
            },
            {
              key: "id",
              label: "Chi tiết",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button btn-xs", selectedId === row.id && "is-active")}
                  onClick={() => openDetail(row)}
                >
                  {selectedId === row.id ? "Đóng" : "Xem"}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="Không tìm thấy cuộc đua nào."
        />
      </Panel>

      {/* ── Detail panel ── */}
      {(selectedId !== null || detailLoading) && (
        <Panel
          title={detailLoading ? "Đang tải cuộc đua…" : `Cuộc đua — ${detail?.name ?? "…"}`}
          subtitle="Chi tiết đầy đủ, ngựa tham gia và quản lý trạng thái"
          action={
            <button type="button" className="secondary-button btn-xs" onClick={closeDetail}>
              Đóng
            </button>
          }
        >
          {detailError && <div className="form-banner form-banner-error">{detailError}</div>}
          {statusMsg && (
            <div className={cn("form-banner", statusMsg.toLowerCase().includes("fail") ? "form-banner-error" : "form-banner-success")}>
              {statusMsg}
            </div>
          )}

          {detail && !detailLoading && (
            <div className="detail-body">
              {/* Info grid */}
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Tên cuộc đua</span>
                  <strong>{detail.name}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Giải đấu</span>
                  <strong>
                    {detail.tournamentName ?? tournaments.find((t) => t.id === detail.tournamentId)?.name ?? "—"}
                  </strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Thời gian</span>
                  <strong>{fmtDate(detail.scheduledAt)}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Cự ly</span>
                  <strong>{detail.distance ? `${detail.distance}m` : "—"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vòng</span>
                  <strong>#{detail.round}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Số ngựa</span>
                  <strong>{detail.participantCount} / {detail.maxParticipants}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mặt đường</span>
                  <strong>{detail.surface ?? "—"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Trạng thái</span>
                  <Badge tone={STATUS_TONE[detail.liveStatus] as any ?? "neutral"}>{viRaceStatus(detail.liveStatus)}</Badge>
                </div>
              </div>

              {/* ── Participants ── */}
              <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <strong>Ngựa tham gia ({detail.participantCount} đang thi đấu)</strong>
                  {detail.liveStatus === "Upcoming" && (
                    <button
                      type="button"
                      className="secondary-button btn-xs"
                      onClick={toggleAddForm}
                    >
                      {showAddForm ? "Hủy" : "+ Thêm ngựa"}
                    </button>
                  )}
                </div>

                <ParticipantsTable participants={detail.participants} />

                {/* ── Add participant form ── */}
                {showAddForm && (
                  <form
                    onSubmit={doAddParticipant}
                    style={{ marginTop: "16px", padding: "16px", background: "var(--surface-2)", borderRadius: "10px" }}
                  >
                    <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: "4px" }}>
                      Thêm ngựa vào cuộc đua
                    </strong>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
                      Chọn từ các đơn đã được duyệt cho cuộc đua này.
                    </p>
                    {pError && (
                      <div className="form-banner form-banner-error" style={{ marginBottom: "10px" }}>{pError}</div>
                    )}

                    {entriesLoading ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Đang tải các đơn đã duyệt…</p>
                    ) : entries.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        Không còn đơn đã duyệt nào để thêm. Hãy duyệt đơn ở trang Duyệt đơn trước.
                      </p>
                    ) : (
                      <div className="form-grid-2">
                        <label className="field" style={{ gridColumn: "1 / -1" }}>
                          <span>Đơn đã duyệt <span className="required">*</span></span>
                          <select value={selectedEntryId} onChange={(e) => onSelectEntry(e.target.value)} disabled={pLoading}>
                            <option value="">— Chọn ngựa đã duyệt —</option>
                            {entries.map((en) => (
                              <option key={en.registrationId} value={en.registrationId}>
                                {en.horseName} · chủ {en.ownerName}
                                {en.jockeyName ? ` · nài ${en.jockeyName}` : " · (chưa có nài)"}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedEntryId && !entries.find((en) => en.registrationId === selectedEntryId)?.jockeyId && (
                          <label className="field">
                            <span>Nài ngựa <span className="required">*</span></span>
                            <select
                              value={pForm.jockeyId}
                              onChange={(e) => setPForm((p) => ({ ...p, jockeyId: e.target.value }))}
                              disabled={pLoading}
                            >
                              <option value="">— Chọn nài ngựa —</option>
                              {jockeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                            </select>
                          </label>
                        )}

                        <label className="field">
                          <span>Số làn (không bắt buộc)</span>
                          <input
                            type="number" min={1} max={detail.maxParticipants}
                            value={pForm.laneNumber}
                            onChange={(e) => setPForm((p) => ({ ...p, laneNumber: e.target.value }))}
                            placeholder="Tự gán nếu để trống"
                            disabled={pLoading}
                          />
                        </label>
                      </div>
                    )}
                    <div className="form-actions" style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={pLoading}
                        onClick={() => { setShowAddForm(false); setPForm(EMPTY_PARTICIPANT); setSelectedEntryId(""); setPError(""); }}
                      >
                        Hủy
                      </button>
                      <button type="submit" className="primary-button" disabled={pLoading || !selectedEntryId}>
                        {pLoading ? "Đang thêm…" : "Thêm ngựa"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ── Assign referee ── */}
              <div style={{ marginTop: "24px", padding: "16px", background: "var(--c-surf-low)", border: "1px solid var(--c-outline-var)", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block" }}>Trọng tài phụ trách</strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--c-muted)" }}>
                      Trọng tài chỉ thấy cuộc đua này ở các trang của họ khi được gán.
                    </span>
                  </div>
                  <select
                    value={detail.refereeId ?? ""}
                    disabled={refAssigning}
                    onChange={(e) => doAssignReferee(e.target.value)}
                    style={{ minWidth: "220px" }}
                  >
                    <option value="">— Chưa gán —</option>
                    {referees.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Start race (live simulation) ── */}
              {detail.liveStatus === "Upcoming" && (
                <div style={{ marginTop: "24px", padding: "16px", background: "var(--c-surf-low)", border: "1px solid var(--c-outline-var)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ display: "block" }}>▶ Bắt đầu cuộc đua</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--c-muted)" }}>
                        Mô phỏng cuộc đua trực tiếp — kết quả tự được công bố và đối soát dự đoán.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={simLoading || detail.participantCount < 2}
                      onClick={doStartRace}
                    >
                      {simLoading ? "Đang bắt đầu…" : "Bắt đầu cuộc đua"}
                    </button>
                  </div>
                  {detail.participantCount < 2 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--c-muted)", margin: "8px 0 0" }}>
                      Cần ít nhất 2 ngựa trong đường đua để bắt đầu.
                    </p>
                  )}
                </div>
              )}

              {/* ── Status transitions ── */}
              {NEXT_ACTIONS[detail.liveStatus] && (
                <div className="detail-actions" style={{ marginTop: "24px" }}>
                  <p className="detail-action-hint">Chuyển cuộc đua sang giai đoạn tiếp theo:</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {NEXT_ACTIONS[detail.liveStatus].map(({ apiStatus, label, danger }) => (
                      <button
                        key={apiStatus}
                        type="button"
                        className={danger ? "danger-button" : "primary-button"}
                        disabled={statusLoading}
                        onClick={() => doStatusUpdate(apiStatus)}
                      >
                        {statusLoading ? "Đang cập nhật…" : label}
                      </button>
                    ))}
                  </div>
                  {detail.liveStatus === "Upcoming" && (
                    <p className="detail-action-hint" style={{ marginTop: "8px" }}>
                      Cần ít nhất 2 ngựa đang thi đấu để bắt đầu.
                    </p>
                  )}
                </div>
              )}

              {(detail.liveStatus === "Completed" || detail.liveStatus === "Cancelled") && (
                <p className="detail-action-hint" style={{ marginTop: "16px" }}>
                  Cuộc đua này {detail.liveStatus === "Completed" ? "đã kết thúc" : "đã hủy"} và không thể chỉnh sửa thêm.
                </p>
              )}

              {/* Danger zone — delete (not allowed for live / completed races) */}
              {detail.liveStatus !== "Live" && detail.liveStatus !== "Completed" && (
                <div className="detail-actions" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <p className="detail-action-hint">Xóa vĩnh viễn cuộc đua này.</p>
                  <ConfirmDeleteButton
                    label="Xóa cuộc đua"
                    onConfirm={() => handleDeleteRace(detail.id)}
                    onDeleted={() => { setSelectedId(null); setDetail(null); setStatusMsg(""); }}
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
