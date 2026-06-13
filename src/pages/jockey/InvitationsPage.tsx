import { useState } from "react";
import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

type Filter = "all" | "pending" | "accepted" | "declined";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  Pending:  "warning",
  Accepted: "success",
  Declined: "danger",
};

export default function InvitationsPage() {
  const { appState, handleAction } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [acting, setActing] = useState<string | null>(null);

  const all = appState.invitations;

  const filtered = all.filter((inv) => {
    if (filter === "pending")  return inv.status === "Pending";
    if (filter === "accepted") return inv.status === "Accepted";
    if (filter === "declined") return inv.status === "Declined";
    return true;
  });

  async function respond(id: string, action: "Accepted" | "Declined") {
    setActing(id);
    try {
      handleAction("jockeyInvite", id, action);
    } finally {
      setTimeout(() => setActing(null), 800);
    }
  }

  return (
    <div className="page-stack">
      <Panel
        title="Ride invitations"
        subtitle={`${filtered.length} invitation${filtered.length !== 1 ? "s" : ""}`}
        action={
          <div className="filter-tabs">
            {(["all", "pending", "accepted", "declined"] as Filter[]).map((f) => (
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
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No invitations in this category.</p>
        )}
        <div className="card-list">
          {filtered.map((inv) => (
            <article key={inv.id} className="info-card">
              <div className="card-head">
                <strong>{inv.raceName ?? inv.raceId}</strong>
                <Badge tone={STATUS_TONE[inv.status] ?? "neutral"}>{inv.status}</Badge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: "8px 0 6px", fontSize: "0.875rem" }}>
                <span><span style={{ color: "var(--text-muted)" }}>Horse</span> {inv.horseName ?? "—"}</span>
                <span><span style={{ color: "var(--text-muted)" }}>Race date</span> {fmtDate(inv.raceDate)}</span>
                <span><span style={{ color: "var(--text-muted)" }}>Owner</span> {inv.ownerName ?? "—"}</span>
                {inv.raceStatus && (
                  <span><span style={{ color: "var(--text-muted)" }}>Race status</span> {inv.raceStatus}</span>
                )}
              </div>

              {inv.message && (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", margin: "4px 0 8px" }}>
                  "{inv.message}"
                </p>
              )}

              {inv.status === "Pending" && (
                <div className="table-actions" style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    className="table-button is-complete"
                    disabled={acting === inv.id}
                    onClick={() => respond(inv.id, "Accepted")}
                  >
                    {acting === inv.id ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="table-button is-danger"
                    disabled={acting === inv.id}
                    onClick={() => respond(inv.id, "Declined")}
                  >
                    {acting === inv.id ? "…" : "Decline"}
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
