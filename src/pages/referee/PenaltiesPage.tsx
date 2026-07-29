import { useEffect, useState } from "react";
import { Badge, LoadingState, MetricCard, Panel, Spinner } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RaceSimTimeline, RaceViolation, RefereeParticipantCheck, RefereeResultStatus, ViolationRule } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";
import { penaltyLabel, penaltyTone, isResultVoidingPenalty } from "../../utils/penaltyLabels";
import RefereeRaceSelector from "./RefereeRaceSelector";

const RESULT_VOIDING_PENALTIES = ["result_void", "time_ban", "permanent_ban"];

// Nhãn + tông màu cho từng hình thức xử phạt của BE.
const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  result_void: "Hủy kết quả",
  time_ban: "Cấm thi đấu",
  permanent_ban: "Cấm vô thời hạn",
};
function penaltyLabel(p?: string | null): string {
  return p ? PENALTY_LABEL[p] ?? p : "—";
}
function penaltyTone(p?: string | null): "danger" | "warning" | "info" {
  if (!p) return "info";
  if (RESULT_VOIDING_PENALTIES.includes(p)) return "danger";
  return "info";
}

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

function participantLabel(p: RefereeParticipantCheck): string {
  const owner = p.ownerName ? ` · chủ ngựa ${p.ownerName}` : "";
  return `${p.horseName} · ${p.jockeyName}${owner}`;
}

