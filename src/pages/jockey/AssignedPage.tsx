import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race } from "../../types";
import { cn } from "../../utils/cn";
import { viRaceStatus } from "../../utils/viLabels";
import {
  formatRaceDateTime,
  JOCKEY_RACE_STATUS_TONE,
  sortJockeyRaces,
} from "./jockeyUi";

type Filter = "all" | "upcoming" | "live" | "completed";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Tất cả",
  upcoming: "Sắp tới",
  live: "Đang diễn ra",
  completed: "Đã hoàn thành",
};

function formatPrize(value?: number): string {
  if (value === undefined || value === null) return "Chưa cập nhật";
  return `${value.toLocaleString("vi-VN")} VND`;
}

function formatFinishTime(value?: number): string {
  if (value === undefined || value === null) return "Chưa cập nhật";
  return `${(value / 1000).toFixed(2)} giây`;
}

function ResultBadge({ rank }: { rank?: number }) {
  if (!rank) return <Badge tone="neutral">Chưa có thứ hạng</Badge>;
  if (rank === 1) return <Badge tone="success">Hạng 1</Badge>;
  if (rank === 2) return <Badge tone="accent">Hạng 2</Badge>;
  if (rank === 3) return <Badge tone="info">Hạng 3</Badge>;
  return <Badge tone="neutral">Hạng {rank}</Badge>;
}

function RaceCard({ race }: { race: Race }) {
  const hasResult = race.liveStatus === "Completed" && race.result !== undefined && race.result !== null;

  return (
    <article className={cn("jockey-card jockey-race-card", `is-${race.liveStatus.toLowerCase()}`)}>
      <div className="jockey-card-topline">
        <span>{race.tournamentName ?? race.track ?? "Giải đấu chưa cập nhật"}</span>
        <Badge tone={JOCKEY_RACE_STATUS_TONE[race.liveStatus] ?? "neutral"}>
          {viRaceStatus(race.liveStatus)}
        </Badge>
      </div>

      <div className="jockey-card-heading">
        <h3>{race.name}</h3>
        <p>{race.round ? `Vòng ${race.round}` : "Vòng đấu chưa cập nhật"}</p>
      </div>

      <div className="jockey-race-highlight">
        <span>Ngựa bạn sẽ cưỡi</span>
        <strong>{race.horseName ?? "Chưa cập nhật"}</strong>
      </div>

      <dl className="jockey-detail-grid">
        <div>
          <dt>Thời gian thi đấu</dt>
          <dd>{formatRaceDateTime(race.date)}</dd>
        </div>
        <div>
          <dt>Cự ly</dt>
          <dd>{race.distance || "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Chủ ngựa</dt>
          <dd>{race.ownerName ?? "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Làn xuất phát</dt>
          <dd>{race.laneNumber ? `Làn ${race.laneNumber}` : "Chưa phân làn"}</dd>
        </div>
      </dl>

      {race.liveStatus === "Live" && (
        <div className="jockey-status-note is-live">
          <span className="jockey-live-dot" />
          Cuộc đua đang diễn ra
        </div>
      )}

      {race.liveStatus === "Ready" && (
        <div className="jockey-status-note is-ready">Hãy có mặt và chuẩn bị tại khu vực xuất phát.</div>
      )}

      {hasResult && race.result && (
        <div className="jockey-result-panel">
          <div className="jockey-result-heading">
            <strong>Kết quả của bạn</strong>
            <ResultBadge rank={race.result.rank} />
          </div>
          <dl>
            <div>
              <dt>Thời gian về đích</dt>
              <dd>{formatFinishTime(race.result.finishTime)}</dd>
            </div>
            <div>
              <dt>Giải thưởng</dt>
              <dd>{formatPrize(race.result.prize)}</dd>
            </div>
          </dl>
        </div>
      )}

      {race.liveStatus === "Completed" && !hasResult && (
        <div className="jockey-status-note">Kết quả đang được cập nhật.</div>
      )}
    </article>
  );
}

export default function AssignedPage() {
  const { appState, isDataLoading } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const races = appState.races;

  const upcomingCount = races.filter((race) => ["Upcoming", "Ready"].includes(race.liveStatus)).length;
  const liveCount = races.filter((race) => race.liveStatus === "Live").length;
  const completedCount = races.filter((race) => race.liveStatus === "Completed").length;
  const tournamentCount = new Set(races.map((race) => race.tournamentId).filter(Boolean)).size;

  const filtered = useMemo(() => sortJockeyRaces(races.filter((race) => {
    if (filter === "upcoming") return ["Upcoming", "Ready"].includes(race.liveStatus);
    if (filter === "live") return race.liveStatus === "Live";
    if (filter === "completed") return race.liveStatus === "Completed";
    return true;
  })), [filter, races]);

  return (
    <div className="page-stack jockey-page">
      <SuspensionBanner />

      <div className="metric-grid three">
        <MetricCard
          label="Cần chuẩn bị"
          value={String(upcomingCount)}
          note="Cuộc đua sắp tới và sẵn sàng"
          tone="warning"
          loading={isDataLoading && races.length === 0}
        />
        <MetricCard
          label="Đang diễn ra"
          value={String(liveCount)}
          note="Cuộc đua đang hoạt động"
          tone="success"
          loading={isDataLoading && races.length === 0}
        />
        <MetricCard
          label="Đã hoàn thành"
          value={String(completedCount)}
          note="Có thể xem lại kết quả"
          tone="accent"
          loading={isDataLoading && races.length === 0}
        />
      </div>

      <Panel
        title="Cuộc đua được giao"
        subtitle={`${tournamentCount} giải đấu · ${races.length} cuộc đua`}
        action={
          <div className="filter-tabs jockey-filter-tabs" aria-label="Lọc cuộc đua được giao">
            {(["all", "upcoming", "live", "completed"] as Filter[]).map((item) => (
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
        {isDataLoading && races.length === 0 && <LoadingState label="Đang tải cuộc đua được giao…" />}
        {!isDataLoading && filtered.length === 0 && (
          <div className="empty-state jockey-empty-state">
            <strong>Không có cuộc đua phù hợp</strong>
            <p>Hãy chọn bộ lọc khác hoặc quay lại sau khi có phân công mới.</p>
          </div>
        )}

        <div className="jockey-card-grid">
          {filtered.map((race) => <RaceCard key={race.id} race={race} />)}
        </div>
      </Panel>
    </div>
  );
}
