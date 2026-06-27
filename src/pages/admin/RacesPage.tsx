import { useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import type { AddParticipantInput, Race, RaceDetail, RaceEligibleEntry, RaceSimTimeline } from "../../types";
import { cn } from "../../utils/cn";

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
    { apiStatus: "cancelled", label: "Cancel race", danger: true },
  ],
  Live: [
    { apiStatus: "completed", label: "Complete race" },
    { apiStatus: "cancelled", label: "Cancel race",  danger: true },
  ],
};

const EMPTY_FORM = {
  name: "",
  tournamentId: "",
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
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParticipantsTable({ participants }: { participants: RaceDetail["participants"] }) {
  if (participants.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No participants added yet.</p>;
  }
  return (
    <DataTable
      columns={[
        { key: "laneNumber", label: "Lane" },
        { key: "horseName",  label: "Horse"  },
        { key: "jockeyName", label: "Jockey" },
        { key: "ownerName",  label: "Owner"  },
        {
          key: "isScratched",
          label: "Active",
          render: (row) => (
            <Badge tone={(row as any).isScratched ? "danger" : "success"}>
              {(row as any).isScratched ? "Scratched" : "Active"}
            </Badge>
          ),
        },
        {
          key: "confirmedAt",
          label: "Confirmed",
          render: (row) => (
            <Badge tone={(row as any).confirmedAt ? "success" : "warning"}>
              {(row as any).confirmedAt ? "Yes" : "Pending"}
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
    handleUpdateRaceStatus,
    handleDeleteRace,
  } = useApp();

  // ── Create form ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState("");

  // ── List filters ───────────────────────────────────────────────────────────
  const [filterTournament, setFilterTournament] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "Upcoming" | "Live" | "Completed" | "Cancelled">("all");

  // ── Detail panel ───────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // ── Status update ──────────────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // ── Add participant ────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [pForm, setPForm] = useState(EMPTY_PARTICIPANT);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState("");

  // Approved registrations eligible to be added (admin picks from these)
  const [entries, setEntries] = useState<RaceEligibleEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");

  // ── Start race (live simulation) ─────────────────────────────────────────────
  const [simTimeline, setSimTimeline] = useState<RaceSimTimeline | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────
  const races      = appState.races;
  const tournaments = appState.tournaments;
  const jockeys    = appState.users.filter((u) => u.role === "jockey" && u.status === "Active");

  const filtered = races.filter((r) => {
    if (filterTournament && r.tournamentId !== filterTournament) return false;
    if (filterStatus !== "all" && r.liveStatus !== filterStatus) return false;
    return true;
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
    if (!form.name.trim())   errs.push("Race name is required.");
    if (!form.tournamentId)  errs.push("Please select a tournament.");
    if (!form.date)          errs.push("Race date & time is required.");
    if (!form.distance.trim()) errs.push("Distance is required.");
    if (errs.length) { setFormErrors(errs); return; }

    setFormLoading(true);
    try {
      handleCreateRace({
        name: form.name.trim(),
        tournamentId: form.tournamentId,
        date: form.date,
        distance: form.distance.trim(),
        round: form.round || "1",
        maxParticipants: Number(form.maxParticipants) || 12,
      });
      setForm(EMPTY_FORM);
      setFormSuccess("Race created! It will appear in the list shortly.");
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
      setDetailError(err instanceof Error ? err.message : "Failed to load race details.");
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
      setPError(err instanceof Error ? err.message : "Failed to load approved entries.");
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
      setStatusMsg(`Status updated to "${updated.liveStatus}".`);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function doAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const errs: string[] = [];
    if (!selectedEntryId)  errs.push("Please select an approved entry.");
    if (!pForm.jockeyId)   errs.push("This entry has no jockey yet — please choose one.");
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
      setPError(err instanceof Error ? err.message : "Failed to add participant.");
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
      setStatusMsg(err instanceof Error ? err.message : "Failed to start race.");
    } finally {
      setSimLoading(false);
    }
  }

  async function onPlayerClose() {
    setSimTimeline(null);
    if (detail) {
      try { setDetail(await handleGetRaceById(detail.id)); } catch { /* ignore */ }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-stack">
      {simTimeline && <RaceLivePlayer timeline={simTimeline} onClose={onPlayerClose} />}

      {/* ── Metrics ── */}
      <div className="metric-grid four">
        <MetricCard label="Total races"  value={String(totalCount)}     note="All races in system"      />
        <MetricCard label="Live now"     value={String(liveCount)}      note="Currently ongoing"  tone="success" />
        <MetricCard label="Upcoming"     value={String(upcomingCount)}  note="Scheduled"          tone="accent"  />
        <MetricCard label="Completed"    value={String(completedCount)} note="Finished"           tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Create new race" subtitle="Add a race to an existing tournament">
        {formSuccess && <div className="form-banner form-banner-success">{formSuccess}</div>}
        {formErrors.length > 0 && (
          <div className="form-banner form-banner-error">
            {formErrors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Race name <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="e.g. Race 01 — Golden Sprint"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Tournament <span className="required">*</span></span>
              <select value={form.tournamentId} onChange={(e) => handleField("tournamentId", e.target.value)} disabled={formLoading}>
                <option value="">— Select tournament —</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Round #</span>
              <input
                type="number" min={1}
                value={form.round}
                onChange={(e) => handleField("round", e.target.value)}
                placeholder="1"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Date &amp; time <span className="required">*</span></span>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => handleField("date", e.target.value)}
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Distance (m) <span className="required">*</span></span>
              <input
                type="number" min={100}
                value={form.distance}
                onChange={(e) => handleField("distance", e.target.value)}
                placeholder="e.g. 1800"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Max participants</span>
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
              Reset
            </button>
            <button type="submit" className="primary-button" disabled={formLoading}>
              {formLoading ? "Creating…" : "Create race"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Race list ── */}
      <Panel
        title="Race schedule"
        subtitle={`${filtered.length} of ${totalCount} races`}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={filterTournament}
              onChange={(e) => setFilterTournament(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
            >
              <option value="">All tournaments</option>
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
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Race" },
            {
              key: "tournamentId",
              label: "Tournament",
              render: (row) => tournaments.find((t) => t.id === row.tournamentId)?.name ?? "—",
            },
            { key: "date",     label: "Date",     render: (row) => fmtDate(row.date) },
            { key: "distance", label: "Distance" },
            { key: "round",    label: "Round",    render: (row) => `#${row.round}` },
            {
              key: "liveStatus",
              label: "Status",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.liveStatus] as any ?? "neutral"}>{row.liveStatus}</Badge>
              ),
            },
            {
              key: "id",
              label: "Detail",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button btn-xs", selectedId === row.id && "is-active")}
                  onClick={() => openDetail(row)}
                >
                  {selectedId === row.id ? "Close" : "View"}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="No races found."
        />
      </Panel>

      {/* ── Detail panel ── */}
      {(selectedId !== null || detailLoading) && (
        <Panel
          title={detailLoading ? "Loading race…" : `Race — ${detail?.name ?? "…"}`}
          subtitle="Full details, participants, and status management"
          action={
            <button type="button" className="secondary-button btn-xs" onClick={closeDetail}>
              Close
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
                  <span className="detail-label">Race name</span>
                  <strong>{detail.name}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tournament</span>
                  <strong>
                    {detail.tournamentName ?? tournaments.find((t) => t.id === detail.tournamentId)?.name ?? "—"}
                  </strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Scheduled at</span>
                  <strong>{fmtDate(detail.scheduledAt)}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Distance</span>
                  <strong>{detail.distance ? `${detail.distance}m` : "—"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Round</span>
                  <strong>#{detail.round}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Participants</span>
                  <strong>{detail.participantCount} / {detail.maxParticipants}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Surface</span>
                  <strong>{detail.surface ?? "—"}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <Badge tone={STATUS_TONE[detail.liveStatus] as any ?? "neutral"}>{detail.liveStatus}</Badge>
                </div>
              </div>

              {/* ── Participants ── */}
              <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <strong>Participants ({detail.participantCount} active)</strong>
                  {detail.liveStatus === "Upcoming" && (
                    <button
                      type="button"
                      className="secondary-button btn-xs"
                      onClick={toggleAddForm}
                    >
                      {showAddForm ? "Cancel" : "+ Add participant"}
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
                      Add participant to race
                    </strong>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
                      Pick from registrations already approved for this race.
                    </p>
                    {pError && (
                      <div className="form-banner form-banner-error" style={{ marginBottom: "10px" }}>{pError}</div>
                    )}

                    {entriesLoading ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading approved entries…</p>
                    ) : entries.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        No approved entries left to add. Approve registrations in the Approvals page first.
                      </p>
                    ) : (
                      <div className="form-grid-2">
                        <label className="field" style={{ gridColumn: "1 / -1" }}>
                          <span>Approved entry <span className="required">*</span></span>
                          <select value={selectedEntryId} onChange={(e) => onSelectEntry(e.target.value)} disabled={pLoading}>
                            <option value="">— Select approved horse —</option>
                            {entries.map((en) => (
                              <option key={en.registrationId} value={en.registrationId}>
                                {en.horseName} · owner {en.ownerName}
                                {en.jockeyName ? ` · jockey ${en.jockeyName}` : " · (no jockey yet)"}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedEntryId && !entries.find((en) => en.registrationId === selectedEntryId)?.jockeyId && (
                          <label className="field">
                            <span>Jockey <span className="required">*</span></span>
                            <select
                              value={pForm.jockeyId}
                              onChange={(e) => setPForm((p) => ({ ...p, jockeyId: e.target.value }))}
                              disabled={pLoading}
                            >
                              <option value="">— Select jockey —</option>
                              {jockeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                            </select>
                          </label>
                        )}

                        <label className="field">
                          <span>Lane number (optional)</span>
                          <input
                            type="number" min={1} max={detail.maxParticipants}
                            value={pForm.laneNumber}
                            onChange={(e) => setPForm((p) => ({ ...p, laneNumber: e.target.value }))}
                            placeholder="Auto-assigned if empty"
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
                        Cancel
                      </button>
                      <button type="submit" className="primary-button" disabled={pLoading || !selectedEntryId}>
                        {pLoading ? "Adding…" : "Add participant"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ── Start race (live simulation) ── */}
              {detail.liveStatus === "Upcoming" && (
                <div style={{ marginTop: "24px", padding: "16px", background: "var(--c-surf-low)", border: "1px solid var(--c-outline-var)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ display: "block" }}>▶ Start race</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--c-muted)" }}>
                        Mô phỏng cuộc đua trực tiếp — kết quả tự được công bố và settle dự đoán.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={simLoading || detail.participantCount < 2}
                      onClick={doStartRace}
                    >
                      {simLoading ? "Starting…" : "Start race"}
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
                  <p className="detail-action-hint">Move race to next stage:</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {NEXT_ACTIONS[detail.liveStatus].map(({ apiStatus, label, danger }) => (
                      <button
                        key={apiStatus}
                        type="button"
                        className={danger ? "danger-button" : "primary-button"}
                        disabled={statusLoading}
                        onClick={() => doStatusUpdate(apiStatus)}
                      >
                        {statusLoading ? "Updating…" : label}
                      </button>
                    ))}
                  </div>
                  {detail.liveStatus === "Upcoming" && (
                    <p className="detail-action-hint" style={{ marginTop: "8px" }}>
                      Starting requires at least 2 active participants.
                    </p>
                  )}
                </div>
              )}

              {(detail.liveStatus === "Completed" || detail.liveStatus === "Cancelled") && (
                <p className="detail-action-hint" style={{ marginTop: "16px" }}>
                  This race is {detail.liveStatus.toLowerCase()} and cannot be modified further.
                </p>
              )}

              {/* Danger zone — delete (not allowed for live / completed races) */}
              {detail.liveStatus !== "Live" && detail.liveStatus !== "Completed" && (
                <div className="detail-actions" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <p className="detail-action-hint">Permanently delete this race.</p>
                  <ConfirmDeleteButton
                    label="Delete race"
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
