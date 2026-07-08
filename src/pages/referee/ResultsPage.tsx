import { useEffect, useState } from "react";
import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { RaceViolation, RefereeResultStatus, ResultRankingInput } from "../../types";

interface Entry {
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  ownerName?: string;
  laneNumber: number;
  clothNumber?: number;
  finishTime?: number | "";
  prize?: number | "";
}

const DQ_PENALTIES = ["disqualify", "disqualification"];

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
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
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const race = races.find((r) => r.id === raceId) ?? null;
  const published = !!status?.publishedAt;
  const confirmed = !!status?.confirmedAt;
  const locked = published || confirmed; // can't edit once confirmed/published
  const demoteCount = violations.filter((v) => v.penaltyApplied === "demote").length;
  const disqualifiedCount = violations.filter((v) => v.penaltyApplied && DQ_PENALTIES.includes(v.penaltyApplied)).length;

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
            .filter((v) => v.horseId && v.penaltyApplied && DQ_PENALTIES.includes(v.penaltyApplied))
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
            clothNumber: c.clothNumber,
          }));

        for (const v of raceViolations) {
          if (v.penaltyApplied !== "demote" || !v.horseId || !v.affectedHorseId) continue;
          const penalizedIndex = rows.findIndex((e) => e.horseId === v.horseId);
          const affectedIndex = rows.findIndex((e) => e.horseId === v.affectedHorseId);
          if (penalizedIndex === -1 || affectedIndex === -1) continue;
          const [penalized] = rows.splice(penalizedIndex, 1);
          if (!penalized) continue;
          const nextAffectedIndex = rows.findIndex((e) => e.horseId === v.affectedHorseId);
          rows.splice(nextAffectedIndex + 1, 0, penalized);
        }

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
                prize: ranking.prize ?? 0,
              };
            })
            .filter((row): row is Entry => !!row);
          setEntries([...orderedRows, ...byHorseId.values()]);
        } else {
          setEntries(rows);
        }
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [raceId, handleGetRefereeChecks, handleGetRaceResult]);

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

  function updateEntry(idx: number, patch: Partial<Pick<Entry, "finishTime" | "prize">>) {
    setEntries((prev) => prev.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)));
    setMsg("");
  }

  function optionalNumber(value: number | "" | undefined): number | undefined {
    if (value === "" || value === undefined) return undefined;
    return Number.isFinite(value) ? value : undefined;
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
        finishTime: optionalNumber(e.finishTime),
        prize: optionalNumber(e.prize) ?? 0,
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
      <Panel title="Nhập & xác nhận kết quả" subtitle="Chọn cuộc đua đang/đã diễn ra, sắp thứ hạng rồi xác nhận">
        <label className="field" style={{ maxWidth: "420px" }}>
          <span>Cuộc đua</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            <option value="">— Chọn cuộc đua —</option>
            {eligible.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · vòng {r.round} ({r.liveStatus})</option>
            ))}
          </select>
          {eligible.length === 0 && (
            <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>
              Không có cuộc đua đang/đã diễn ra để nhập kết quả.
            </span>
          )}
        </label>
      </Panel>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      {raceId && (
        <>
          <div className="metric-grid three">
            <MetricCard label="Trạng thái đua" value={race?.liveStatus ?? "—"} note="Race status" />
            <MetricCard
              label="Kết quả"
              value={published ? "Đã công bố" : confirmed ? "Đã xác nhận" : status?.rankingsCount ? "Bản nháp" : "Chưa nhập"}
              note={`${status?.rankingsCount ?? 0} thứ hạng`}
              tone={published ? "success" : confirmed ? "accent" : "warning"}
            />
            <MetricCard label="Xác nhận lúc" value={confirmed ? "✓" : "—"} note={fmtDate(status?.confirmedAt)} tone={confirmed ? "success" : "neutral"} />
          </div>

          <Panel
            title="Thứ hạng về đích"
            subtitle={locked ? "Kết quả đã khóa, không thể sửa" : "Dùng ↑ ↓ để sắp thứ tự về đích (trên cùng = hạng 1)"}
          >
            {loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : entries.length === 0 ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Cuộc đua chưa có ngựa tham gia.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 84 }}>Rank</th>
                      <th>Horse</th>
                      <th style={{ width: 150 }}>Finish time</th>
                      <th style={{ width: 160 }}>Fixed prize</th>
                      <th style={{ width: 92 }}>Move</th>
                    </tr>
                  </thead>
                  <tbody>
                {entries.map((e, i) => (
                  <tr key={e.horseId}>
                    <td>
                      <Badge tone={i === 0 ? "success" : i <= 2 ? "accent" : "neutral"}>
                        {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`}
                      </Badge>
                    </td>
                    <td>
                      <strong>{e.horseName}</strong>
                      <div style={{ fontSize: "0.82rem", color: "var(--c-muted)" }}>
                        Lane {e.laneNumber} · Cloth {e.clothNumber ?? "—"} · {e.jockeyName} · Owner {e.ownerName ?? "—"}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={e.finishTime ?? ""}
                        disabled={locked}
                        onChange={(event) => updateEntry(i, { finishTime: event.target.value === "" ? "" : Number(event.target.value) })}
                        placeholder="seconds"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={e.prize ?? ""}
                        disabled={locked}
                        onChange={(event) => updateEntry(i, { prize: event.target.value === "" ? "" : Number(event.target.value) })}
                        placeholder="points"
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button type="button" className="table-button" disabled={locked || i === 0} onClick={() => move(i, -1)}>↑</button>
                        <button type="button" className="table-button" disabled={locked || i === entries.length - 1} onClick={() => move(i, 1)}>↓</button>
                      </div>
                    </td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
            )}

            {(demoteCount > 0 || disqualifiedCount > 0) && (
              <p className="pc-hint" style={{ marginTop: "12px" }}>
                Đã áp dụng {demoteCount} án tụt hạng và {disqualifiedCount} án tước quyền từ biên bản xử phạt. Không cập nhật thời gian phạt ở bước này.
              </p>
            )}

            {!locked && entries.length > 0 && (
              <div className="form-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="primary-button" disabled={submitting} onClick={submit}>
                  {submitting ? "Đang lưu…" : status?.rankingsCount ? "Cập nhật kết quả" : "Lưu kết quả"}
                </button>
              </div>
            )}
          </Panel>

          {/* Confirm step */}
          {!published && (
            <Panel title="Xác nhận kết quả" subtitle="Sau khi xác nhận, kết quả khóa và chờ admin công bố">
              {confirmed ? (
                <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>
                  ✓ Đã xác nhận lúc {fmtDate(status?.confirmedAt)}. Đang chờ admin công bố.
                </p>
              ) : (
                <>
                  <p className="pc-hint" style={{ marginBottom: "12px" }}>
                    Chỉ xác nhận được khi cuộc đua đã <strong>kết thúc (Completed)</strong> và đã có kết quả.
                  </p>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={confirming || race?.liveStatus !== "Completed" || !status?.rankingsCount}
                      onClick={confirm}
                    >
                      {confirming ? "Đang xác nhận…" : "Xác nhận kết quả"}
                    </button>
                  </div>
                </>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
