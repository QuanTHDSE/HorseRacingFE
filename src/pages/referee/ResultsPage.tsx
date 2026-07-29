import { useEffect, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, Spinner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RaceViolation, RefereeResultStatus, ResultRankingInput } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";
import RefereeRaceSelector from "./RefereeRaceSelector";

interface Entry {
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  ownerName?: string;
  /** Not shown in the UI — only seeds the initial finishing order the referee reorders. */
  laneNumber: number;
  finishTime?: number | "";
}

const RESULT_VOIDING_PENALTIES = ["result_void", "time_ban", "permanent_ban"];

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsPage() {
  const {
    appState,
    handleGetRefereeChecks,
    handleGetRaceResult,
    handleGetRaceViolations,
    handleSubmitRaceResult,
    handleConfirmRaceResult,
  } = useApp();

  const races = appState.refereeRaces;
  // Result entry needs the race to be ongoing/completed
  const eligible = races.filter((r) => r.liveStatus === "Live" || r.liveStatus === "Completed");

  const [raceId, setRaceId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [violations, setViolations] = useState<RaceViolation[]>([]);
  const [status, setStatus] = useState<RefereeResultStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const error = ""; const setError = fb.error;
  const msg = ""; const setMsg = fb.success;
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const race = races.find((r) => r.id === raceId) ?? null;
  const published = !!status?.publishedAt;
  const confirmed = !!status?.confirmedAt;
  const locked = published || confirmed; // can't edit once confirmed/published
  const resultVoidedCount = violations.filter((v) => v.penaltyApplied && RESULT_VOIDING_PENALTIES.includes(v.penaltyApplied)).length;

  useEffect(() => {
    if (!raceId) { setEntries([]); setStatus(null); return; }
    let alive = true;
    setLoading(true);
    setError(""); setMsg("");
    Promise.all([handleGetRefereeChecks(raceId), handleGetRaceResult(raceId), handleGetRaceViolations(raceId)])
      .then(([checks, st, raceViolations]) => {
        if (!alive) return;
        setStatus(st);
        setViolations(raceViolations);

        const disqualifiedHorseIds = new Set(
          raceViolations
            .filter((v) => v.horseId && v.penaltyApplied && RESULT_VOIDING_PENALTIES.includes(v.penaltyApplied))
            .map((v) => v.horseId as string),
        );

        const rows = checks
          .slice()
          .sort((a, b) => a.laneNumber - b.laneNumber)
          .filter((c) => !disqualifiedHorseIds.has(c.horseId))
          .map((c) => ({
            horseId: c.horseId,
            horseName: c.horseName,
            jockeyId: c.jockeyId,
            jockeyName: c.jockeyName,
            ownerId: c.ownerId,
            ownerName: c.ownerName,
            laneNumber: c.laneNumber,
          }));

        if (st?.rankings?.length) {
          const byHorseId = new Map(rows.map((row) => [row.horseId, row]));
          const orderedRows = st.rankings
            .slice()
            .sort((a, b) => a.rank - b.rank)
            .map((ranking) => {
              const row = byHorseId.get(ranking.horseId);
              if (!row) return null;
              byHorseId.delete(ranking.horseId);
              return {
                ...row,
                finishTime: ranking.finishTime ?? "",
              };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null);
          setEntries([...orderedRows, ...byHorseId.values()]);
        } else {
          setEntries(rows);
        }
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [raceId, handleGetRefereeChecks, handleGetRaceResult, handleGetRaceViolations]);

  function move(idx: number, dir: -1 | 1) {
    setEntries((prev) => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
    setMsg("");
  }

  async function submit() {
    if (!entries.length) return;
    setSubmitting(true); setError(""); setMsg("");
    try {
      const rankings: ResultRankingInput[] = entries.map((e, i) => ({
        rank: i + 1,
        horseId: e.horseId,
        jockeyId: e.jockeyId,
        ownerId: e.ownerId,
      }));
      await handleSubmitRaceResult(raceId, rankings);
      const st = await handleGetRaceResult(raceId);
      setStatus(st);
      setMsg("Đã lưu kết quả. Khi cuộc đua kết thúc, bấm Xác nhận để gửi admin công bố.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lưu kết quả thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm() {
    setConfirming(true); setError(""); setMsg("");
    try {
      await handleConfirmRaceResult(raceId);
      const st = await handleGetRaceResult(raceId);
      setStatus(st);
      setMsg("Đã xác nhận kết quả. Chờ admin công bố.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xác nhận thất bại");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel
        title="Xếp hạng & xác nhận kết quả"
        subtitle="Chọn giải đấu và cuộc đua, rà thứ tự về đích rồi gửi kết quả cho admin"
      >
        <RefereeRaceSelector
          races={eligible}
          value={raceId}
          onChange={setRaceId}
          emptyMessage="Không có cuộc đua đang/đã diễn ra để nhập kết quả."
        />
      </Panel>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      {raceId && (
        <>
          <div className="metric-grid four">
            <MetricCard label="Trạng thái đua" value={race ? viRaceStatus(race.liveStatus) : "—"} note="Trạng thái cuộc đua" loading={loading} />
            <MetricCard label="Thí sinh xếp hạng" value={String(entries.length)} note="Không tính ngựa bị hủy kết quả" tone="neutral" loading={loading} />
            <MetricCard
              label="Kết quả"
              value={published ? "Đã công bố" : confirmed ? "Đã xác nhận" : status?.rankingsCount ? "Bản nháp" : "Chưa nhập"}
              note={`${status?.rankingsCount ?? 0} thứ hạng`}
              tone={published ? "success" : confirmed ? "accent" : "warning"}
              loading={loading}
            />
            <MetricCard label="Biên bản ảnh hưởng" value={String(resultVoidedCount)} note={`${violations.length} biên bản đã ghi`} tone={resultVoidedCount ? "warning" : "neutral"} loading={loading} />
          </div>

          <Panel
            title="Thứ tự về đích"
            subtitle={locked ? "Kết quả đã được khóa và chỉ còn ở chế độ xem" : "Đưa ngựa lên hoặc xuống để sắp đúng thứ tự về đích"}
          >
            {loading ? (
              <LoadingState label="Đang tải thứ hạng…" />
            ) : entries.length === 0 ? (
              <div className="referee-empty-state">
                <span>BXH</span>
                <strong>Chưa có thí sinh để xếp hạng</strong>
                <p>Hãy chọn cuộc đua đã bắt đầu hoặc đã hoàn tất và có danh sách ngựa tham gia.</p>
              </div>
            ) : (
              <div className="referee-result-list">
                {entries.map((e, i) => (
                  <article className={`referee-result-card ${i === 0 ? "is-winner" : ""}`} key={e.horseId}>
                    <div className="referee-result-rank">
                      <span>{i === 0 ? "Dẫn đầu" : "Thứ hạng"}</span>
                      <strong>#{i + 1}</strong>
                      <Badge tone={i === 0 ? "success" : i <= 2 ? "accent" : "neutral"}>
                        Hạng {i + 1}
                      </Badge>
                    </div>
                    <div className="referee-result-participant">
                      <strong>{e.horseName}</strong>
                      <p>Nài ngựa: {e.jockeyName}</p>
                      <small>Chủ ngựa: {e.ownerName ?? "—"}</small>
                    </div>
                    <div className="referee-result-time">
                      <span>Thời gian về đích</span>
                      <strong>{typeof e.finishTime === "number" ? `${e.finishTime.toFixed(3)} giây` : "Chưa ghi nhận"}</strong>
                    </div>
                    <div className="referee-result-order-actions" aria-label={`Điều chỉnh thứ hạng của ${e.horseName}`}>
                      <button
                        type="button"
                        className="table-button"
                        aria-label={`Đưa ${e.horseName} lên một hạng`}
                        disabled={locked || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        ↑ <span>Lên</span>
                      </button>
                      <button
                        type="button"
                        className="table-button"
                        aria-label={`Đưa ${e.horseName} xuống một hạng`}
                        disabled={locked || i === entries.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓ <span>Xuống</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {resultVoidedCount > 0 && (
              <div className="referee-inline-alert is-warning">
                <strong>{resultVoidedCount} thí sinh đã bị loại khỏi bảng xếp hạng</strong>
                <span> do biên bản có hình thức hủy kết quả. Thứ tự còn lại đã được hệ thống cập nhật.</span>
              </div>
            )}

            {!locked && entries.length > 0 && (
              <div className="referee-result-savebar">
                <div>
                  <strong>{status?.rankingsCount ? "Bản nháp đã có thay đổi?" : "Thứ tự đã chính xác?"}</strong>
                  <p>Lưu bản nháp trước khi chuyển sang bước xác nhận cuối cùng.</p>
                </div>
                <button type="button" className="primary-button" disabled={submitting} onClick={submit}>
                  {submitting ? <><Spinner size="sm" onPrimary /> Đang lưu…</> : status?.rankingsCount ? "Cập nhật bản nháp" : "Lưu kết quả nháp"}
                </button>
              </div>
            )}
          </Panel>

          {!published && (
            <Panel title="Xác nhận và bàn giao kết quả" subtitle="Đây là bước cuối cùng của trọng tài trước khi admin công bố">
              {confirmed ? (
                <div className="referee-confirm-state is-complete">
                  <span>✓</span>
                  <div>
                    <strong>Đã xác nhận kết quả</strong>
                    <p>Xác nhận lúc {fmtDate(status?.confirmedAt)}. Kết quả đang chờ admin công bố và không thể chỉnh sửa.</p>
                  </div>
                </div>
              ) : (
                <div className="referee-confirm-state">
                  <span>4</span>
                  <div>
                    <strong>Kiểm tra lần cuối trước khi khóa</strong>
                    <p>Cuộc đua phải đã kết thúc và bản nháp phải có đầy đủ thứ hạng. Sau khi xác nhận, bạn không thể sắp xếp lại.</p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={confirming || race?.liveStatus !== "Completed" || !status?.rankingsCount}
                    onClick={confirm}
                  >
                    {confirming ? <><Spinner size="sm" onPrimary /> Đang xác nhận…</> : "Xác nhận kết quả"}
                  </button>
                </div>
              )}
            </Panel>
          )}

          {published && (
            <div className="referee-confirm-state is-complete">
              <span>✓</span>
              <div>
                <strong>Kết quả đã được công bố</strong>
                <p>Admin đã hoàn tất công bố. Bảng xếp hạng hiện chỉ dùng để đối chiếu.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