export default function PenaltiesPage() {
  const {
    appState,
    handleGetRefereeChecks,
    handleStartRefereeRace,
    handleSimulateRefereeDraft,
    handleGetRefereeRaceReplay,
    handleFinishRefereeRace,
    handleGetViolationRules,
    handleGetRaceViolations,
    handlePenalize,
    handleRevokePenalty,
    handleGetRaceResult,
  } = useApp();

  const races = appState.refereeRaces;
  const [raceId, setRaceId] = useState("");
  const race = races.find((r) => r.id === raceId) ?? null;

  const [checks, setChecks] = useState<RefereeParticipantCheck[]>([]);
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [violations, setViolations] = useState<RaceViolation[]>([]);
  const [result, setResult] = useState<RefereeResultStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const error = ""; const setError = fb.error;
  const msg = ""; const setMsg = fb.success;
  const [busy, setBusy] = useState(false);
  const [simTimeline, setSimTimeline] = useState<RaceSimTimeline | null>(null);
  const [playerMode, setPlayerMode] = useState<"live" | "review" | null>(null);

  // Form lập biên bản
  const [cTarget, setCTarget] = useState<"horse" | "jockey">("jockey");
  const [cHorseId, setCHorseId] = useState(""); // participant chọn theo horseId (khóa của hàng)
  const [cRuleId, setCRuleId] = useState("");
  const [cNotes, setCNotes] = useState("");

  const isUpcoming = race?.liveStatus === "Upcoming";
  const isReady = race?.liveStatus === "Ready";
  const isLive = race?.liveStatus === "Live";
  const isCompleted = race?.liveStatus === "Completed";
  const hasDraft = !!result && !result.confirmedAt;
  // Lập biên bản được khi đang điều hành (ready/live) hoặc còn kết quả nháp chưa xác nhận.
  const canPenalize = isReady || isLive || hasDraft;

  // Chỉ hiện luật áp dụng cho đúng đối tượng đang chọn (hoặc luật dùng chung).
  const visibleRules = rules.filter((r) => r.appliesTo === cTarget || r.appliesTo === "both");
  const selectedRule = rules.find((r) => r.id === cRuleId) ?? null;

  function participantOf(horseId: string) {
    return checks.find((c) => c.horseId === horseId) ?? null;
  }
  // Load violation rules once
  useEffect(() => {
    handleGetViolationRules().then(setRules).catch(() => {});
  }, [handleGetViolationRules]);

  async function reload(id: string) {
    setLoading(true);
    setError("");
    try {
      const [c, v, r] = await Promise.all([
        handleGetRefereeChecks(id),
        handleGetRaceViolations(id),
        handleGetRaceResult(id),
      ]);
      setChecks(c);
      setViolations(v);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSimTimeline(null);
    setPlayerMode(null);
    if (!raceId) { setChecks([]); setViolations([]); setResult(null); return; }
    void reload(raceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  async function startOfficiating() {
    setBusy(true); setError(""); setMsg("");
    try {
      await handleStartRefereeRace(raceId);
      setMsg("Đã bắt đầu điều hành cuộc đua (bốc thăm làn xong). Bấm Chạy đua để mô phỏng.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể bắt đầu cuộc đua");
    } finally { setBusy(false); }
  }

  async function runRace() {
    setBusy(true); setError(""); setMsg("");
    try {
      const timeline = await handleSimulateRefereeDraft(raceId);
      setPlayerMode("live");
      setSimTimeline(timeline); // mở màn xem đua trực tiếp
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chạy đua thất bại");
    } finally { setBusy(false); }
  }

  async function onPlayerClose() {
    setSimTimeline(null);
    if (playerMode === "review") {
      setPlayerMode(null);
      return;
    }
    setPlayerMode(null);
    // Xem xong → chốt cuộc đua sang 'completed' (kết quả tạm thời hiển thị).
    try { await handleFinishRefereeRace(raceId); } catch { /* bỏ qua nếu đã hoàn tất */ }
    await reload(raceId);
    setMsg("Đã chốt kết quả tạm thời (cuộc đua hoàn tất). Lập biên bản nếu cần, rồi sang trang Results để xác nhận.");
  }

  async function openRaceLog() {
    setBusy(true); setError(""); setMsg("");
    try {
      const replay = await handleGetRefereeRaceReplay(raceId);
      if (!replay.available || !replay.timeline) {
        setError("Cuộc đua này chưa có dữ liệu mô phỏng để xem lại.");
        return;
      }
      setPlayerMode("review");
      setSimTimeline(replay.timeline);
      setMsg("Đã mở toàn bộ nhật ký và kết quả mô phỏng đã lưu.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải nhật ký cuộc đua");
    } finally { setBusy(false); }
  }

  // Kết thúc khi race đang Live nhưng màn xem đã đóng (vd: sau khi refresh trang).
  async function finishRun() {
    setBusy(true); setError(""); setMsg("");
    try {
      await handleFinishRefereeRace(raceId);
      await reload(raceId);
      setMsg("Đã chốt kết quả tạm thời (cuộc đua hoàn tất).");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể kết thúc cuộc đua");
    } finally { setBusy(false); }
  }

  async function applyConduct() {
    const p = participantOf(cHorseId);
    if (!p) { setError("Chọn ngựa / nài vi phạm."); return; }
    if (!cRuleId) { setError("Chọn luật vi phạm."); return; }
    setBusy(true); setError(""); setMsg("");
    try {
      await handlePenalize(raceId, {
        ruleId: cRuleId,
        target: cTarget,
        horseId: p.horseId,
        jockeyId: p.jockeyId,
        notes: cNotes.trim() || undefined,
      });
      setMsg(cTarget === "horse"
        ? `Đã lập biên bản cho ngựa ${p.horseName} (${penaltyLabel(selectedRule?.penaltyApplied)}) — chủ ngựa sẽ nhận thông báo.`
        : `Đã lập biên bản cho nài ${p.jockeyName} (${penaltyLabel(selectedRule?.penaltyApplied)}) — nài ngựa sẽ nhận thông báo.`);
      setCRuleId(""); setCNotes("");
      await reload(raceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lập biên bản thất bại");
    } finally { setBusy(false); }
  }

  async function revoke(violationId: string) {
    setBusy(true); setError(""); setMsg("");
    try {
      await handleRevokePenalty(raceId, violationId);
      setMsg("Đã hoàn tác án phạt và khôi phục trạng thái.");
      await reload(raceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hoàn tác thất bại");
    } finally { setBusy(false); }
  }

  return (
    <div className="page-stack">
      {simTimeline && (
        <RaceLivePlayer
          timeline={simTimeline}
          onClose={onPlayerClose}
          showRaceNotes
          reviewMode={playerMode === "review"}
        />
      )}
      <Panel
        title="Điều hành & xử phạt cuộc đua"
        subtitle="Chọn giải đấu, chọn cuộc đua rồi thực hiện lần lượt các bước bên dưới"
      >
        <RefereeRaceSelector races={races} value={raceId} onChange={setRaceId} />
      </Panel>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      {raceId && (
        <>
          <div className="metric-grid four">
            <MetricCard label="Trạng thái đua" value={race ? viRaceStatus(race.liveStatus) : "—"} note="Cập nhật theo phiên điều hành"
              tone={isLive || isReady ? "success" : isUpcoming ? "accent" : "neutral"} loading={loading} />
            <MetricCard label="Thí sinh" value={String(checks.length)} note="Ngựa và nài trong cuộc đua"
              tone="neutral" loading={loading} />
            <MetricCard label="Số biên bản" value={String(violations.length)} note="Vi phạm đã ghi"
              tone={violations.length > 0 ? "warning" : "neutral"} loading={loading} />
            <MetricCard label="Kết quả nháp" value={hasDraft ? "Có" : result?.confirmedAt ? "Đã xác nhận" : "Chưa có"}
              note={`${result?.rankingsCount ?? 0} thứ hạng`} tone={hasDraft ? "accent" : "neutral"} loading={loading} />
          </div>

          {/* Lifecycle controls */}
          <Panel title="Thao tác điều hành" subtitle="Hệ thống chỉ hiển thị hành động phù hợp với trạng thái hiện tại">
            <div className="referee-primary-action">
              <div>
                <Badge tone={isLive || isReady ? "success" : isUpcoming ? "accent" : "neutral"}>
                  {race ? viRaceStatus(race.liveStatus) : "—"}
                </Badge>
                <strong>
                  {isUpcoming && "Cuộc đua đang chờ bắt đầu"}
                  {isReady && "Đã sẵn sàng — có thể chạy mô phỏng"}
                  {isLive && "Cuộc đua đang diễn ra"}
                  {isCompleted && "Cuộc đua đã hoàn tất"}
                </strong>
                <p>
                  {isUpcoming && "Kiểm tra đủ thí sinh và checklist trước khi mở phiên điều hành."}
                  {isReady && "Bắt đầu chạy để theo dõi diễn biến trực tiếp và nhận thứ hạng tạm thời."}
                  {isLive && "Kết thúc phiên để chốt thứ hạng nháp và lập biên bản nếu cần."}
                  {isCompleted && "Rà soát biên bản trước khi chuyển sang trang Kết quả để xác nhận."}
                </p>
              </div>
              <div className="referee-primary-action-buttons">
              {isUpcoming && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy || (race?.participantCount ?? 0) < 2}
                  onClick={startOfficiating}
                >
                  Bắt đầu điều hành
                </button>
              )}
              {isReady && (
                <button type="button" className="primary-button" disabled={busy} onClick={runRace}>
                  Chạy đua &amp; xem trực tiếp
                </button>
              )}
              {isLive && (
                <button type="button" className="primary-button" disabled={busy} onClick={finishRun}>
                  Kết thúc &amp; chốt kết quả tạm thời
                </button>
              )}
              {isCompleted && (
                <button type="button" className="primary-button" disabled={busy} onClick={openRaceLog}>
                  {busy ? <><Spinner size="sm" onPrimary /> Đang tải nhật ký…</> : "Xem lại nhật ký cuộc đua"}
                </button>
              )}
              </div>
            </div>
            {isUpcoming && (race?.participantCount ?? 0) < 2 && (
              <div className="referee-inline-alert is-warning">
                Cần ít nhất 2 ngựa trong đường đua; hiện có {race?.participantCount ?? 0}. Admin cần bổ sung thí sinh trước.
              </div>
            )}
          </Panel>

          {/* Conduct penalty */}
          <Panel
            title="Lập biên bản vi phạm"
            subtitle={canPenalize ? "Áp dụng cảnh cáo / hủy kết quả / cấm thi đấu theo luật — người bị phạt sẽ nhận thông báo" : "Cần bắt đầu điều hành (hoặc còn kết quả nháp chưa xác nhận) mới lập được biên bản"}
          >
            {!canPenalize ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>
                Chưa vào giai đoạn xử phạt. Hãy <strong>Bắt đầu điều hành</strong> rồi <strong>Chạy đua &amp; xem trực tiếp</strong> để có bảng xếp hạng nháp.
              </p>
            ) : loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : (
              <div className="form-grid-2 referee-penalty-form">
                <label className="field">
                  <span>Đối tượng bị lập biên bản <span className="required">*</span></span>
                  <select
                    value={cTarget}
                    onChange={(e) => { setCTarget(e.target.value as "horse" | "jockey"); setCRuleId(""); }}
                    disabled={busy}
                  >
                    <option value="jockey">🏇 Nài ngựa</option>
                    <option value="horse">🐎 Ngựa</option>
                  </select>
                </label>
                <label className="field">
                  <span>{cTarget === "horse" ? "Ngựa vi phạm" : "Nài ngựa vi phạm"} <span className="required">*</span></span>
                  <select value={cHorseId} onChange={(e) => setCHorseId(e.target.value)} disabled={busy}>
                    <option value="">— Chọn —</option>
                    {checks.map((c) => (
                      <option key={c.horseId} value={c.horseId}>{participantLabel(c)}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Luật vi phạm <span className="required">*</span></span>
                  <select value={cRuleId} onChange={(e) => setCRuleId(e.target.value)} disabled={busy}>
                    <option value="">— Chọn luật —</option>
                    {visibleRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.code} · {r.name} ({penaltyLabel(r.penaltyApplied)})</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Ghi chú</span>
                  <input value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Diễn giải tình huống…" disabled={busy} />
                </label>
              </div>
            )}
            {selectedRule && isResultVoidingPenalty(selectedRule.penaltyApplied) && (
              <p className="referee-inline-alert is-danger">
                Luật này sẽ <strong>hủy kết quả của cuộc đua hiện tại</strong>; nếu là cấm có thời hạn hoặc cấm vô thời hạn thì hệ thống mới chặn thi đấu ở các trận sau.
              </p>
            )}
            <div className="form-actions" style={{ marginTop: "12px" }}>
              <button type="button" className="primary-button" disabled={!canPenalize || busy} onClick={applyConduct}>
                {busy ? <><Spinner size="sm" onPrimary /> Đang xử lý…</> : "Áp dụng án phạt"}
              </button>
            </div>
          </Panel>

          {/* Violations list */}
          <Panel title="Biên bản đã lập" subtitle={`${violations.length} vi phạm trong cuộc đua này`}>
            {loading ? (
              <LoadingState label="Đang tải biên bản…" />
            ) : violations.length === 0 ? (
              <div className="referee-empty-state">
                <span>✓</span>
                <strong>Chưa ghi nhận vi phạm</strong>
                <p>Các biên bản mới sẽ xuất hiện tại đây để trọng tài rà soát trước khi xác nhận kết quả.</p>
              </div>
            ) : (
              <div className="referee-violation-list">
                {violations.map((violation) => (
                  <article className="referee-violation-card" key={violation.id}>
                    <div className="referee-violation-main">
                      <div className="referee-violation-heading">
                        <div>
                          <span className="referee-eyebrow">{fmtDate(violation.recordedAt)}</span>
                          <strong>{violation.type}</strong>
                        </div>
                        <Badge tone={penaltyTone(violation.penaltyApplied)}>{penaltyLabel(violation.penaltyApplied)}</Badge>
                      </div>
                      <p>{violation.description}</p>
                      <div className="referee-violation-meta">
                        <span>
                          <small>Đối tượng</small>
                          <b>{violation.target === "jockey" ? (violation.jockeyName ?? "—") : (violation.horseName ?? "—")}</b>
                        </span>
                        <span>
                          <small>Phạm vi</small>
                          <b>{violation.target === "jockey" ? "Nài ngựa" : violation.target === "both" ? "Cả ngựa và nài" : "Ngựa"}</b>
                        </span>
                        <span>
                          <small>Ngựa liên quan</small>
                          <b>{violation.affectedHorseName ?? violation.horseName ?? "—"}</b>
                        </span>
                        {violation.bannedUntil && (
                          <span>
                            <small>Thời hạn cấm</small>
                            <b>Đến {fmtDate(violation.bannedUntil)}</b>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="table-button is-danger"
                      disabled={busy || !canPenalize}
                      title={!canPenalize ? "Chỉ hoàn tác khi cuộc đua đang điều hành hoặc kết quả nháp chưa xác nhận" : undefined}
                      onClick={() => revoke(violation.id)}
                    >
                      Hoàn tác án phạt
                    </button>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <div className="referee-process-note">
            <strong>Lưu ý trước khi xác nhận kết quả</strong>
            <p>Hãy hoàn tất mọi biên bản và kiểm tra lại án phạt. Sau khi kết quả được xác nhận, trọng tài không thể lập mới hoặc hoàn tác biên bản.</p>
          </div>
        </>
      )}
    </div>
  );
}
