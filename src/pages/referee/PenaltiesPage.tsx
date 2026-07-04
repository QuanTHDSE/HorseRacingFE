import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import RaceLivePlayer from "../../components/RaceLivePlayer";
import { useApp } from "../../context/AppContext";
import type { RaceSimTimeline, RaceViolation, RefereeParticipantCheck, RefereeResultStatus, ViolationRule } from "../../types";

const DQ_PENALTIES = ["disqualify", "disqualification"];

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
    handleApplyTimePenalty,
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

  // Conduct penalty form
  const [cHorseId, setCHorseId] = useState("");
  const [cRuleId, setCRuleId] = useState("");
  const [cTarget, setCTarget] = useState<"horse" | "jockey" | "both">("jockey");
  const [cNotes, setCNotes] = useState("");

  // Time penalty form
  const [tHorseId, setTHorseId] = useState("");
  const [tSeconds, setTSeconds] = useState("");
  const [tType, setTType] = useState("");
  const [tDesc, setTDesc] = useState("");

  const isLive = race?.liveStatus === "Live";
  const isUpcoming = race?.liveStatus === "Upcoming";
  const hasDraft = !!result && !result.confirmedAt;
  // Có thể lập biên bản khi đang đua (Live) HOẶC khi đã chạy đua xong nhưng
  // kết quả nháp chưa được xác nhận (còn sửa được).
  const canPenalize = isLive || hasDraft;

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
    setMsg("Đã chạy đua & tạo kết quả nháp. Có thể phạt cộng giờ, rồi sang trang Results để xác nhận.");
  }

  async function applyConduct() {
    const p = participantOf(cHorseId);
    if (!p) { setError("Chọn ngựa/nài cần xử phạt."); return; }
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
      setMsg(`Đã lập biên bản với ${p.horseName} / ${p.jockeyName}.`);
      setCRuleId(""); setCNotes("");
      await reload(raceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lập biên bản thất bại");
    } finally { setBusy(false); }
  }

  async function applyTime() {
    const p = participantOf(tHorseId);
    if (!p) { setError("Chọn ngựa cần phạt giờ."); return; }
    const secs = Number(tSeconds);
    if (!secs || secs <= 0) { setError("Số giây phạt phải lớn hơn 0."); return; }
    if (!tType.trim() || !tDesc.trim()) { setError("Nhập loại lỗi và mô tả."); return; }
    setBusy(true); setError(""); setMsg("");
    try {
      await handleApplyTimePenalty(raceId, {
        horseId: p.horseId,
        jockeyId: p.jockeyId,
        addedTimeSeconds: secs,
        type: tType.trim(),
        description: tDesc.trim(),
      });
      setMsg(`Đã cộng ${secs}s cho ${p.horseName}. Bảng xếp hạng đã cập nhật.`);
      setTSeconds(""); setTType(""); setTDesc("");
      await reload(raceId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Phạt giờ thất bại");
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
      <Panel title="Xử phạt trọng tài" subtitle="Lập biên bản vi phạm, phạt cộng giờ và hoàn tác án phạt">
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
          <Panel title="Điều hành cuộc đua" subtitle="Trọng tài: bắt đầu đua → lập biên bản → chạy đua & xem trực tiếp → (sang trang Results để xác nhận)">
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

          {/* Conduct penalty */}
          <Panel
            title="Lập biên bản vi phạm"
            subtitle={canPenalize ? "Áp dụng cảnh cáo / tước quyền / cấm thi đấu cho ngựa hoặc nài" : "Chỉ lập được khi cuộc đua đang diễn ra hoặc còn kết quả nháp chưa xác nhận"}
          >
            {loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : (
              <div className="form-grid-2">
                <label className="field">
                  <span>Ngựa / Nài <span className="required">*</span></span>
                  <select value={cHorseId} onChange={(e) => setCHorseId(e.target.value)} disabled={!canPenalize || busy}>
                    <option value="">— Chọn —</option>
                    {checks.map((c) => (
                      <option key={c.horseId} value={c.horseId}>
                        {c.horseName} · {c.jockeyName} (lane {c.laneNumber})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Luật vi phạm <span className="required">*</span></span>
                  <select value={cRuleId} onChange={(e) => setCRuleId(e.target.value)} disabled={!canPenalize || busy}>
                    <option value="">— Chọn luật —</option>
                    {rules.map((r) => (
                      <option key={r.id} value={r.id}>{r.code} · {r.name} ({r.penaltyApplied})</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Đối tượng chịu phạt</span>
                  <select value={cTarget} onChange={(e) => setCTarget(e.target.value as typeof cTarget)} disabled={!canPenalize || busy}>
                    <option value="jockey">Nài ngựa</option>
                    <option value="horse">Ngựa</option>
                    <option value="both">Cả hai</option>
                  </select>
                </label>
                <label className="field">
                  <span>Ghi chú</span>
                  <input value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Diễn giải tình huống…" disabled={!canPenalize || busy} />
                </label>
              </div>
            )}
            {cRuleId && DQ_PENALTIES.includes(rules.find((r) => r.id === cRuleId)?.penaltyApplied ?? "") && (
              <p style={{ color: "var(--c-danger)", fontSize: "0.8rem", marginTop: "8px" }}>
                ⚠️ Luật này sẽ <strong>tước quyền</strong> — ngựa bị loại khỏi bảng xếp hạng.
              </p>
            )}
            <div className="form-actions" style={{ marginTop: "12px" }}>
              <button type="button" className="primary-button" disabled={!canPenalize || busy} onClick={applyConduct}>
                {busy ? "Đang xử lý…" : "Áp dụng án phạt"}
              </button>
            </div>
          </Panel>

          {/* Time penalty */}
          <Panel
            title="Phạt cộng giờ"
            subtitle={hasDraft ? "Cộng giây vào thời gian về đích — bảng xếp hạng tự sắp lại" : "Cần có kết quả nháp chưa xác nhận để phạt giờ"}
          >
            <div className="form-grid-2">
              <label className="field">
                <span>Ngựa <span className="required">*</span></span>
                <select value={tHorseId} onChange={(e) => setTHorseId(e.target.value)} disabled={!hasDraft || busy}>
                  <option value="">— Chọn ngựa —</option>
                  {checks.map((c) => (
                    <option key={c.horseId} value={c.horseId}>{c.horseName} · {c.jockeyName}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Số giây cộng thêm <span className="required">*</span></span>
                <input type="number" min={0.1} step="0.1" value={tSeconds} onChange={(e) => setTSeconds(e.target.value)} placeholder="vd: 3" disabled={!hasDraft || busy} />
              </label>
              <label className="field">
                <span>Loại lỗi <span className="required">*</span></span>
                <input value={tType} onChange={(e) => setTType(e.target.value)} placeholder="vd: Cản trở" disabled={!hasDraft || busy} />
              </label>
              <label className="field">
                <span>Mô tả <span className="required">*</span></span>
                <input value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder="Diễn giải…" disabled={!hasDraft || busy} />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: "12px" }}>
              <button type="button" className="primary-button" disabled={!hasDraft || busy} onClick={applyTime}>
                {busy ? "Đang xử lý…" : "Cộng giờ phạt"}
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
                      {r.horseName ?? "—"}{r.jockeyName ? ` / ${r.jockeyName}` : ""}
                      <span style={{ color: "var(--c-muted)", fontSize: "0.75rem" }}> ({r.target})</span>
                    </span>
                  ),
                },
                { key: "type", label: "Lỗi" },
                {
                  key: "penaltyApplied", label: "Hình thức",
                  render: (r) => r.penaltyApplied
                    ? <Badge tone={DQ_PENALTIES.includes(r.penaltyApplied) ? "danger" : "warning"}>{r.penaltyApplied}</Badge>
                    : <span style={{ color: "var(--c-muted)" }}>—</span>,
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
            Quy trình: <strong>Bắt đầu điều hành</strong> (Live) → <strong>Chạy đua &amp; xem trực tiếp</strong> → lập biên bản vi phạm / phạt cộng giờ (làm được cả khi đang đua lẫn khi còn kết quả nháp) → sang trang <strong>Results</strong> để xác nhận. Sau khi kết quả đã xác nhận thì không lập/hoàn tác biên bản được nữa.
          </div>
        </>
      )}
    </div>
  );
}
