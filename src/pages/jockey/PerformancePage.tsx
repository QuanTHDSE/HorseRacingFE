import { useMemo, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, RaceLeaderboard, SuspensionBanner } from "../../components";
import { useApp } from "../../context/AppContext";
import type { Race, Tone } from "../../types";
import { cn } from "../../utils/cn";
import { formatRaceDateTime, raceTimestamp } from "./jockeyUi";

type Filter = "all" | "wins" | "podiums" | "other";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Tất cả kết quả",
  wins: "Chiến thắng",
  podiums: "Top 3",
  other: "Kết quả khác",
};

function formatPrize(value?: number): string {
  if (value === undefined || value === null) return "Chưa cập nhật";
  return `${value.toLocaleString("vi-VN")} VND`;
}

function formatCompactPrize(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ VND`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} triệu VND`;
  return `${value.toLocaleString("vi-VN")} VND`;
}

function formatFinishTime(value?: number): string {
  if (value === undefined || value === null) return "Chưa cập nhật";
  return `${(value / 1000).toFixed(2)} giây`;
}

function rankTone(rank?: number): Tone {
  if (rank === 1) return "success";
  if (rank === 2) return "accent";
  if (rank === 3) return "info";
  return "neutral";
}

function rankLabel(rank?: number): string {
  return rank ? `Hạng ${rank}` : "Chưa công bố";
}

