import { useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Tournament } from "../../types";
import { cn } from "../../utils/cn";
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
  Draft: "Publish",
  Registration: "Start",
  Live: "Complete",
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
  const { appState, handleCreateTournament, handleUpdateTournamentStatus, handleGetTournamentById, handleDeleteTournament } =
    useApp();

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // List filter
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Detail panel
  const [selected, setSelected] = useState<(Tournament & { raceCount?: number }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Status update
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Prediction config panel
  const [showPredConfig, setShowPredConfig] = useState(false);

  // ─── Derived data ───────────────────────────────────────────────────────────

  const tournaments = appState.tournaments;

  const filtered = tournaments.filter((t) => {
    if (filter === "active") return t.status === "Live" || t.status === "Registration";
    if (filter === "completed") return t.status === "Completed";
    return true;
  });

  const total      = tournaments.length;
  const liveCount  = tournaments.filter((t) => t.status === "Live").length;
  const regCount   = tournaments.filter((t) => t.status === "Registration").length;
  const doneCount  = tournaments.filter((t) => t.status === "Completed").length;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors([]);
    setFormSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())      errs.push("Tournament name is required.");
    if (!form.location.trim())  errs.push("Location is required.");
    if (!form.startDate)        errs.push("Start date is required.");
    if (!form.endDate)          errs.push("End date is required.");
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      errs.push("End date must be after start date.");
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
      setFormSuccess("Tournament created successfully!");
      setTimeout(() => setFormSuccess(""), 3500);
    } catch (err: unknown) {
      setFormErrors([err instanceof Error ? err.message : "Failed to create tournament."]);
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
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Failed to load tournament.");
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
      setStatusMsg(`Status updated to "${nextStatus}".`);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setStatusLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-stack">

      {/* ── Metrics ── */}
      <div className="metric-grid four">
        <MetricCard label="Total tournaments" value={String(total)}    note="All tournaments" />
        <MetricCard label="Live now"           value={String(liveCount)}  note="Ongoing"         tone="success" />
        <MetricCard label="Registration open"  value={String(regCount)}   note="Accepting entries" tone="accent" />
        <MetricCard label="Completed"          value={String(doneCount)}  note="Finished"        tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Create new tournament" subtitle="Fill in the details to schedule a new tournament">
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
              <span>Tournament name <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="e.g. Summer Cup 2026"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Location <span className="required">*</span></span>
              <input
                value={form.location}
                onChange={(e) => handleField("location", e.target.value)}
                placeholder="e.g. Ho Chi Minh City"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Prize pool (VND)</span>
              <input
                type="number"
                min={0}
                value={form.prizePool}
                onChange={(e) => handleField("prizePool", e.target.value)}
                placeholder="e.g. 3200000000"
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>Start date <span className="required">*</span></span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleField("startDate", e.target.value)}
                disabled={formLoading}
              />
            </label>

            <label className="field">
              <span>End date <span className="required">*</span></span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleField("endDate", e.target.value)}
                disabled={formLoading}
              />
            </label>

            {/* Description — full width */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Description</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
                placeholder="Optional details about the tournament…"
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
              Reset
            </button>
            <button type="submit" className="primary-button" disabled={formLoading}>
              {formLoading ? "Creating…" : "Create tournament"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Tournament list ── */}
      <Panel
        title="Tournament list"
        subtitle={`${filtered.length} of ${total} tournaments`}
        action={
          <div className="filter-tabs">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={cn("filter-tab", filter === f && "is-active")}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name",      label: "Name"      },
            { key: "location",  label: "Location"  },
            { key: "range",     label: "Dates"     },
            { key: "prizePool", label: "Prize pool" },
            { key: "races",     label: "Races",    render: (row) => String(row.races) },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any}>{row.status}</Badge>
              ),
            },
            {
              key: "id",
              label: "Detail",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button", "btn-xs", selected?.id === row.id && "is-active")}
                  onClick={() => handleSelectRow(row)}
                >
                  {selected?.id === row.id ? "Close" : "View"}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="No tournaments found."
        />
      </Panel>

      {/* ── Detail panel ── */}
      {(selected || detailLoading) && (
        <Panel
          title={detailLoading ? "Loading…" : `Detail — ${selected?.name}`}
          subtitle="Full information and status management"
          action={
            <button
              type="button"
              className="secondary-button btn-xs"
              onClick={() => { setSelected(null); setStatusMsg(""); }}
            >
              Close
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
                  <span className="detail-label">Name</span>
                  <strong>{selected.name}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <strong>{selected.location}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Dates</span>
                  <strong>{selected.range}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Prize pool</span>
                  <strong>{selected.prizePool}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Races</span>
                  <strong>{selected.races}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current status</span>
                  <Badge tone={STATUS_TONE[selected.status] as any}>{selected.status}</Badge>
                </div>
              </div>

              {/* Status transition */}
              {NEXT_STATUS[selected.status] && (() => {
                // Publishing (Draft → Registration) requires at least one race set up
                const needsRaces = selected.status === "Draft" && (selected.races ?? 0) === 0;
                return (
                  <div className="detail-actions">
                    <p className="detail-action-hint">
                      {needsRaces
                        ? "Add at least one race before publishing this tournament."
                        : "Move tournament to next stage:"}
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={statusLoading || needsRaces}
                      title={needsRaces ? "You must set up at least one race first." : undefined}
                      onClick={() => handleStatusUpdate(NEXT_STATUS[selected.status] as TournamentStatus)}
                    >
                      {statusLoading
                        ? "Updating…"
                        : `${STATUS_LABEL[selected.status]} → ${NEXT_STATUS[selected.status]}`}
                    </button>
                  </div>
                );
              })()}

              {selected.status === "Completed" && (
                <p className="detail-action-hint" style={{ marginTop: "12px" }}>
                  This tournament has concluded and cannot be advanced further.
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
                    Delete this tournament. Only possible before it goes live and when it has no races.
                  </p>
                  <ConfirmDeleteButton
                    label="Delete tournament"
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
