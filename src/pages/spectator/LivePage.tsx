import { useEffect, useRef, useState } from "react";
import { Badge, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RaceSimTimeline, SpectatorRace } from "../../types";
import { cn } from "../../utils/cn";
import { viRaceStatus } from "../../utils/viLabels";

const REPLAY_POLL_MS = 3000;

type RaceFilter = "all" | "upcoming" | "live" | "completed";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(seconds?: number): string {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return minutes > 0
    ? `${minutes}:${remaining.toFixed(2).padStart(5, "0")}`
    : `${remaining.toFixed(2)} giây`;
}

function fmtPrize(prize: number): string {
  return prize > 0 ? `${prize.toLocaleString("vi-VN")} điểm` : "—";
}

const STATUS_TONE: Record<string, "accent" | "success" | "neutral" | "danger"> = {
  Upcoming: "accent",
  Live: "success",
  Completed: "neutral",
  Cancelled: "danger",
};

const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  demote: "Tụt hạng",
  disqualify: "Tước quyền",
  disqualification: "Tước quyền",
  restart: "Chạy lại",
  time_ban: "Cấm có thời hạn",
  permanent_ban: "Cấm vĩnh viễn",
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn("spectator-rank-badge", rank <= 3 && `is-rank-${rank}`)}>
      {rank}
    </span>
  );
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
        const response = await handleGetSpectatorRaceReplay(race.id);
        if (stoppedRef.current) return;
        if (response.available && response.timeline) {
          setTimeline(response.timeline);
          setResultPublished(response.resultPublished);
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch {
        // Replay can be unavailable briefly while the referee starts the race.
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
      <Panel
        title={race.name}
        subtitle="Theo dõi diễn biến cuộc đua"
        action={<button type="button" className="secondary-button btn-xs" onClick={onClose}>Đóng</button>}
      >
        <div className="spectator-replay-waiting" role="status">
          <span className="spectator-live-pulse" aria-hidden="true" />
          <div>
            <strong>{waitingForStart ? "Cuộc đua chưa bắt đầu" : "Đang chuẩn bị dữ liệu phát lại"}</strong>
            <p>{waitingForStart ? "Màn hình sẽ tự động cập nhật khi trọng tài bắt đầu cuộc đua." : "Vui lòng chờ trong giây lát."}</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="spectator-replay-shell">
      <div className={cn("spectator-result-state", resultPublished ? "is-official" : "is-provisional")}>
        <span className="spectator-live-pulse" aria-hidden="true" />
        <strong>{resultPublished ? "Kết quả chính thức" : "Kết quả tạm thời, đang chờ xác nhận"}</strong>
      </div>
      <RaceLivePlayer timeline={timeline} onClose={onClose} />
    </div>
  );
}