function ResultCard({ race, onViewLeaderboard }: { race: Race; onViewLeaderboard: (raceId: string) => void }) {
  const rank = race.result?.rank;

  return (
    <article className={cn("performance-result-card", rank === 1 && "is-winner")}>
      <div className="performance-rank-block">
        <span>{rank === 1 ? "Chiến thắng" : "Về đích"}</span>
        <strong>{rank ? `#${rank}` : "—"}</strong>
        <Badge tone={rankTone(rank)}>{rankLabel(rank)}</Badge>
      </div>

      <div className="performance-result-content">
        <span className="performance-result-tournament">
          {race.tournamentName ?? race.track ?? "Giải đấu chưa cập nhật"}
        </span>
        <h3>{race.name}</h3>
        <p>{formatRaceDateTime(race.date)}</p>

        <dl className="performance-result-details">
          <div>
            <dt>Ngựa thi đấu</dt>
            <dd>{race.horseName ?? "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Thời gian về đích</dt>
            <dd>{formatFinishTime(race.result?.finishTime)}</dd>
          </div>
          <div>
            <dt>Giải thưởng</dt>
            <dd>{formatPrize(race.result?.prize)}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        className="secondary-button btn-xs performance-leaderboard-button"
        onClick={() => onViewLeaderboard(race.id)}
      >
        Xem bảng xếp hạng
      </button>
    </article>
  );
}

export default function PerformancePage() {
  const { appState, user, isDataLoading } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedRaceId, setSelectedRaceId] = useState("");

  const completed = useMemo(() => [...appState.races]
    .filter((race) => race.liveStatus === "Completed")
    .sort((left, right) => raceTimestamp(right.date) - raceTimestamp(left.date)), [appState.races]);
  const withResult = completed.filter((race) => race.result?.rank !== undefined);
  const wins = withResult.filter((race) => race.result?.rank === 1).length;
  const podiums = withResult.filter((race) => (race.result?.rank ?? Number.MAX_SAFE_INTEGER) <= 3).length;
  const winRate = withResult.length > 0 ? Math.round((wins / withResult.length) * 100) : 0;
  const podiumRate = withResult.length > 0 ? Math.round((podiums / withResult.length) * 100) : 0;
  const averageRank = withResult.length > 0
    ? withResult.reduce((sum, race) => sum + (race.result?.rank ?? 0), 0) / withResult.length
    : null;
  const totalPrize = withResult.reduce((sum, race) => sum + (race.result?.prize ?? 0), 0);

  const filtered = useMemo(() => completed.filter((race) => {
    const rank = race.result?.rank;
    if (filter === "wins") return rank === 1;
    if (filter === "podiums") return rank !== undefined && rank <= 3;
    if (filter === "other") return rank === undefined || rank > 3;
    return true;
  }), [completed, filter]);

  const leaderboardRaceId = selectedRaceId && completed.some((race) => race.id === selectedRaceId)
    ? selectedRaceId
    : completed[0]?.id ?? "";
  const selectedRace = completed.find((race) => race.id === leaderboardRaceId);

  function viewLeaderboard(raceId: string) {
    setSelectedRaceId(raceId);
    window.requestAnimationFrame(() => {
      document.getElementById("jockey-leaderboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="page-stack jockey-page">
      <SuspensionBanner />

      <div className="metric-grid four">
        <MetricCard
          label="Cuộc đua đã xong"
          value={String(completed.length)}
          note="Tổng lượt đã hoàn thành"
          loading={isDataLoading && completed.length === 0}
        />
        <MetricCard
          label="Chiến thắng"
          value={String(wins)}
          note="Số lần về nhất"
          tone="success"
          loading={isDataLoading && completed.length === 0}
        />
        <MetricCard
          label="Vào top 3"
          value={String(podiums)}
          note="Số lần đứng trên bục"
          tone="accent"
          loading={isDataLoading && completed.length === 0}
        />
        <MetricCard
          label="Tỷ lệ thắng"
          value={withResult.length > 0 ? `${winRate}%` : "—"}
          note="Từ kết quả đã công bố"
          tone="info"
          loading={isDataLoading && completed.length === 0}
        />
      </div>

      <Panel title="Tổng quan phong độ" subtitle="Các chỉ số được tính từ kết quả đã công bố">
        <div className="performance-overview">
          <div className="performance-progress-list">
            <div className="performance-progress-item">
              <div><span>Tỷ lệ chiến thắng</span><strong>{winRate}%</strong></div>
              <div className="performance-progress-track"><span style={{ width: `${winRate}%` }} /></div>
            </div>
            <div className="performance-progress-item">
              <div><span>Tỷ lệ vào top 3</span><strong>{podiumRate}%</strong></div>
              <div className="performance-progress-track is-podium"><span style={{ width: `${podiumRate}%` }} /></div>
            </div>
          </div>

          <div className="performance-highlight-grid">
            <article>
              <span>Thứ hạng trung bình</span>
              <strong>{averageRank === null ? "—" : averageRank.toFixed(1)}</strong>
              <p>Trên {withResult.length} kết quả có thứ hạng</p>
            </article>
            <article>
              <span>Tổng giải thưởng</span>
              <strong>{formatCompactPrize(totalPrize)}</strong>
              <p>Tổng thưởng từ các kết quả hiện có</p>
            </article>
          </div>
        </div>
      </Panel>

      <Panel
        title="Lịch sử kết quả"
        subtitle={`Đang hiển thị ${filtered.length} trên ${completed.length} cuộc đua`}
        action={
          <div className="filter-tabs jockey-filter-tabs" aria-label="Lọc kết quả thi đấu">
            {(["all", "wins", "podiums", "other"] as Filter[]).map((item) => (
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
        {isDataLoading && completed.length === 0 && <LoadingState label="Đang tải thành tích…" />}
        {!isDataLoading && filtered.length === 0 && (
          <div className="empty-state jockey-empty-state">
            <strong>Chưa có kết quả phù hợp</strong>
            <p>Kết quả được công bố sẽ xuất hiện tại đây.</p>
          </div>
        )}
        <div className="performance-result-list">
          {filtered.map((race) => (
            <ResultCard key={race.id} race={race} onViewLeaderboard={viewLeaderboard} />
          ))}
        </div>
      </Panel>

      {leaderboardRaceId && (
        <div id="jockey-leaderboard" className="performance-leaderboard-anchor">
          <Panel
            title="Bảng xếp hạng cuộc đua"
            subtitle={selectedRace ? `${selectedRace.tournamentName ?? selectedRace.track} · ${selectedRace.name}` : "Kết quả chính thức"}
            action={
              <label className="performance-race-select">
                <span>Chọn cuộc đua</span>
                <select value={leaderboardRaceId} onChange={(event) => setSelectedRaceId(event.target.value)}>
                  {completed.map((race) => <option key={race.id} value={race.id}>{race.name}</option>)}
                </select>
              </label>
            }
          >
            <RaceLeaderboard raceId={leaderboardRaceId} highlightJockeyId={user?.id} />
          </Panel>
        </div>
      )}
    </div>
  );
}
