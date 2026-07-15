import { Badge, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race } from "../../types";

import { viRaceStatus } from "../../utils/viLabels";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GROUPS: { key: string; label: string; tone: "accent" | "success" | "neutral" | "danger" }[] = [
  { key: "Live",      label: "Đang diễn ra", tone: "success" },
  { key: "Upcoming",  label: "Sắp diễn ra",  tone: "accent"  },
  { key: "Completed", label: "Đã kết thúc",  tone: "neutral" },
  { key: "Cancelled", label: "Đã hủy",       tone: "danger"  },
];

function RaceRow({ race }: { race: Race }) {
  return (
    <article className="timeline-item">
      <div className="timeline-dot" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <strong>{race.name}</strong>
          {race.result?.rank !== undefined && (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Về hạng {race.result.rank}
            </span>
          )}
        </div>
        <p style={{ margin: "2px 0", fontSize: "0.875rem" }}>
          {fmtDate(race.date)}
          {race.distance ? ` · ${race.distance}` : ""}
        </p>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Ngựa: <strong>{race.horseName ?? "—"}</strong>
          {race.laneNumber !== undefined ? ` · Làn ${race.laneNumber}` : ""}
          {race.tournamentName ? ` · ${race.tournamentName}` : ""}
          {race.ownerName ? ` · Chủ ngựa: ${race.ownerName}` : ""}
        </p>
      </div>
    </article>
  );
}

export default function JockeySchedulePage() {
  const { appState } = useApp();
  const races = appState.races;

  return (
    <div className="page-stack">
      <SuspensionBanner />
      {GROUPS.map(({ key, label, tone }) => {
        const group = races.filter((r) => r.liveStatus === key);
        if (group.length === 0) return null;
        return (
          <Panel
            key={key}
            title={label}
            subtitle={`${group.length} cuộc đua`}
            action={<Badge tone={tone}>{viRaceStatus(key)}</Badge>}
          >
            <div className="timeline-list">
              {group.map((race) => <RaceRow key={race.id} race={race} />)}
            </div>
          </Panel>
        );
      })}

      {races.length === 0 && (
        <Panel title="Lịch của tôi" subtitle="Chưa được giao cuộc đua nào">
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Lịch đua của bạn đang trống.</p>
        </Panel>
      )}
    </div>
  );
}
