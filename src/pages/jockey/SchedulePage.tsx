import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race } from "../../types";
import { cn } from "../../utils/cn";
import { viRaceStatus } from "../../utils/viLabels";
import { penaltyLabel } from "../../utils/penaltyLabels";
import {
  formatRaceTime,
  formatScheduleDay,
  isSameLocalDay,
  JOCKEY_RACE_STATUS_TONE,
  raceTimestamp,
  scheduleDayKey,
} from "./jockeyUi";

type Filter = "all" | "upcoming" | "completed";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Toàn bộ lịch",
  upcoming: "Sắp tới",
  completed: "Đã hoàn thành",
};

function ScheduleRace({ race }: { race: Race }) {
  return (
    <article className={cn("jockey-schedule-item", `is-${race.liveStatus.toLowerCase()}`)}>
      <div className="jockey-schedule-time">
        <strong>{formatRaceTime(race.date)}</strong>
        <span>{race.distance || "Cự ly —"}</span>
      </div>

      <div className="jockey-schedule-content">
        <span className="jockey-schedule-tournament">
          {race.tournamentName ?? race.track ?? "Giải đấu chưa cập nhật"}
        </span>
        <div className="jockey-schedule-title-row">
          <h4>{race.name}</h4>
          <Badge tone={JOCKEY_RACE_STATUS_TONE[race.liveStatus] ?? "neutral"}>
            {viRaceStatus(race.liveStatus)}
          </Badge>
        </div>
        <div className="jockey-schedule-meta">
          <span><b>Ngựa:</b> {race.horseName ?? "Chưa cập nhật"}</span>
          <span><b>Vòng:</b> {race.round || "—"}</span>
          <span><b>Chủ ngựa:</b> {race.ownerName ?? "Chưa cập nhật"}</span>
          {race.laneNumber ? <span><b>Làn:</b> {race.laneNumber}</span> : null}
        </div>
      </div>

      {race.result?.isDisqualified ? (
        <div className="jockey-schedule-rank">
          <span>Kết quả</span>
          <strong className="is-danger">Hủy kết quả</strong>
        </div>
      ) : race.result?.rank ? (
        <div className="jockey-schedule-rank">
          <span>Kết quả</span>
          <strong>Hạng {race.result.rank}</strong>
          {!!race.violations?.length && (
            <em>{penaltyLabel(race.violations[0].penaltyApplied)}</em>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default function JockeySchedulePage() {
  const { appState, isDataLoading } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const races = appState.races;

  const todayCount = races.filter((race) => race.liveStatus !== "Cancelled" && isSameLocalDay(race.date)).length;
  const upcomingCount = races.filter((race) => ["Upcoming", "Ready", "Live"].includes(race.liveStatus)).length;
  const completedCount = races.filter((race) => race.liveStatus === "Completed").length;

  const filtered = useMemo(() => races
    .filter((race) => {
      if (filter === "upcoming") return ["Upcoming", "Ready", "Live"].includes(race.liveStatus);
      if (filter === "completed") return race.liveStatus === "Completed";
      return true;
    })
    .sort((left, right) => {
      const dateDiff = raceTimestamp(left.date) - raceTimestamp(right.date);
      return filter === "completed" ? -dateDiff : dateDiff;
    }), [filter, races]);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, Race[]>();
    filtered.forEach((race) => {
      const key = scheduleDayKey(race.date);
      const current = groups.get(key) ?? [];
      current.push(race);
      groups.set(key, current);
    });
    return [...groups.entries()];
  }, [filtered]);

  return (
    <div className="page-stack jockey-page">
      <SuspensionBanner />

      <div className="metric-grid three">
        <MetricCard
          label="Lịch hôm nay"
          value={String(todayCount)}
          note="Cuộc đua trong ngày"
          tone="warning"
          loading={isDataLoading && races.length === 0}
        />
        <MetricCard
          label="Sắp tới"
          value={String(upcomingCount)}
          note="Bao gồm cuộc đua đang diễn ra"
          tone="accent"
          loading={isDataLoading && races.length === 0}
        />
        <MetricCard
          label="Đã hoàn thành"
          value={String(completedCount)}
          note="Lịch sử thi đấu"
          tone="success"
          loading={isDataLoading && races.length === 0}
        />
      </div>

      <Panel
        title="Lịch thi đấu của tôi"
        subtitle={`${filtered.length} cuộc đua trong lịch đang chọn`}
        action={
          <div className="filter-tabs jockey-filter-tabs" aria-label="Lọc lịch thi đấu">
            {(["all", "upcoming", "completed"] as Filter[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cn("filter-tab", filter === item && "is-active")}
                onClick={() => setFilter(item)}
              >
                {FILTER_LABEL[item]}
              </button>
            ))}
          </div>
        }
      >
        {isDataLoading && races.length === 0 && <LoadingState label="Đang tải lịch thi đấu…" />}
        {!isDataLoading && filtered.length === 0 && (
          <div className="empty-state jockey-empty-state">
            <strong>Lịch thi đấu đang trống</strong>
            <p>Các cuộc đua được giao sẽ tự động xuất hiện trong lịch này.</p>
          </div>
        )}

        <div className="jockey-schedule-list">
          {dayGroups.map(([key, group]) => (
            <section key={key} className="jockey-schedule-day">
              <div className="jockey-schedule-day-heading">
                <h3>{formatScheduleDay(group[0]?.date)}</h3>
                <span>{group.length} cuộc đua</span>
              </div>
              <div className="jockey-schedule-day-items">
                {group.map((race) => <ScheduleRace key={race.id} race={race} />)}
              </div>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}
