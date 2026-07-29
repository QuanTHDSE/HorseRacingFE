import { useEffect, useMemo, useState } from "react";
import type { RefereeRace } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";

interface RefereeRaceSelectorProps {
  races: RefereeRace[];
  value: string;
  onChange: (raceId: string) => void;
  emptyMessage?: string;
}

function formatRaceTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
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

export default function RefereeRaceSelector({
  races,
  value,
  onChange,
  emptyMessage = "Không có cuộc đua phù hợp.",
}: RefereeRaceSelectorProps) {
  const [chosenTournamentId, setChosenTournamentId] = useState("");

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
      const scheduledAt = new Date(race.scheduledAt).getTime();
      const existing = byId.get(race.tournamentId);
      if (existing) {
        existing.raceCount += 1;
        existing.priority = Math.min(existing.priority, racePriority(race.liveStatus));
        existing.firstRaceAt = Math.min(existing.firstRaceAt, scheduledAt);
        existing.lastRaceAt = Math.max(existing.lastRaceAt, scheduledAt);
      } else {
        byId.set(race.tournamentId, {
          id: race.tournamentId,
          name: race.tournamentName,
          raceCount: 1,
          priority: racePriority(race.liveStatus),
          firstRaceAt: scheduledAt,
          lastRaceAt: scheduledAt,
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
  }, [races]);

  const selectedRace = races.find((race) => race.id === value) ?? null;
  const selectedTournamentId = selectedRace?.tournamentId
    || (tournaments.some((tournament) => tournament.id === chosenTournamentId) ? chosenTournamentId : "");
  const effectiveTournamentId = selectedTournamentId || (tournaments.length === 1 ? tournaments[0]!.id : "");
  const tournamentRaces = useMemo(
    () => races
      .filter((race) => race.tournamentId === effectiveTournamentId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() || a.round - b.round),
    [effectiveTournamentId, races],
  );

  const onlyRaceId = !value && tournamentRaces.length === 1 ? tournamentRaces[0]!.id : "";
  useEffect(() => {
    if (onlyRaceId) onChange(onlyRaceId);
  }, [onlyRaceId, onChange]);

  useEffect(() => {
    if (value && !selectedRace) onChange("");
  }, [onChange, selectedRace, value]);

  function handleTournamentChange(tournamentId: string) {
    setChosenTournamentId(tournamentId);
    onChange("");
  }

  return (
    <div className="form-grid-2 referee-race-selector" style={{ maxWidth: "900px", alignItems: "start" }}>
      <label className="field">
        <span>Giải đấu</span>
        <select
          value={effectiveTournamentId}
          onChange={(event) => handleTournamentChange(event.target.value)}
        >
          <option value="">— Chọn giải đấu —</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} ({tournament.raceCount} cuộc đua)
            </option>
          ))}
        </select>
        {tournaments.length === 0 && (
          <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>{emptyMessage}</span>
        )}
      </label>

      <label className="field">
        <span>Cuộc đua</span>
        <select
          value={value}
          disabled={!effectiveTournamentId}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">
            {effectiveTournamentId ? "— Chọn cuộc đua —" : "— Chọn giải đấu trước —"}
          </option>
          {tournamentRaces.map((race) => (
            <option key={race.id} value={race.id}>
              {race.name} · Vòng {race.round} · {formatRaceTime(race.scheduledAt)} · {viRaceStatus(race.liveStatus)}
            </option>
          ))}
        </select>
        {effectiveTournamentId && tournamentRaces.length === 0 && (
          <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>
            Giải đấu này không có cuộc đua phù hợp với màn hình hiện tại.
          </span>
        )}
      </label>
    </div>
  );
}
