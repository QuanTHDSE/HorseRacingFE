import { useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { AddParticipantInput, Race, RaceDetail } from "../../types";
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
    { apiStatus: "ongoing",   label: "Start race"   },
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

  // ── Derived data ───────────────────────────────────────────────────────────
  const races      = appState.races;
  const tournaments = appState.tournaments;
  const jockeys    = appState.users.filter((u) => u.role === "jockey" && u.status === "Active");
  const owners     = appState.users.filter((u) => u.role === "owner"  && u.status === "Active");

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
    if (!pForm.horseId.trim()) errs.push("Horse ID is required.");
    if (!pForm.jockeyId)       errs.push("Please select a jockey.");
    if (!pForm.ownerId)        errs.push("Please select an owner.");
    if (errs.length) { setPError(errs.join(" ")); return; }

    setPLoading(true);
    setPError("");
    try {
      const input: AddParticipantInput = {
        horseId:    pForm.horseId.trim(),
        jockeyId:   pForm.jockeyId,
        ownerId:    pForm.ownerId,
        laneNumber: pForm.laneNumber ? Number(pForm.laneNumber) : undefined,
      };
      const updated = await handleAddParticipant(detail.id, input);
      setDetail(updated);
      setPForm(EMPTY_PARTICIPANT);
      setShowAddForm(false);
    } catch (err: unknown) {
      setPError(err instanceof Error ? err.message : "Failed to add participant.");
    } finally {
      setPLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-stack">

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
                      onClick={() => { setShowAddForm((v) => !v); setPError(""); setPForm(EMPTY_PARTICIPANT); }}
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
                    <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: "12px" }}>
                      Add participant to race
                    </strong>
                    {pError && (
                      <div className="form-banner form-banner-error" style={{ marginBottom: "10px" }}>{pError}</div>
                    )}
                    <div className="form-grid-2">
                      <label className="field">
                        <span>Horse ID <span className="required">*</span></span>
                        <input
                          value={pForm.horseId}
                          onChange={(e) => setPForm((p) => ({ ...p, horseId: e.target.value }))}
                          placeholder="MongoDB ObjectId of horse"
                          disabled={pLoading}
                        />
                      </label>
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
                      <label className="field">
                        <span>Horse owner <span className="required">*</span></span>
                        <select
                          value={pForm.ownerId}
                          onChange={(e) => setPForm((p) => ({ ...p, ownerId: e.target.value }))}
                          disabled={pLoading}
                        >
                          <option value="">— Select owner —</option>
                          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="form-actions" style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={pLoading}
                        onClick={() => { setShowAddForm(false); setPForm(EMPTY_PARTICIPANT); setPError(""); }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary-button" disabled={pLoading}>
                        {pLoading ? "Adding…" : "Add participant"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

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
