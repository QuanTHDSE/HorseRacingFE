import { useEffect, useRef, useState } from "react";
import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import type { RaceSimTimeline, SpectatorRace } from "../../types";
import { cn } from "../../utils/cn";

const REPLAY_POLL_MS = 3000;

type RaceFilter = "all" | "upcoming" | "live" | "completed";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const STATUS_TONE: Record<string, string> = {
  Upcoming:  "accent",
  Live:      "success",
  Completed: "neutral",
  Cancelled: "danger",
};

const PENALTY_LABEL: Record<string, string> = {
  warning: "Warning",
  demote: "Demotion",
  disqualify: "Disqualification",
  disqualification: "Disqualification",
  restart: "Race restart",
  time_ban: "Time-boxed ban",
  permanent_ban: "Permanent ban",
};

function RankBadge({ rank }: { rank: number }) {
  const tone = rank === 1 ? "success" : rank <= 3 ? "accent" : "neutral";
  const label = rank === 1 ? "🥇 1st" : rank === 2 ? "🥈 2nd" : rank === 3 ? "🥉 3rd" : `#${rank}`;
  return <Badge tone={tone as any}>{label}</Badge>;
}

function LiveRaceWatcher({ race, onClose }: { race: SpectatorRace; onClose: () => void }) {
  const { handleGetSpectatorRaceReplay } = useApp();
  const [timeline, setTimeline] = useState<RaceSimTimeline | null>(null);
  const [resultPublished, setResultPublished] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    async function poll() {
      try {
        const res = await handleGetSpectatorRaceReplay(race.id);
        if (stoppedRef.current) return;
        if (res.available && res.timeline) {
          setTimeline(res.timeline);
          setResultPublished(res.resultPublished);
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch {
        // ignore transient errors, keep polling
      }
    }
    poll();
    interval = setInterval(poll, REPLAY_POLL_MS);
    return () => {
      stoppedRef.current = true;
      if (interval) clearInterval(interval);
    };
  }, [race.id, handleGetSpectatorRaceReplay]);

  if (!timeline) {
    const waitingForStart = race.liveStatus !== "Live" && race.liveStatus !== "Completed";
    return (
      <Panel title={race.name} subtitle="Watching race" action={
        <button type="button" className="secondary-button btn-xs" onClick={onClose}>Close</button>
      }>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {waitingForStart ? "Waiting for the race to start…" : "Loading race data…"}
        </p>
      </Panel>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <Badge tone={resultPublished ? "success" : "warning"}>
          {resultPublished ? "Official result" : "Provisional — pending referee confirmation"}
        </Badge>
      </div>
      <RaceLivePlayer timeline={timeline} onClose={onClose} />
    </div>
  );
}

function RaceDetailPanel({ race, onClose }: { race: SpectatorRace; onClose: () => void }) {
  const [watching, setWatching] = useState(false);
  const canWatch = race.liveStatus === "Live" || race.liveStatus === "Completed";

  if (watching) {
    return <LiveRaceWatcher race={race} onClose={() => setWatching(false)} />;
  }

  return (
    <Panel
      title={race.name}
      subtitle={`Round ${race.round} · ${race.tournamentName}`}
      action={
        <div style={{ display: "flex", gap: "8px" }}>
          {canWatch && (
            <button type="button" className="secondary-button btn-xs" onClick={() => setWatching(true)}>
              {race.liveStatus === "Live" ? "Watch live" : "Watch replay"}
            </button>
          )}
          <button type="button" className="secondary-button btn-xs" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {/* Info grid */}
      <div className="info-grid" style={{ marginBottom: "20px" }}>
        <div className="info-cell">
          <span className="info-label">Status</span>
          <span className="info-value">
            <Badge tone={STATUS_TONE[race.liveStatus] as any ?? "neutral"}>{race.liveStatus}</Badge>
          </span>
        </div>
        <div className="info-cell">
          <span className="info-label">Date</span>
          <span className="info-value">{fmtDate(race.scheduledAt)}</span>
        </div>
        <div className="info-cell">
          <span className="info-label">Distance</span>
          <span className="info-value">{race.distance ? `${race.distance}m` : "—"}</span>
        </div>
        <div className="info-cell">
          <span className="info-label">Tournament</span>
          <span className="info-value">{race.tournamentName}</span>
        </div>
        <div className="info-cell">
          <span className="info-label">Participants</span>
          <span className="info-value">{race.participants.length}</span>
        </div>
        {race.canPredict && (
          <div className="info-cell">
            <span className="info-label">Predictions</span>
            <span className="info-value" style={{ color: "var(--accent)" }}>Open for predictions</span>
          </div>
        )}
        {race.hasPrediction && (
          <div className="info-cell">
            <span className="info-label">Your prediction</span>
            <span className="info-value" style={{ color: "var(--text-success)" }}>Submitted ✓</span>
          </div>
        )}
      </div>

      {/* Participants */}
      {race.participants.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 600 }}>
            Participants ({race.participants.length})
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {race.participants
              .slice()
              .sort((a, b) => a.laneNumber - b.laneNumber)
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: "6px 12px",
                    background: "var(--surface-2)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Lane {p.laneNumber}
                  </span>
                  <strong>{p.name}</strong>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Results */}
      {race.result && race.result.rankings.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 600 }}>Race results</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {race.result.rankings.map((rk) => (
              <div
                key={rk.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 14px",
                  background: rk.rank <= 3 ? "var(--surface-2)" : "var(--surface-1)",
                  borderRadius: "8px",
                  border: rk.rank === 1 ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                <RankBadge rank={rk.rank} />
                <div style={{ flex: 1 }}>
                  <strong>{rk.horse.name}</strong>
                  <span style={{ marginLeft: "8px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {rk.jockey.fullName}
                  </span>
                  {rk.isDisqualified && (
                    <Badge tone="danger">Disqualified</Badge>
                  )}
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {fmtTime(rk.finishTime)}
                </span>
                {rk.prize > 0 && (
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)" }}>
                    {rk.prize.toLocaleString()} pts
                  </span>
                )}
              </div>
            ))}
          </div>

          {race.result.violations && race.result.violations.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 600 }}>Violations</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {race.result.violations.map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 14px",
                      background: "var(--c-danger-c)",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                    }}
                  >
                    <strong>{v.horseName ?? "Unknown"}</strong>
                    <span style={{ marginLeft: "8px", color: "var(--text-muted)" }}>{v.description}</span>
                    {v.penaltyApplied && (
                      <span style={{ marginLeft: "8px", fontWeight: 600, color: "var(--danger, #dc2626)" }}>
                        {PENALTY_LABEL[v.penaltyApplied] ?? v.penaltyApplied}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function LivePage() {
  const { appState, handleGetSpectatorRaceById } = useApp();

  const [filter, setFilter]         = useState<RaceFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail]         = useState<SpectatorRace | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [loadError, setLoadError]   = useState("");

  const races = appState.spectatorRaces;

  const filtered = races.filter((r) => {
    if (filter === "upcoming")  return r.liveStatus === "Upcoming";
    if (filter === "live")      return r.liveStatus === "Live";
    if (filter === "completed") return r.liveStatus === "Completed";
    return true;
  });

  const liveCount      = races.filter((r) => r.liveStatus === "Live").length;
  const upcomingCount  = races.filter((r) => r.liveStatus === "Upcoming").length;
  const completedCount = races.filter((r) => r.liveStatus === "Completed").length;

  async function openDetail(race: SpectatorRace) {
    if (selectedId === race.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setLoadingId(race.id);
    setLoadError("");
    try {
      const d = await handleGetSpectatorRaceById(race.id);
      setDetail(d);
      setSelectedId(race.id);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load race details.");
    } finally {
      setLoadingId(null);
    }
  }

  const FILTERS: { key: RaceFilter; label: string; count?: number }[] = [
    { key: "all",       label: "All",       count: races.length },
    { key: "live",      label: "Live",      count: liveCount },
    { key: "upcoming",  label: "Upcoming",  count: upcomingCount },
    { key: "completed", label: "Completed", count: completedCount },
  ];

  return (
    <div className="page-stack">
      <Panel
        title="Races"
        subtitle="Browse and view details for all races"
        action={
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={cn("filter-tab", filter === f.key && "is-active")}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span style={{
                    marginLeft: "5px",
                    background: "var(--surface-3)",
                    borderRadius: "10px",
                    padding: "1px 6px",
                    fontSize: "0.75rem",
                  }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      >
        {loadError && (
          <div className="form-banner form-banner-error" style={{ marginBottom: "12px" }}>
            {loadError}
          </div>
        )}

        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No races in this category yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((race) => (
              <div
                key={race.id}
                onClick={() => openDetail(race)}
                style={{
                  padding: "14px 16px",
                  background: selectedId === race.id ? "var(--surface-2)" : "var(--surface-1)",
                  borderRadius: "10px",
                  border: selectedId === race.id
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== race.id)
                    (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== race.id)
                    (e.currentTarget as HTMLElement).style.background = "var(--surface-1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <Badge tone={STATUS_TONE[race.liveStatus] as any ?? "neutral"}>
                    {race.liveStatus}
                  </Badge>
                  <strong style={{ flex: 1 }}>{race.name}</strong>
                  {loadingId === race.id && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading…</span>
                  )}
                </div>
                <div style={{
                  display: "flex",
                  gap: "16px",
                  marginTop: "6px",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  flexWrap: "wrap",
                }}>
                  <span>Round {race.round}</span>
                  <span>{race.tournamentName}</span>
                  {race.distance && <span>{race.distance}m</span>}
                  <span>{fmtDate(race.scheduledAt)}</span>
                  <span>{race.participants.length} horse{race.participants.length !== 1 ? "s" : ""}</span>
                  {race.canPredict && (
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>Predictions open</span>
                  )}
                  {race.hasPrediction && (
                    <span style={{ color: "var(--text-success)" }}>Predicted ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Detail panel */}
      {detail && selectedId && (
        <RaceDetailPanel
          race={detail}
          onClose={() => { setSelectedId(null); setDetail(null); }}
        />
      )}
    </div>
  );
}
