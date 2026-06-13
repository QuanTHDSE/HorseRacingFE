import { useState } from "react";
import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race } from "../../types";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrize(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B VND`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)}M VND`;
  return `${n.toLocaleString()} VND`;
}

function fmtTime(ms?: number): string {
  if (!ms) return "—";
  const secs = (ms / 1000).toFixed(2);
  return `${secs}s`;
}

const STATUS_TONE: Record<string, string> = {
  Upcoming:  "neutral",
  Live:      "success",
  Completed: "accent",
  Cancelled: "danger",
};

function ResultBadge({ rank }: { rank?: number }) {
  if (!rank) return null;
  if (rank === 1) return <Badge tone="success">1st Place</Badge>;
  if (rank === 2) return <Badge tone="accent">2nd Place</Badge>;
  if (rank === 3) return <Badge tone="info">3rd Place</Badge>;
  return <Badge tone="neutral">#{rank}</Badge>;
}

function RaceCard({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const hasResult = race.liveStatus === "Completed" && race.result !== undefined && race.result !== null;

  return (
    <article className="info-card">
      <div className="card-head">
        <strong>{race.name}</strong>
        <Badge tone={STATUS_TONE[race.liveStatus] as any ?? "neutral"}>{race.liveStatus}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: "8px 0 4px", fontSize: "0.875rem" }}>
        <span><span style={{ color: "var(--text-muted)" }}>Horse </span><strong>{race.horseName ?? "—"}</strong></span>
        <span><span style={{ color: "var(--text-muted)" }}>Lane </span><strong>{race.laneNumber ?? "—"}</strong></span>
        <span><span style={{ color: "var(--text-muted)" }}>Date </span>{fmtDate(race.date)}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Distance </span>{race.distance}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Tournament </span>{race.tournamentName ?? race.track}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Owner </span>{race.ownerName ?? "—"}</span>
      </div>

      {hasResult && race.result && (
        <>
          <button
            type="button"
            className="secondary-button btn-xs"
            style={{ marginTop: "8px" }}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide result" : "View result"}
          </button>
          {open && (
            <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--surface-2)", borderRadius: "8px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <ResultBadge rank={race.result.rank} />
                {race.result.finishTime !== undefined && (
                  <span><span style={{ color: "var(--text-muted)" }}>Time </span>{fmtTime(race.result.finishTime)}</span>
                )}
                <span><span style={{ color: "var(--text-muted)" }}>Prize </span>{fmtPrize(race.result.prize)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default function AssignedPage() {
  const { appState } = useApp();
  const races = appState.races;

  return (
    <div className="page-stack">
      <Panel
        title="Assigned races"
        subtitle={`${races.length} race${races.length !== 1 ? "s" : ""} assigned`}
      >
        {races.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No races assigned yet.</p>
        )}
        <div className="card-list">
          {races.map((race) => <RaceCard key={race.id} race={race} />)}
        </div>
      </Panel>
    </div>
  );
}
