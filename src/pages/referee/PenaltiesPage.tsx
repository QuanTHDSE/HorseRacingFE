import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import type { RaceSimTimeline, RaceViolation, RefereeParticipantCheck, RefereeResultStatus, ViolationRule } from "../../types";

const DQ_PENALTIES = ["disqualify", "disqualification"];

// Nhãn + tông màu cho từng hình thức xử phạt của BE.
const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  demote: "Tụt hạng",
  disqualify: "Tước quyền",
  disqualification: "Tước quyền",
  time_ban: "Cấm thi đấu",
  permanent_ban: "Cấm vĩnh viễn",
  restart: "Chạy lại",
};
function penaltyLabel(p?: string | null): string {
  return p ? PENALTY_LABEL[p] ?? p : "—";
}
function penaltyTone(p?: string | null): "danger" | "warning" | "info" {
  if (!p) return "info";
  if (DQ_PENALTIES.includes(p) || p === "time_ban" || p === "permanent_ban") return "danger";
  if (p === "demote") return "warning";
  return "info";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function participantLabel(p: RefereeParticipantCheck): string {
  const cloth = p.clothNumber ? `áo #${p.clothNumber}` : "áo —";
  const owner = p.ownerName ? ` · owner ${p.ownerName}` : "";
  return `${p.horseName} · ${p.jockeyName}${owner} · lane ${p.laneNumber} · ${cloth}`;
}

export default function PenaltiesPage() {
  const {
    appState,
    handleGetRefereeChecks,
    handleStartRefereeRace,
    handleSimulateRefereeDraft,
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
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [simTimeline, setSimTimeline] = useState<RaceSimTimeline | null>(null);

  // Form lập biên bản
  const [cTarget, setCTarget] = useState<"horse" | "jockey">("jockey");
  const [cHorseId, setCHorseId] = useState(""); // participant chọn theo horseId (khóa của hàng)
  const [cRuleId, setCRuleId] = useState("");
  const [cAffectedHorseId, setCAffectedHorseId] = useState(""); // chỉ dùng cho luật tụt hạng (demote)
  const [cNotes, setCNotes] = useState("");

  const isUpcoming = race?.liveStatus === "Upcoming";
  const isReady = race?.liveStatus === "Ready";
  const isLive = race?.liveStatus === "Live";
  const hasDraft = !!result && !result.confirmedAt;
  // Lập biên bản được khi đang điều hành (ready/live) hoặc còn kết quả nháp chưa xác nhận.
  const canPenalize = isReady || isLive || hasDraft;

  // Chỉ hiện luật áp dụng cho đúng đối tượng đang chọn (hoặc luật dùng chung).
  const visibleRules = rules.filter((r) => r.appliesTo === cTarget || r.appliesTo === "both");
  const selectedRule = rules.find((r) => r.id === cRuleId) ?? null;
  const isDemote = selectedRule?.penaltyApplied === "demote";
  const isDQ = DQ_PENALTIES.includes(selectedRule?.penaltyApplied ?? "");

  function participantOf(horseId: string) {
    return checks.find((c) => c.horseId === horseId) ?? null;
  }
  const violatingParticipant = participantOf(cHorseId);
  const affectedParticipant = participantOf(cAffectedHorseId);

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
      setSimTimeline(timeline); // mở màn xem đua trực tiếp
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chạy đua thất bại");
    } finally { setBusy(false); }
  }

  async function onPlayerClose() {
    setSimTimeline(null);
    // Xem xong → chốt cuộc đua sang 'completed' (kết quả tạm thời hiển thị).
    try { await handleFinishRefereeRace(raceId); } catch { /* bỏ qua nếu đã hoàn tất */ }
    await reload(raceId);
    setMsg("Đã chốt kết quả tạm thời (cuộc đua hoàn tất). Lập biên bản nếu cần, rồi sang trang Results để xác nhận.");
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
    if (isDemote && !cAffectedHorseId) { setError("Luật tụt hạng cần chọn ngựa bị ảnh hưởng."); return; }
    setBusy(true); setError(""); setMsg("");
    try {
      await handlePenalize(raceId, {
        ruleId: cRuleId,
        target: cTarget,
        horseId: p.horseId,
        jockeyId: p.jockeyId,
        affectedHorseId: isDemote ? cAffectedHorseId : undefined,
        notes: cNotes.trim() || undefined,
      });
      setMsg(cTarget === "horse"
        ? `Đã lập biên bản cho ngựa ${p.horseName} (${penaltyLabel(selectedRule?.penaltyApplied)}) — chủ ngựa sẽ nhận thông báo.`
        : `Đã lập biên bản cho nài ${p.jockeyName} (${penaltyLabel(selectedRule?.penaltyApplied)}) — nài ngựa sẽ nhận thông báo.`);
      setCRuleId(""); setCAffectedHorseId(""); setCNotes("");
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
      {simTimeline && <RaceLivePlayer timeline={simTimeline} onClose={onPlayerClose} />}
      <Panel title="Xử phạt trọng tài" subtitle="Lập biên bản vi phạm cho ngựa hoặc nài ngựa, áp dụng án phạt theo luật và hoàn tác khi kết quả chưa khóa">
        <label className="field" style={{ maxWidth: "440px" }}>
          <span>Cuộc đua</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            <option value="">— Chọn cuộc đua —</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · vòng {r.round} ({r.liveStatus})</option>
            ))}
          </select>
        </label>
      </Panel>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      {raceId && (
        <>
          <div className="metric-grid three">
            <MetricCard label="Trạng thái đua" value={race?.liveStatus ?? "—"} note="Race status"
              tone={isLive || isReady ? "success" : isUpcoming ? "accent" : "neutral"} />
            <MetricCard label="Số biên bản" value={String(violations.length)} note="Vi phạm đã ghi"
              tone={violations.length > 0 ? "warning" : "neutral"} />
            <MetricCard label="Kết quả nháp" value={hasDraft ? "Có" : result?.confirmedAt ? "Đã xác nhận" : "Chưa có"}
              note={`${result?.rankingsCount ?? 0} thứ hạng`} tone={hasDraft ? "accent" : "neutral"} />
          </div>

          {/* Lifecycle controls */}
          <Panel title="Điều hành cuộc đua" subtitle="Bước 1: Bắt đầu điều hành (Ready) → Bước 2: Chạy đua (Live) → Xem xong: chốt kết quả (Completed) → lập biên bản → Results xác nhận">
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {isUpcoming && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy || (race?.participantCount ?? 0) < 2}
                  onClick={startOfficiating}
                >
                  ▶ Bắt đầu điều hành
                </button>
              )}
              {isUpcoming && (race?.participantCount ?? 0) < 2 && (
                <span style={{ color: "var(--c-muted)", fontSize: "0.85rem", alignSelf: "center" }}>
                  Cần ít nhất 2 ngựa trong đường đua (hiện {race?.participantCount ?? 0}). Admin cần thêm participant trước.
                </span>
              )}
              {isReady && (
                <button type="button" className="primary-button" disabled={busy} onClick={runRace}>
                  ▶ Chạy đua &amp; xem trực tiếp
                </button>
              )}
              {isLive && (
                <button type="button" className="primary-button" disabled={busy} onClick={finishRun}>
                  ■ Kết thúc &amp; chốt kết quả tạm thời
                </button>
              )}
              {!isUpcoming && !isReady && !isLive && !hasDraft && (
                <span style={{ color: "var(--c-muted)", fontSize: "0.85rem" }}>
                  Cuộc đua không ở giai đoạn xử phạt trực tiếp.
                </span>
              )}
            </div>
          </Panel>

          {/* Conduct penalty */}
          <Panel
            title="Lập biên bản vi phạm"
            subtitle={canPenalize ? "Áp dụng cảnh cáo / tụt hạng / tước quyền / cấm thi đấu theo luật — người bị phạt sẽ nhận thông báo" : "Cần bắt đầu điều hành (hoặc còn kết quả nháp chưa xác nhận) mới lập được biên bản"}
          >
            {!canPenalize ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>
                Chưa vào giai đoạn xử phạt. Hãy <strong>Bắt đầu điều hành</strong> rồi <strong>Chạy đua &amp; xem trực tiếp</strong> để có bảng xếp hạng nháp.
              </p>
            ) : loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : (
              <div className="form-grid-2">
                <label className="field">
                  <span>Đối tượng bị lập biên bản <span className="required">*</span></span>
                  <select
                    value={cTarget}
                    onChange={(e) => { setCTarget(e.target.value as "horse" | "jockey"); setCRuleId(""); setCAffectedHorseId(""); }}
                    disabled={busy}
                  >
                    <option value="jockey">🏇 Nài ngựa</option>
                    <option value="horse">🐎 Ngựa</option>
                  </select>
                </label>
                <label className="field">
                  <span>{cTarget === "horse" ? "Ngựa vi phạm" : "Nài ngựa vi phạm"} <span className="required">*</span></span>
                  <select value={cHorseId} onChange={(e) => { setCHorseId(e.target.value); setCAffectedHorseId(""); }} disabled={busy}>
                    <option value="">— Chọn —</option>
                    {checks.map((c) => (
                      <option key={c.horseId} value={c.horseId}>{participantLabel(c)}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Luật vi phạm <span className="required">*</span></span>
                  <select value={cRuleId} onChange={(e) => { setCRuleId(e.target.value); setCAffectedHorseId(""); }} disabled={busy}>
                    <option value="">— Chọn luật —</option>
                    {visibleRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.code} · {r.name} ({penaltyLabel(r.penaltyApplied)})</option>
                    ))}
                  </select>
                </label>
                {isDemote && (
                  <label className="field">
                    <span>Ngựa bị ảnh hưởng <span className="required">*</span></span>
                    <select value={cAffectedHorseId} onChange={(e) => setCAffectedHorseId(e.target.value)} disabled={busy}>
                      <option value="">— Chọn ngựa bị chèn ép / làm chậm —</option>
                      {checks.filter((c) => c.horseId !== cHorseId).map((c) => (
                        <option key={c.horseId} value={c.horseId}>{participantLabel(c)}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  <span>Ghi chú</span>
                  <input value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Diễn giải tình huống…" disabled={busy} />
                </label>
              </div>
            )}
            {isDQ && (
              <p style={{ color: "var(--c-danger)", fontSize: "0.8rem", marginTop: "8px" }}>
                ⚠️ Luật này sẽ <strong>tước quyền</strong> — ngựa bị loại khỏi bảng xếp hạng (có thể kèm cấm thi đấu tuỳ luật).
              </p>
            )}
            {isDemote && (
              <p style={{ color: "var(--c-accent, #b58900)", fontSize: "0.8rem", marginTop: "8px" }}>
                ↓ <strong>Tụt hạng</strong>:{" "}
                {violatingParticipant && affectedParticipant
                  ? `${violatingParticipant.horseName} sẽ bị xếp ngay sau ${affectedParticipant.horseName} trong kết quả nháp.`
                  : "chọn ngựa vi phạm và ngựa bị ảnh hưởng — ngựa vi phạm sẽ bị xếp ngay sau ngựa bị ảnh hưởng."}
              </p>
            )}
            <div className="form-actions" style={{ marginTop: "12px" }}>
              <button type="button" className="primary-button" disabled={!canPenalize || busy} onClick={applyConduct}>
                {busy ? "Đang xử lý…" : "Áp dụng án phạt"}
              </button>
            </div>
          </Panel>

          {/* Violations list */}
          <Panel title="Biên bản đã lập" subtitle={`${violations.length} vi phạm`}>
            <DataTable
              columns={[
                { key: "recordedAt", label: "Lúc", render: (r) => fmtDate(r.recordedAt) },
                {
                  key: "horseName", label: "Đối tượng",
                  render: (r) => (
                    <span>
                      {r.target === "jockey" ? (r.jockeyName ?? "—") : (r.horseName ?? "—")}
                      <Badge tone={r.target === "jockey" ? "info" : "accent"}>
                        {r.target === "jockey" ? "Nài" : r.target === "both" ? "Cả hai" : "Ngựa"}
                      </Badge>
                    </span>
                  ),
                },
                { key: "affectedHorseName", label: "Bị ảnh hưởng", render: (r) => r.affectedHorseName ?? "—" },
                { key: "type", label: "Lỗi" },
                {
                  key: "penaltyApplied", label: "Hình thức",
                  render: (r) => (
                    <span>
                      <Badge tone={penaltyTone(r.penaltyApplied)}>{penaltyLabel(r.penaltyApplied)}</Badge>
                      {r.bannedUntil && (
                        <span style={{ color: "var(--c-muted)", fontSize: "0.72rem", display: "block", marginTop: 2 }}>
                          cấm đến {fmtDate(r.bannedUntil)}
                        </span>
                      )}
                    </span>
                  ),
                },
                { key: "description", label: "Mô tả", render: (r) => <span style={{ fontSize: "0.8rem" }}>{r.description}</span> },
                {
                  key: "id", label: "",
                  render: (r) => (
                    <button
                      type="button"
                      className="table-button is-danger"
                      disabled={busy || !canPenalize}
                      title={!canPenalize ? "Chỉ hoàn tác khi cuộc đua đang điều hành hoặc kết quả nháp chưa xác nhận" : undefined}
                      onClick={() => revoke(r.id)}
                    >
                      Hoàn tác
                    </button>
                  ),
                },
              ]}
              rows={violations.map((v) => ({ ...v, id: v.id }))}
              empty="Chưa có biên bản vi phạm nào."
            />
          </Panel>

          <div className="form-banner" style={{ background: "var(--c-surf-low)", border: "1px solid var(--c-outline-var)", color: "var(--c-muted)", fontSize: "0.8rem" }}>
            Quy trình: <strong>Bắt đầu điều hành</strong> → <strong>Chạy đua &amp; xem trực tiếp</strong> → lập biên bản cho <strong>ngựa</strong> hoặc <strong>nài ngựa</strong> theo luật (cảnh cáo / tụt hạng / tước quyền / cấm thi đấu) — người bị phạt nhận thông báo → sang trang <strong>Results</strong> để xác nhận. Sau khi xác nhận thì không lập/hoàn tác biên bản được nữa.
          </div>
        </>
      )}
    </div>
  );
}
