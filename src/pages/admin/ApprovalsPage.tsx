import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Approval } from "../../types";
import { cn } from "../../utils/cn";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
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
  const [actionMsg, setActionMsg] = useState("");

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
      setActionMsg(`Horse registration ${status.toLowerCase()} successfully.`);
      setSelected(null);
      setAdminNote("");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="page-stack">

      {/* ── Pipeline summary chips ── */}
      <div className="approvals-summary">
        <div className="summary-chip">
          <span className="summary-chip-label">1 · Awaiting horse approval</span>
          <Badge tone={pendingHorse.length > 0 ? "warning" : "success"}>{pendingHorse.length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">2 · Awaiting jockey</span>
          <Badge tone={awaitingJockey.length > 0 ? "accent" : "neutral"}>{awaitingJockey.length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">3 · Completed</span>
          <Badge tone="success">{completed.length}</Badge>
        </div>
      </div>

      {/* ══ STAGE 1 — Horse approvals ══ */}
      <Panel
        title="Step 1 · Horse approvals"
        subtitle="Review the horse entry and approve or reject — no jockey needed at this stage"
      >
        {actionMsg && !selected && (
          <div className={cn("form-banner", actionMsg.toLowerCase().includes("fail") ? "form-banner-error" : "form-banner-success")}>
            {actionMsg}
          </div>
        )}
        <DataTable
          columns={[
            { key: "ownerName",   label: "Owner",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",   label: "Horse",  render: (row) => row.horseName ?? "—" },
            { key: "horseBreed",  label: "Breed",  render: (row) => row.horseBreed ?? "—" },
            { key: "raceName",    label: "Race",   render: (row) => row.raceName ?? "—" },
            { key: "submittedAt", label: "Submitted", render: (row) => fmtDate(row.submittedAt) },
            {
              key: "id",
              label: "Review",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button", "btn-xs", selected?.id === row.id && "is-active")}
                  onClick={() => openDetail(row)}
                >
                  {selected?.id === row.id ? "Close" : "Review"}
                </button>
              ),
            },
          ]}
          rows={pendingHorse}
          empty="No horse registrations awaiting approval."
        />
      </Panel>

      {/* ── Horse approval detail panel (no jockey field) ── */}
      {selected && (
        <Panel
          title={`Review horse — ${selected.horseName ?? selected.applicant}`}
          subtitle="Horse and race details for this registration"
          action={
            <button type="button" className="secondary-button btn-xs" onClick={() => { setSelected(null); setActionMsg(""); setAdminNote(""); }}>
              Close
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
              <span className="detail-label">Owner</span>
              <strong>{selected.ownerName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Submitted</span>
              <strong>{fmtDate(selected.submittedAt)}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <Badge tone="warning">{selected.status}</Badge>
            </div>

            <div className="detail-item">
              <span className="detail-label">Horse</span>
              <strong>{selected.horseName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Breed / Age</span>
              <strong>
                {selected.horseBreed ?? "—"}
                {selected.horseAge ? ` · ${selected.horseAge} yrs` : ""}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Health</span>
              <span>
                {selected.horseHealth
                  ? <Badge tone={HEALTH_TONE[selected.horseHealth] as any ?? "neutral"}>{selected.horseHealth}</Badge>
                  : "—"}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Race</span>
              <strong>{selected.raceName ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Round</span>
              <strong>{selected.raceRound ?? "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Race date</span>
              <strong>{fmtDate(selected.raceDate)}</strong>
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <label className="field">
              <span>Admin note (optional)</span>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason for approval / rejection…"
                disabled={actionLoading}
                style={{ resize: "vertical" }}
              />
            </label>
            <div className="form-actions" style={{ marginTop: "10px" }}>
              <button type="button" className="danger-button" disabled={actionLoading} onClick={() => doDecision("Rejected")}>
                {actionLoading ? "…" : "Reject"}
              </button>
              <button type="button" className="primary-button" disabled={actionLoading} onClick={() => doDecision("Approved")}>
                {actionLoading ? "Processing…" : "Approve horse"}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* ══ STAGE 2 — Awaiting jockey ══ */}
      <Panel
        title="Step 2 · Awaiting jockey"
        subtitle="Horse approved — waiting for the owner to hire a jockey who accepts the ride"
      >
        <DataTable
          columns={[
            { key: "ownerName",  label: "Owner",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",  label: "Horse",  render: (row) => row.horseName ?? "—" },
            { key: "raceName",   label: "Race",   render: (row) => row.raceName ?? "—" },
            { key: "raceDate",   label: "Race date", render: (row) => fmtDate(row.raceDate) },
            {
              key: "status",
              label: "Stage",
              render: () => <Badge tone="accent">Hiring jockey…</Badge>,
            },
          ]}
          rows={awaitingJockey}
          empty="No approved registrations waiting for a jockey."
        />
      </Panel>

      {/* ══ STAGE 3 — Completed ══ */}
      <Panel
        title="Step 3 · Completed"
        subtitle="Horse approved and a jockey has accepted — entry is in the race line-up"
      >
        <DataTable
          columns={[
            { key: "ownerName",  label: "Owner",  render: (row) => row.ownerName ?? row.applicant },
            { key: "horseName",  label: "Horse",  render: (row) => row.horseName ?? "—" },
            { key: "jockeyName", label: "Jockey", render: (row) => (
              <span style={{ color: "var(--text-success)" }}>{row.jockeyName}</span>
            ) },
            { key: "raceName",   label: "Race",   render: (row) => row.raceName ?? "—" },
            { key: "raceDate",   label: "Race date", render: (row) => fmtDate(row.raceDate) },
            {
              key: "status",
              label: "Stage",
              render: () => <Badge tone="success">Complete</Badge>,
            },
          ]}
          rows={completed}
          empty="No completed registrations yet."
        />
      </Panel>

    </div>
  );
}
