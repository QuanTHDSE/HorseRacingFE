import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import type { RaceSimTimeline, RaceViolation, RefereeParticipantCheck, RefereeResultStatus, ViolationRule } from "../../types";

// Mức độ vi phạm → số bậc bị tụt (khớp với backend).
const SEVERITY_DEMOTE_RANKS: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 5 };
const SEVERITY_LABEL: Record<string, string> = { low: "nhẹ", medium: "trung bình", high: "nặng", critical: "rất nặng" };
function ranksForSeverity(severity: string): number {
  return SEVERITY_DEMOTE_RANKS[severity] ?? 2;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PenaltiesPage() {
  const {
    appState,
    handleGetRefereeChecks,
    handleStartRefereeRace,
    handleSimulateRefereeDraft,
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

  // Form lập biên bản — tách 2 đối tượng: ngựa hoặc nài ngựa
  const [cTarget, setCTarget] = useState<"horse" | "jockey">("jockey");
  const [cHorseId, setCHorseId] = useState(""); // participant chọn theo horseId (khóa của hàng)
  const [cRuleId, setCRuleId] = useState("");
  const [cNotes, setCNotes] = useState("");

  const isLive = race?.liveStatus === "Live";
  const isUpcoming = race?.liveStatus === "Upcoming";
  const hasDraft = !!result && !result.confirmedAt;
  // Hình phạt = tụt bậc trên bảng xếp hạng, nên phải có kết quả nháp (đã chạy đua)
  // và chưa được xác nhận.
  const canPenalize = hasDraft;

  // Chỉ hiện luật áp dụng cho đúng đối tượng đang chọn (hoặc luật dùng chung).
  const visibleRules = rules.filter((r) => r.appliesTo === cTarget || r.appliesTo === "both");
  const selectedRule = rules.find((r) => r.id === cRuleId) ?? null;
  const selectedDrop = selectedRule ? ranksForSeverity(selectedRule.severity) : 0;

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

  function participantOf(horseId: string) {
    return checks.find((c) => c.horseId === horseId) ?? null;
  }

  async function startOfficiating() {
    setBusy(true); setError(""); setMsg("");
    try {
      await handleStartRefereeRace(raceId);
      setMsg("Đã bắt đầu điều hành cuộc đua.");
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
    await reload(raceId);
    setMsg("Đã chạy đua & tạo kết quả nháp. Có thể lập biên bản, rồi sang trang Results để xác nhận.");
  }

  async function applyConduct() {
    const p = participantOf(cHorseId);
    if (!p) { setError(cTarget === "horse" ? "Chọn ngựa cần xử phạt." : "Chọn nài ngựa cần xử phạt."); return; }
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
        ? `Đã phạt ngựa ${p.horseName} tụt ${selectedDrop} bậc — chủ ngựa sẽ nhận được thông báo.`
        : `Đã phạt nài ${p.jockeyName} tụt ${selectedDrop} bậc — nài ngựa sẽ nhận được thông báo.`);
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
      setMsg("Đã hoàn tác án phạt.");
      await reload(raceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hoàn tác thất bại");
    } finally { setBusy(false); }
  }

  return (
    <div className="page-stack">
      {simTimeline && <RaceLivePlayer timeline={simTimeline} onClose={onPlayerClose} />}
      <Panel title="Xử phạt trọng tài" subtitle="Lập biên bản vi phạm cho ngựa hoặc nài ngựa và hoàn tác án phạt">
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
              tone={isLive ? "success" : isUpcoming ? "accent" : "neutral"} />
            <MetricCard label="Số biên bản" value={String(violations.length)} note="Vi phạm đã ghi"
              tone={violations.length > 0 ? "warning" : "neutral"} />
            <MetricCard label="Kết quả nháp" value={hasDraft ? "Có" : result?.confirmedAt ? "Đã xác nhận" : "Chưa có"}
              note={`${result?.rankingsCount ?? 0} thứ hạng`} tone={hasDraft ? "accent" : "neutral"} />
          </div>

          {/* Lifecycle controls */}
          <Panel title="Điều hành cuộc đua" subtitle="Trọng tài: bắt đầu đua → chạy đua & xem trực tiếp → lập biên bản → (sang trang Results để xác nhận)">
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
              {isLive && (
                <button type="button" className="primary-button" disabled={busy} onClick={runRace}>
                  ▶ Chạy đua &amp; xem trực tiếp
                </button>
              )}
              {!isUpcoming && !isLive && !hasDraft && (
                <span style={{ color: "var(--c-muted)", fontSize: "0.85rem" }}>
                  Cuộc đua không ở giai đoạn xử phạt trực tiếp.
                </span>
              )}
            </div>
          </Panel>

          {/* Conduct penalty — tách 2 đối tượng: ngựa / nài ngựa */}
          <Panel
            title="Lập biên bản vi phạm"
            subtitle={canPenalize ? "Vi phạm càng nặng thì ngựa tụt càng nhiều bậc (nhẹ 1 · trung bình 2 · nặng 3 · rất nặng 5)" : "Cần chạy đua tạo bảng xếp hạng (kết quả nháp) trước khi lập biên bản"}
          >
            {!canPenalize ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>
                Chưa có kết quả nháp. Hãy <strong>Bắt đầu điều hành</strong> rồi <strong>Chạy đua &amp; xem trực tiếp</strong> để có bảng xếp hạng, sau đó mới lập biên bản.
              </p>
            ) : loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : (
              <div className="form-grid-2">
                <label className="field">
                  <span>Đối tượng bị lập biên bản <span className="required">*</span></span>
                  <select
                    value={cTarget}
                    onChange={(e) => { setCTarget(e.target.value as "horse" | "jockey"); setCHorseId(""); setCRuleId(""); }}
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
                      <option key={c.horseId} value={c.horseId}>
                        {cTarget === "horse"
                          ? `${c.horseName} (lane ${c.laneNumber}) · nài ${c.jockeyName}`
                          : `${c.jockeyName} · cưỡi ${c.horseName} (lane ${c.laneNumber})`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Luật vi phạm <span className="required">*</span></span>
                  <select value={cRuleId} onChange={(e) => setCRuleId(e.target.value)} disabled={busy}>
                    <option value="">— Chọn luật —</option>
                    {visibleRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.code} · {r.name} — tụt {ranksForSeverity(r.severity)} bậc</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Ghi chú</span>
                  <input value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Diễn giải tình huống…" disabled={busy} />
                </label>
              </div>
            )}
            {selectedRule && (
              <p style={{ color: "var(--c-accent, #b58900)", fontSize: "0.8rem", marginTop: "8px" }}>
                ↓ Mức độ <strong>{SEVERITY_LABEL[selectedRule.severity] ?? selectedRule.severity}</strong> — ngựa vi phạm sẽ <strong>tụt {selectedDrop} bậc</strong> trên bảng xếp hạng (tràn thì xếp cuối).
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
                        {r.target === "jockey" ? "Nài" : "Ngựa"}
                      </Badge>
                    </span>
                  ),
                },
                { key: "type", label: "Lỗi" },
                {
                  key: "penaltyApplied", label: "Hình thức",
                  render: () => <Badge tone="warning">Tụt bậc</Badge>,
                },
                { key: "description", label: "Mô tả", render: (r) => <span style={{ fontSize: "0.8rem" }}>{r.description}</span> },
                {
                  key: "id", label: "",
                  render: (r) => (
                    <button
                      type="button"
                      className="table-button is-danger"
                      disabled={busy || !canPenalize}
                      title={!canPenalize ? "Chỉ hoàn tác khi cuộc đua đang diễn ra hoặc kết quả nháp chưa xác nhận" : undefined}
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
            Quy trình: <strong>Bắt đầu điều hành</strong> (Live) → <strong>Chạy đua &amp; xem trực tiếp</strong> (tạo bảng xếp hạng) → lập biên bản cho <strong>ngựa</strong> hoặc <strong>nài ngựa</strong>: vi phạm càng nặng thì <strong>tụt càng nhiều bậc</strong> (người bị phạt nhận thông báo) → sang trang <strong>Results</strong> để xác nhận. Hoàn tác án sẽ tự khôi phục thứ hạng. Sau khi xác nhận thì không sửa được nữa.
          </div>
        </>
      )}
    </div>
  );
}
