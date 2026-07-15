import { Fragment, useState } from "react";
import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { SpectatorRace, Tournament } from "../../types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_TONE: Record<string, string> = {
  published: "accent",
  ongoing:   "success",
  completed: "neutral",
  draft:     "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Đang đăng ký",
  ongoing:   "Đang diễn ra",
  completed: "Đã kết thúc",
  draft:     "Nháp",
};

const RACE_GROUPS: { key: string; label: string; tone: "success" | "accent" | "neutral" }[] = [
  { key: "Live",      label: "Đang diễn ra", tone: "success" },
  { key: "Upcoming",  label: "Sắp diễn ra",  tone: "accent"  },
  { key: "Completed", label: "Đã kết thúc",  tone: "neutral" },
];

function TournamentRaceRow({ race }: { race: SpectatorRace }) {
  const top3 = race.result?.rankings.filter((r) => r.rank <= 3).sort((a, b) => a.rank - b.rank) ?? [];
  return (
    <article className="info-card">
      <div className="card-head">
        <strong>{race.name}</strong>
        {race.distance && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{race.distance}m</span>}
      </div>
      <p style={{ margin: "4px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {fmtDateTime(race.scheduledAt)} · {race.participants.length} ngựa
      </p>
      {race.liveStatus === "Completed" && top3.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
          {top3.map((rk) => (
            <div key={rk.rank} style={{ display: "flex", gap: "8px", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>#{rk.rank}</span>
              <strong>{rk.horse.name}</strong>
              <span style={{ color: "var(--text-muted)" }}>{rk.jockey.fullName}</span>
              {rk.isDisqualified && <Badge tone="danger">DQ</Badge>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TournamentRaces({ races }: { races: SpectatorRace[] }) {
  if (races.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Giải này chưa có cuộc đua nào.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {RACE_GROUPS.map(({ key, label, tone }) => {
        const group = races.filter((r) => r.liveStatus === key);
        if (group.length === 0) return null;
        return (
          <div key={key}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Badge tone={tone}>{label}</Badge>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {group.length} cuộc đua
              </span>
            </div>
            <div className="card-list">
              {group.map((race) => <TournamentRaceRow key={race.id} race={race} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TournamentsPage() {
  const { appState } = useApp();
  const tournaments = appState.tournaments;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const live       = tournaments.filter((t) => t.status === "Live");
  const open       = tournaments.filter((t) => t.status === "Registration");
  const completed  = tournaments.filter((t) => t.status === "Completed");

  function renderCard(t: Tournament) {
    const apiStatus = t.status === "Live" ? "ongoing"
      : t.status === "Registration" ? "published"
      : t.status === "Completed" ? "completed"
      : "draft";
    const isExpanded = expandedId === t.id;
    const races = appState.spectatorRaces.filter((r) => r.tournamentId === t.id);
    return (
      <Fragment key={t.id}>
        <article
          className="feature-card"
          style={{ cursor: "pointer" }}
          onClick={() => setExpandedId((v) => (v === t.id ? null : t.id))}
        >
          <div className="card-head">
            <strong>{t.name}</strong>
            <Badge tone={STATUS_TONE[apiStatus] as any ?? "neutral"}>
              {STATUS_LABEL[apiStatus] ?? t.status}
            </Badge>
          </div>
          {t.location && (
            <p style={{ margin: "6px 0 4px", fontSize: "0.875rem" }}>
              📍 {t.location}
            </p>
          )}
          <p style={{ margin: "2px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {fmtDate(t.startDate)} — {fmtDate(t.endDate)}
          </p>
          {t.prizePool && t.prizePool !== "—" && (
            <p style={{ margin: "6px 0 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--accent)" }}>
              Tổng giải thưởng: {Number(t.prizePool).toLocaleString()} điểm
            </p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--accent)" }}>
            {isExpanded ? "Ẩn cuộc đua ▲" : "Xem cuộc đua ▼"}
          </p>
        </article>
        {isExpanded && (
          <div style={{ gridColumn: "1 / -1" }}>
            <TournamentRaces races={races} />
          </div>
        )}
      </Fragment>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="page-stack">
        <Panel title="Giải đấu" subtitle="Hiện chưa có giải đấu nào">
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Quay lại sau để xem các sự kiện sắp tới.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {live.length > 0 && (
        <Panel
          title="Đang diễn ra"
          subtitle={`${live.length} giải đang diễn ra`}
          action={<Badge tone="success">Trực tiếp</Badge>}
        >
          <div className="card-grid three">
            {live.map(renderCard)}
          </div>
        </Panel>
      )}

      {open.length > 0 && (
        <Panel
          title="Đang mở đăng ký"
          subtitle="Các giải đang nhận đăng ký"
        >
          <div className="card-grid three">
            {open.map(renderCard)}
          </div>
        </Panel>
      )}

      {completed.length > 0 && (
        <Panel
          title="Đã kết thúc"
          subtitle="Các giải đã qua"
        >
          <div className="card-grid three">
            {completed.map(renderCard)}
          </div>
        </Panel>
      )}

      {live.length === 0 && open.length === 0 && (
        <Panel title="Tất cả giải đấu" subtitle={`${tournaments.length} giải đấu`}>
          <div className="card-grid three">
            {tournaments.map(renderCard)}
          </div>
        </Panel>
      )}
    </div>
  );
}