function RaceDetailPanel({ race, onClose }: { race: SpectatorRace; onClose: () => void }) {
  const [watching, setWatching] = useState(false);
  const canWatch = race.liveStatus === "Live" || race.liveStatus === "Completed";
  const rankings = race.result?.rankings.slice().sort((a, b) => a.rank - b.rank) ?? [];
  const podium = rankings.filter((ranking) => !ranking.isDisqualified && ranking.rank <= 3);
  const isOfficial = !!race.result?.publishedAt;

  if (watching) {
    return <LiveRaceWatcher race={race} onClose={() => setWatching(false)} />;
  }

  return (
    <Panel
      title={race.name}
      subtitle={`Vòng ${race.round} · ${race.tournamentName}`}
      action={
        <div className="spectator-detail-actions">
          {canWatch && (
            <button
              type="button"
              className={cn(race.liveStatus === "Live" ? "primary-button" : "secondary-button", "btn-xs")}
              onClick={() => setWatching(true)}
            >
              {race.liveStatus === "Live" ? "Xem trực tiếp" : "Xem lại cuộc đua"}
            </button>
          )}
          <button type="button" className="secondary-button btn-xs" onClick={onClose}>Đóng</button>
        </div>
      }
    >
      <div className="spectator-detail-stack">
        <section className="spectator-race-summary">
          <div className="spectator-race-summary-main">
            <Badge tone={STATUS_TONE[race.liveStatus] ?? "neutral"}>{viRaceStatus(race.liveStatus)}</Badge>
            {race.liveStatus === "Live" && <span className="spectator-live-label"><i /> Trực tiếp</span>}
            {isOfficial && <Badge tone="success">Đã công bố</Badge>}
          </div>
          <div className="spectator-race-facts">
            <div><span>Thời gian</span><strong>{fmtDate(race.scheduledAt)}</strong></div>
            <div><span>Cự ly</span><strong>{race.distance ? `${race.distance} m` : "—"}</strong></div>
            <div><span>Ngựa tham gia</span><strong>{race.participants.length}</strong></div>
            <div><span>Dự đoán</span><strong>{race.hasPrediction ? "Đã gửi" : race.canPredict ? "Đang mở" : "Đã đóng"}</strong></div>
          </div>
        </section>

        {race.participants.length > 0 && (
          <section className="spectator-section">
            <div className="spectator-section-heading">
              <div>
                <h3>Danh sách xuất phát</h3>
                <p>Sắp theo số làn</p>
              </div>
              <span>{race.participants.length} ngựa</span>
            </div>
            <div className="spectator-lane-list">
              {race.participants
                .slice()
                .sort((a, b) => a.laneNumber - b.laneNumber)
                .map((participant) => (
                  <div className="spectator-lane-item" key={participant.id}>
                    <span>Làn {participant.laneNumber}</span>
                    <strong>{participant.name}</strong>
                  </div>
                ))}
            </div>
          </section>
        )}

        {rankings.length > 0 ? (
          <section className="spectator-section spectator-results-section">
            <div className="spectator-section-heading">
              <div>
                <h3>Kết quả cuộc đua</h3>
                <p>{isOfficial ? "Bảng xếp hạng chính thức" : "Kết quả tạm thời, có thể còn thay đổi"}</p>
              </div>
              <Badge tone={isOfficial ? "success" : "warning"}>{isOfficial ? "Chính thức" : "Tạm thời"}</Badge>
            </div>

            {podium.length > 0 && (
              <div className="spectator-podium">
                {podium.map((ranking) => (
                  <article className={`spectator-podium-item is-rank-${ranking.rank}`} key={ranking.horse.id}>
                    <RankBadge rank={ranking.rank} />
                    <div>
                      <strong>{ranking.horse.name}</strong>
                      <p>{ranking.jockey.fullName}</p>
                    </div>
                    <time>{fmtTime(ranking.finishTime)}</time>
                  </article>
                ))}
              </div>
            )}

            <div className="table-shell spectator-results-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Ngựa / Nài ngựa</th>
                    <th>Thời gian</th>
                    <th>Giải thưởng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking) => (
                    <tr className={ranking.isDisqualified ? "is-disqualified" : ""} key={`${ranking.horse.id}-${ranking.rank}`}>
                      <td><RankBadge rank={ranking.rank} /></td>
                      <td>
                        <strong className="spectator-result-horse">{ranking.horse.name}</strong>
                        <span className="spectator-result-jockey">{ranking.jockey.fullName}</span>
                      </td>
                      <td className="spectator-result-number">{fmtTime(ranking.finishTime)}</td>
                      <td className="spectator-result-number">{fmtPrize(ranking.prize)}</td>
                      <td>
                        {ranking.isDisqualified
                          ? <Badge tone="danger">Tước quyền</Badge>
                          : <Badge tone="success">Hợp lệ</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="spectator-result-empty">
            <strong>{race.liveStatus === "Completed" ? "Kết quả chưa được công bố" : "Cuộc đua chưa có kết quả"}</strong>
            <p>{race.liveStatus === "Completed" ? "Kết quả sẽ xuất hiện tại đây sau khi được xác nhận." : "Bạn có thể quay lại khi cuộc đua bắt đầu."}</p>
          </section>
        )}

        {race.result?.violations && race.result.violations.length > 0 && (
          <section className="spectator-section">
            <div className="spectator-section-heading">
              <div>
                <h3>Quyết định xử phạt</h3>
                <p>Các vi phạm đã ảnh hưởng đến kết quả</p>
              </div>
              <Badge tone="danger">{race.result.violations.length} vi phạm</Badge>
            </div>
            <div className="spectator-violation-list">
              {race.result.violations.map((violation, index) => (
                <article className="spectator-violation-item" key={`${violation.horseId ?? "unknown"}-${index}`}>
                  <div>
                    <strong>{violation.horseName ?? "Chưa xác định"}</strong>
                    <p>{violation.description}</p>
                  </div>
                  {violation.penaltyApplied && (
                    <Badge tone="danger">{PENALTY_LABEL[violation.penaltyApplied] ?? violation.penaltyApplied}</Badge>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </Panel>
  );
}

export default function LivePage() {
  const { appState, handleGetSpectatorRaceById } = useApp();
  const [filter, setFilter] = useState<RaceFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SpectatorRace | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const feedback = useFeedback();
  const loadError = "";
  const setLoadError = feedback.error;

  const races = appState.spectatorRaces;
  const filtered = races.filter((race) => {
    if (filter === "upcoming") return race.liveStatus === "Upcoming";
    if (filter === "live") return race.liveStatus === "Live";
    if (filter === "completed") return race.liveStatus === "Completed";
    return true;
  });

  const liveCount = races.filter((race) => race.liveStatus === "Live").length;
  const upcomingCount = races.filter((race) => race.liveStatus === "Upcoming").length;
  const completedCount = races.filter((race) => race.liveStatus === "Completed").length;

  async function openDetail(race: SpectatorRace) {
    if (selectedId === race.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    setLoadingId(race.id);
    setLoadError("");
    try {
      const response = await handleGetSpectatorRaceById(race.id);
      setDetail(response);
      setSelectedId(race.id);
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Không tải được chi tiết cuộc đua.");
    } finally {
      setLoadingId(null);
    }
  }

  const filters: Array<{ key: RaceFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: races.length },
    { key: "live", label: "Đang diễn ra", count: liveCount },
    { key: "upcoming", label: "Sắp diễn ra", count: upcomingCount },
    { key: "completed", label: "Đã kết thúc", count: completedCount },
  ];

  return (
    <div className="page-stack">
      <div className={cn("spectator-live-layout", detail && selectedId && "has-detail")}>
        <div className="spectator-race-browser">
          <Panel
            title="Kết quả trực tiếp"
            subtitle="Theo dõi lịch đua, diễn biến và bảng xếp hạng"
            action={
              <div className="filter-tabs spectator-filter-tabs" aria-label="Lọc cuộc đua">
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
            <div className="spectator-race-stats" aria-label="Tổng quan cuộc đua">
              <div><strong>{liveCount}</strong><span>Đang diễn ra</span></div>
              <div><strong>{upcomingCount}</strong><span>Sắp diễn ra</span></div>
              <div><strong>{completedCount}</strong><span>Đã có kết quả</span></div>
            </div>

            {loadError && <div className="form-banner form-banner-error">{loadError}</div>}

            {filtered.length === 0 ? (
              <div className="spectator-result-empty">
                <strong>Chưa có cuộc đua trong mục này</strong>
                <p>Hãy chọn một trạng thái khác để xem các cuộc đua hiện có.</p>
              </div>
            ) : (
              <div className="spectator-race-list">
                {filtered.map((race) => {
                  const selected = selectedId === race.id;
                  const actionLabel = race.liveStatus === "Live"
                    ? "Theo dõi"
                    : race.liveStatus === "Completed"
                      ? "Xem kết quả"
                      : "Xem chi tiết";
                  return (
                    <article className={cn("spectator-race-item", selected && "is-selected")} key={race.id}>
                      <div className="spectator-race-item-head">
                        <div>
                          <div className="spectator-race-item-status">
                            <Badge tone={STATUS_TONE[race.liveStatus] ?? "neutral"}>{viRaceStatus(race.liveStatus)}</Badge>
                            {race.liveStatus === "Live" && <span className="spectator-live-label"><i /> Trực tiếp</span>}
                            {race.result?.publishedAt && <span className="spectator-published-label">Đã công bố</span>}
                          </div>
                          <h3>{race.name}</h3>
                          <p>{race.tournamentName} · Vòng {race.round}</p>
                        </div>
                        <button
                          type="button"
                          className={cn("secondary-button", "btn-xs", selected && "is-active")}
                          disabled={loadingId === race.id}
                          aria-pressed={selected}
                          onClick={() => openDetail(race)}
                        >
                          {loadingId === race.id ? "Đang tải…" : selected ? "Đang xem" : actionLabel}
                        </button>
                      </div>
                      <div className="spectator-race-item-meta">
                        <span>{fmtDate(race.scheduledAt)}</span>
                        <span>{race.distance ? `${race.distance} m` : "Chưa có cự ly"}</span>
                        <span>{race.participants.length} ngựa</span>
                        {race.hasPrediction && <span className="is-success">Đã dự đoán</span>}
                        {!race.hasPrediction && race.canPredict && <span className="is-accent">Đang mở dự đoán</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {detail && selectedId && (
          <div className="spectator-race-detail" ref={detailRef}>
            <RaceDetailPanel
              race={detail}
              onClose={() => { setSelectedId(null); setDetail(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
