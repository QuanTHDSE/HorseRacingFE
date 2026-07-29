import { useEffect, useMemo, useState } from "react";
import { Badge, ConfirmDeleteButton, LoadingState, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { Race, RaceViolation } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";

const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  result_void: "Hủy kết quả",
  time_ban: "Cấm thi đấu có thời hạn",
  permanent_ban: "Cấm thi đấu vĩnh viễn",
};

function penaltyTone(penalty?: string | null): "danger" | "warning" | "info" {
  if (!penalty || penalty === "warning") return "warning";
  if (penalty === "time_ban") return "info";
  return "danger";
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function racePriority(status: string): number {
  if (status === "Ready" || status === "Live") return 0;
  if (status === "Upcoming") return 1;
  if (status === "Completed") return 2;
  return 3;
}

function tournamentKey(race: Race): string {
  return race.tournamentId || `unknown:${race.tournamentName ?? race.track}`;
}

export default function PenaltyReviewPage() {
  const {
    appState,
    isDataLoading,
    handleGetAdminRaceViolations,
    handleAdminLiftRaceBan,
  } = useApp();
  const { success: showSuccess, error: showError } = useFeedback();
  const [chosenTournamentId, setChosenTournamentId] = useState("");
  const [raceId, setRaceId] = useState("");
  const [violations, setViolations] = useState<RaceViolation[]>([]);
  const [loading, setLoading] = useState(false);

  const races = useMemo(
    () => appState.races.slice().sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return Number.isNaN(dateDiff) ? b.id.localeCompare(a.id) : dateDiff;
    }),
    [appState.races],
  );

  const tournamentNameById = useMemo(
    () => new Map(appState.tournaments.map((tournament) => [tournament.id, tournament.name])),
    [appState.tournaments],
  );

  const tournaments = useMemo(() => {
    const byId = new Map<string, {
      id: string;
      name: string;
      raceCount: number;
      priority: number;
      firstRaceAt: number;
      lastRaceAt: number;
    }>();

    for (const race of races) {
      const id = tournamentKey(race);
      const scheduledAt = new Date(race.date).getTime();
      const safeScheduledAt = Number.isNaN(scheduledAt) ? 0 : scheduledAt;
      const existing = byId.get(id);
      if (existing) {
        existing.raceCount += 1;
        existing.priority = Math.min(existing.priority, racePriority(race.liveStatus));
        existing.firstRaceAt = Math.min(existing.firstRaceAt, safeScheduledAt);
        existing.lastRaceAt = Math.max(existing.lastRaceAt, safeScheduledAt);
      } else {
        byId.set(id, {
          id,
          name: tournamentNameById.get(race.tournamentId)
            ?? race.tournamentName
            ?? "Giải đấu chưa xác định",
          raceCount: 1,
          priority: racePriority(race.liveStatus),
          firstRaceAt: safeScheduledAt,
          lastRaceAt: safeScheduledAt,
        });
      }
    }

    return [...byId.values()].sort((a, b) => {
      const priorityDiff = a.priority - b.priority;
      if (priorityDiff) return priorityDiff;
      const dateDiff = a.priority >= 2
        ? b.lastRaceAt - a.lastRaceAt
        : a.firstRaceAt - b.firstRaceAt;
      return dateDiff || a.name.localeCompare(b.name, "vi");
    });
  }, [races, tournamentNameById]);

  const selectedRace = races.find((race) => race.id === raceId);
  const selectedTournamentId = selectedRace
    ? tournamentKey(selectedRace)
    : (tournaments.some((tournament) => tournament.id === chosenTournamentId)
        ? chosenTournamentId
        : "");
  const effectiveTournamentId = selectedTournamentId
    || (tournaments.length === 1 ? tournaments[0]!.id : "");
  const tournamentRaces = useMemo(
    () => races
      .filter((race) => tournamentKey(race) === effectiveTournamentId)
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return dateDiff || a.name.localeCompare(b.name, "vi");
      }),
    [effectiveTournamentId, races],
  );
  const liftableBans = violations.filter((violation) => violation.canLiftBan);

  useEffect(() => {
    if (raceId && !selectedRace) setRaceId("");
  }, [raceId, selectedRace]);

  useEffect(() => {
    if (!raceId && tournamentRaces.length === 1) setRaceId(tournamentRaces[0]!.id);
  }, [raceId, tournamentRaces]);

  useEffect(() => {
    if (!raceId) {
      setViolations([]);
      return;
    }

    let active = true;
    setLoading(true);
    handleGetAdminRaceViolations(raceId)
      .then((items) => {
        if (active) setViolations(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setViolations([]);
          showError(error instanceof Error ? error.message : "Không tải được danh sách vi phạm.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [raceId, handleGetAdminRaceViolations, showError]);

  async function liftBan(violationId: string): Promise<void> {
    const { wasPublished } = await handleAdminLiftRaceBan(raceId, violationId);
    const refreshed = await handleGetAdminRaceViolations(raceId);
    setViolations(refreshed);
    showSuccess(
      wasPublished
        ? "Đã gỡ án cấm. Kết quả đã công bố, trạng thái bị loại, điểm và giải thưởng được giữ nguyên."
        : "Đã gỡ án cấm. Biên bản và trạng thái bị loại vẫn được giữ nguyên.",
    );
  }

  function handleTournamentChange(tournamentId: string): void {
    setChosenTournamentId(tournamentId);
    setRaceId("");
  }

  return (
    <div className="page-stack">
      <Panel
        title="Gỡ án cấm ngựa và nài ngựa"
        subtitle="Chỉ gỡ án cấm theo ngày hoặc cấm vĩnh viễn; biên bản và kết quả cuộc đua vẫn được giữ nguyên"
      >
        <div className="form-grid-2 referee-race-selector" style={{ maxWidth: "900px", alignItems: "start" }}>
          <label className="field">
            <span>Giải đấu</span>
            <select
              value={effectiveTournamentId}
              onChange={(event) => handleTournamentChange(event.target.value)}
              disabled={isDataLoading}
            >
              <option value="">— Chọn giải đấu —</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.raceCount} cuộc đua)
                </option>
              ))}
            </select>
            {tournaments.length === 0 && !isDataLoading && (
              <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>
                Chưa có giải đấu hoặc cuộc đua để kiểm tra.
              </span>
            )}
          </label>

          <label className="field">
            <span>Cuộc đua</span>
            <select
              value={raceId}
              onChange={(event) => setRaceId(event.target.value)}
              disabled={isDataLoading || !effectiveTournamentId}
            >
              <option value="">
                {effectiveTournamentId
                  ? "— Chọn cuộc đua cần kiểm tra —"
                  : "— Chọn giải đấu trước —"}
              </option>
              {tournamentRaces.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name} · Vòng {race.round} · {fmtDate(race.date)} · {viRaceStatus(race.liveStatus)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {raceId && (
        <Panel
          title={`Biên bản vi phạm — ${selectedRace?.name ?? "Cuộc đua"}`}
          subtitle={`${liftableBans.length} án cấm có thể gỡ`}
          action={
            <Badge tone={liftableBans.length > 0 ? "warning" : "neutral"}>
              {liftableBans.length} án cấm
            </Badge>
          }
        >
          {loading ? (
            <LoadingState label="Đang tải biên bản vi phạm…" />
          ) : liftableBans.length === 0 ? (
            <div className="referee-empty-state">
              <strong>Không có án cấm có thể gỡ</strong>
              <p>Cảnh cáo và hủy kết quả không thuộc phạm vi gỡ án của admin.</p>
            </div>
          ) : (
            <div className="referee-violation-list">
              {liftableBans.map((violation) => (
                <article className="referee-violation-card" key={violation.id}>
                  <div className="referee-violation-main">
                    <div className="referee-violation-heading">
                      <div>
                        <span className="referee-eyebrow">{fmtDate(violation.recordedAt)}</span>
                        <strong>{violation.type}</strong>
                      </div>
                      <Badge tone={penaltyTone(violation.penaltyApplied)}>
                        {violation.penaltyApplied
                          ? (PENALTY_LABEL[violation.penaltyApplied] ?? violation.penaltyApplied)
                          : "Chưa xác định"}
                      </Badge>
                    </div>
                    <p>{violation.description}</p>
                    <div className="referee-violation-meta">
                      <span>
                        <small>Ngựa</small>
                        <b>{violation.horseName ?? "—"}</b>
                      </span>
                      <span>
                        <small>Nài ngựa</small>
                        <b>{violation.jockeyName ?? "—"}</b>
                      </span>
                      <span>
                        <small>Đối tượng bị phạt</small>
                        <b>
                          {violation.target === "jockey"
                            ? "Nài ngựa"
                            : violation.target === "both"
                              ? "Ngựa và nài"
                              : "Ngựa"}
                        </b>
                      </span>
                      {violation.bannedUntil && (
                        <span>
                          <small>Cấm đến</small>
                          <b>{fmtDate(violation.bannedUntil)}</b>
                        </span>
                      )}
                    </div>
                  </div>
                  <ConfirmDeleteButton
                    label="Gỡ án cấm"
                    confirmLabel="Xác nhận gỡ án?"
                    onConfirm={() => liftBan(violation.id)}
                  />
                </article>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
