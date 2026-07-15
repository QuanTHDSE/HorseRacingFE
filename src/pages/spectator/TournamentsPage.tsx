import { useMemo, useState } from "react";
import { Badge, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { SpectatorRace, Tournament } from "../../types";
import { cn } from "../../utils/cn";

type TournamentFilter = "all" | "live" | "registration" | "completed";

const TOURNAMENT_STATUS: Record<string, {
  key: TournamentFilter | "draft";
  label: string;
  tone: "accent" | "success" | "neutral";
}> = {
  Live: { key: "live", label: "Đang diễn ra", tone: "success" },
  Registration: { key: "registration", label: "Đang mở đăng ký", tone: "accent" },
  Completed: { key: "completed", label: "Đã kết thúc", tone: "neutral" },
  Draft: { key: "draft", label: "Sắp công bố", tone: "neutral" },
};

const RACE_GROUPS: Array<{
  key: string;
  label: string;
  description: string;
  tone: "success" | "accent" | "neutral" | "danger";
}> = [
  { key: "Live", label: "Đang diễn ra", description: "Cuộc đua đang được cập nhật trực tiếp", tone: "success" },
  { key: "Upcoming", label: "Sắp diễn ra", description: "Lịch đua đã được ban tổ chức công bố", tone: "accent" },
  { key: "Completed", label: "Đã kết thúc", description: "Kết quả và thứ hạng gần nhất", tone: "neutral" },
  { key: "Cancelled", label: "Đã hủy", description: "Cuộc đua không còn trong lịch thi đấu", tone: "danger" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTournamentStatus(tournament: Tournament) {
  return TOURNAMENT_STATUS[tournament.status] ?? TOURNAMENT_STATUS.Draft;
}

function formatPrizePool(prizePool: string): string {
  const amount = Number(prizePool);
  return prizePool && prizePool !== "—" && Number.isFinite(amount) && amount > 0
    ? `${amount.toLocaleString("vi-VN")} điểm`
    : "Chưa công bố";
}

function TournamentRaceRow({ race }: { race: SpectatorRace }) {
  const top3 = race.result?.rankings
    .filter((ranking) => ranking.rank <= 3)
    .sort((a, b) => a.rank - b.rank) ?? [];
  const group = RACE_GROUPS.find((item) => item.key === race.liveStatus);

  return (
    <article className="spectator-tournament-race">
      <div className="spectator-tournament-race-main">
        <div className="spectator-race-item-status">
          <Badge tone={group?.tone ?? "neutral"}>{group?.label ?? race.liveStatus}</Badge>
          {race.liveStatus === "Live" && <span className="spectator-live-label"><i /> Trực tiếp</span>}
          {race.result?.publishedAt && <span className="spectator-published-label">Đã công bố kết quả</span>}
        </div>
        <h4>{race.name}</h4>
        <p>Vòng {race.round} · {fmtDateTime(race.scheduledAt)}</p>
      </div>

      <div className="spectator-tournament-race-meta">
        <span><strong>{race.distance ? `${race.distance} m` : "—"}</strong>Cự ly</span>
        <span><strong>{race.participants.length}</strong>Ngựa tham dự</span>
        <span>
          <strong>{race.hasPrediction ? "Đã dự đoán" : race.canPredict ? "Đang mở" : "Chưa mở"}</strong>
          Dự đoán
        </span>
      </div>

      {race.liveStatus === "Completed" && top3.length > 0 && (
        <div className="spectator-tournament-top-three" aria-label={`Ba thứ hạng đầu của ${race.name}`}>
          {top3.map((ranking) => (
            <div key={`${race.id}-${ranking.rank}`} className={cn(ranking.isDisqualified && "is-disqualified")}>
              <span className={cn("spectator-rank-badge", `is-rank-${ranking.rank}`)}>{ranking.rank}</span>
              <span><strong>{ranking.horse.name}</strong><small>{ranking.jockey.fullName}</small></span>
              {ranking.isDisqualified && <Badge tone="danger">DQ</Badge>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TournamentRaces({ races }: { races: SpectatorRace[] }) {
  if (races.length === 0) {
    return (
      <div className="spectator-result-empty">
        <strong>Chưa có lịch đua</strong>
        <p>Các cuộc đua sẽ xuất hiện tại đây sau khi ban tổ chức công bố.</p>
      </div>
    );
  }

  return (
    <div className="spectator-tournament-race-groups">
      {RACE_GROUPS.map((raceGroup) => {
        const group = races
          .filter((race) => race.liveStatus === raceGroup.key)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        if (group.length === 0) return null;

        return (
          <section className="spectator-section" key={raceGroup.key}>
            <div className="spectator-section-heading">
              <div>
                <h3>{raceGroup.label}</h3>
                <p>{raceGroup.description}</p>
              </div>
              <span>{group.length} cuộc đua</span>
            </div>
            <div className="spectator-tournament-race-list">
              {group.map((race) => <TournamentRaceRow key={race.id} race={race} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function TournamentsPage() {
  const { appState } = useApp();
  const [filter, setFilter] = useState<TournamentFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    live: appState.tournaments.filter((tournament) => tournament.status === "Live").length,
    registration: appState.tournaments.filter((tournament) => tournament.status === "Registration").length,
    completed: appState.tournaments.filter((tournament) => tournament.status === "Completed").length,
  }), [appState.tournaments]);

  const filteredTournaments = useMemo(() => appState.tournaments
    .filter((tournament) => filter === "all" || getTournamentStatus(tournament).key === filter)
    .sort((a, b) => {
      const direction = filter === "completed" ? -1 : 1;
      return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * direction;
    }), [appState.tournaments, filter]);

  const selectedTournament = filteredTournaments.find((tournament) => tournament.id === selectedId)
    ?? filteredTournaments[0]
    ?? null;
  const selectedRaces = selectedTournament
    ? appState.spectatorRaces.filter((race) => race.tournamentId === selectedTournament.id)
    : [];

  const filters: Array<{ key: TournamentFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: appState.tournaments.length },
    { key: "live", label: "Đang diễn ra", count: counts.live },
    { key: "registration", label: "Đang mở", count: counts.registration },
    { key: "completed", label: "Đã kết thúc", count: counts.completed },
  ];

  if (appState.tournaments.length === 0) {
    return (
      <div className="page-stack">
        <Panel title="Giải đấu" subtitle="Theo dõi các giải đua ngựa đang và sắp diễn ra">
          <div className="spectator-result-empty">
            <strong>Chưa có giải đấu nào được công bố</strong>
            <p>Thông tin giải và lịch thi đấu sẽ xuất hiện tại đây khi sẵn sàng.</p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className={cn("spectator-tournament-layout", selectedTournament && "has-detail")}>
        <div className="spectator-tournament-browser">
          <Panel
            title="Giải đấu"
            subtitle="Theo dõi thông tin giải và lịch thi đấu"
            action={
              <div className="filter-tabs spectator-filter-tabs" aria-label="Lọc giải đấu">
                {filters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={cn("filter-tab", filter === item.key && "is-active")}
                    aria-pressed={filter === item.key}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}<span>{item.count}</span>
                  </button>
                ))}
              </div>
            }
          >
            <div className="spectator-race-stats" aria-label="Tổng quan giải đấu">
              <div><strong>{counts.live}</strong><span>Đang diễn ra</span></div>
              <div><strong>{counts.registration}</strong><span>Đang mở đăng ký</span></div>
              <div><strong>{counts.completed}</strong><span>Đã kết thúc</span></div>
            </div>

            {filteredTournaments.length === 0 ? (
              <div className="spectator-result-empty">
                <strong>Chưa có giải đấu trong mục này</strong>
                <p>Hãy chọn một trạng thái khác để xem các giải hiện có.</p>
              </div>
            ) : (
              <div className="spectator-tournament-list">
                {filteredTournaments.map((tournament) => {
                  const status = getTournamentStatus(tournament);
                  const raceCount = appState.spectatorRaces.filter((race) => race.tournamentId === tournament.id).length;
                  const selected = selectedTournament.id === tournament.id;

                  return (
                    <article className={cn("spectator-tournament-item", selected && "is-selected")} key={tournament.id}>
                      <div className="spectator-tournament-item-head">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <button
                          type="button"
                          className={cn("secondary-button", "btn-xs", selected && "is-active")}
                          aria-pressed={selected}
                          onClick={() => setSelectedId(tournament.id)}
                        >
                          {selected ? "Đang xem" : "Xem lịch đua"}
                        </button>
                      </div>
                      <h3>{tournament.name}</h3>
                      <p>{tournament.location || "Địa điểm đang cập nhật"}</p>
                      <div className="spectator-tournament-item-meta">
                        <span>{fmtDate(tournament.startDate)} - {fmtDate(tournament.endDate)}</span>
                        <span>{raceCount} cuộc đua</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {selectedTournament && (
          <div className="spectator-tournament-detail">
            <Panel
              title={selectedTournament.name}
              subtitle={selectedTournament.location || "Địa điểm đang cập nhật"}
              action={<Badge tone={getTournamentStatus(selectedTournament).tone}>{getTournamentStatus(selectedTournament).label}</Badge>}
            >
              <div className="spectator-tournament-detail-stack">
                <div className="spectator-tournament-overview">
                  <div className="spectator-tournament-date">
                    <span>Thời gian tổ chức</span>
                    <strong>{fmtDate(selectedTournament.startDate)} - {fmtDate(selectedTournament.endDate)}</strong>
                  </div>
                  <div className="spectator-tournament-facts">
                    <div><span>Tổng cuộc đua</span><strong>{selectedRaces.length}</strong></div>
                    <div><span>Đang diễn ra</span><strong>{selectedRaces.filter((race) => race.liveStatus === "Live").length}</strong></div>
                    <div><span>Tổng giải thưởng</span><strong>{formatPrizePool(selectedTournament.prizePool)}</strong></div>
                  </div>
                </div>

                <section className="spectator-section">
                  <div className="spectator-section-heading">
                    <div>
                      <h3>Lịch thi đấu</h3>
                      <p>Cuộc đua được sắp xếp theo trạng thái và thời gian</p>
                    </div>
                    <span>{selectedRaces.length} cuộc đua</span>
                  </div>
                  <TournamentRaces races={selectedRaces} />
                </section>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
