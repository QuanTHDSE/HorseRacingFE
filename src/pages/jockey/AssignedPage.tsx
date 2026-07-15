import { useState } from "react";
import { Badge, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
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
  if (rank === 1) return <Badge tone="success">Hạng 1</Badge>;
  if (rank === 2) return <Badge tone="accent">Hạng 2</Badge>;
  if (rank === 3) return <Badge tone="info">Hạng 3</Badge>;
  return <Badge tone="neutral">#{rank}</Badge>;
}

function RaceCard({ race }: { race: Race }) {
  const [open, setOpen] = useState(false);
  const hasResult = race.liveStatus === "Completed" && race.result !== undefined && race.result !== null;

  return (
    <article className="info-card">
      <div className="card-head">
        <strong>{race.name}</strong>
        <Badge tone={STATUS_TONE[race.liveStatus] as any ?? "neutral"}>{viRaceStatus(race.liveStatus)}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: "8px 0 4px", fontSize: "0.875rem" }}>
        <span><span style={{ color: "var(--text-muted)" }}>Ngựa </span><strong>{race.horseName ?? "—"}</strong></span>
        <span><span style={{ color: "var(--text-muted)" }}>Làn </span><strong>{race.laneNumber ?? "—"}</strong></span>
        <span><span style={{ color: "var(--text-muted)" }}>Ngày </span>{fmtDate(race.date)}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Cự ly </span>{race.distance}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Giải đấu </span>{race.tournamentName ?? race.track}</span>
        <span><span style={{ color: "var(--text-muted)" }}>Chủ ngựa </span>{race.ownerName ?? "—"}</span>
      </div>

      {hasResult && race.result && (
        <>
          <button
            type="button"
            className="secondary-button btn-xs"
            style={{ marginTop: "8px" }}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Ẩn kết quả" : "Xem kết quả"}
          </button>
          {open && (
            <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--surface-2)", borderRadius: "8px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <ResultBadge rank={race.result.rank} />
                {race.result.finishTime !== undefined && (
                  <span><span style={{ color: "var(--text-muted)" }}>Thời gian </span>{fmtTime(race.result.finishTime)}</span>
                )}
                <span><span style={{ color: "var(--text-muted)" }}>Giải thưởng </span>{fmtPrize(race.result.prize)}</span>
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
      <SuspensionBanner />
      <Panel
        title="Cuộc đua được giao"
        subtitle={`${races.length} cuộc đua được giao`}
      >
        {races.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Chưa được giao cuộc đua nào.</p>
        )}
        <div className="card-list">
          {races.map((race) => <RaceCard key={race.id} race={race} />)}
        </div>
      </Panel>
    </div>
  );
}
