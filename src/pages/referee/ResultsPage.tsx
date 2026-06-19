import { useEffect, useState } from "react";
import { Badge, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { RefereeResultStatus, ResultRankingInput } from "../../types";

interface Entry {
  horseId: string;
  horseName: string;
  jockeyId: string;
  jockeyName: string;
  ownerId: string;
  laneNumber: number;
  finishTime: string;
  prize: string;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function ResultsPage() {
  const { appState, handleGetRefereeChecks, handleGetRaceResult, handleSubmitRaceResult, handleConfirmRaceResult } = useApp();

  const races = appState.refereeRaces;
  // Result entry needs the race to be ongoing/completed
  const eligible = races.filter((r) => r.liveStatus === "Live" || r.liveStatus === "Completed");

  const [raceId, setRaceId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
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

  useEffect(() => {
    if (!raceId) { setEntries([]); setStatus(null); return; }
    let alive = true;
    setLoading(true);
    setError(""); setMsg("");
    Promise.all([handleGetRefereeChecks(raceId), handleGetRaceResult(raceId)])
      .then(([checks, st]) => {
        if (!alive) return;
        setStatus(st);
        setEntries(
          checks
            .slice()
            .sort((a, b) => a.laneNumber - b.laneNumber)
            .map((c) => ({
              horseId: c.horseId, horseName: c.horseName,
              jockeyId: c.jockeyId, jockeyName: c.jockeyName, ownerId: c.ownerId,
              laneNumber: c.laneNumber, finishTime: "", prize: "",
            })),
        );
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

  function setField(idx: number, key: "finishTime" | "prize", value: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
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
        finishTime: e.finishTime ? Number(e.finishTime) : undefined,
        prize: e.prize ? Number(e.prize) : undefined,
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
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {entries.map((e, i) => (
                  <div
                    key={e.horseId}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", background: "var(--c-surf-low)",
                      border: "1px solid var(--c-outline-var)", borderRadius: "var(--r-lg)",
                    }}
                  >
                    <Badge tone={i === 0 ? "success" : i <= 2 ? "accent" : "neutral"}>
                      {i === 0 ? "🥇 1" : i === 1 ? "🥈 2" : i === 2 ? "🥉 3" : `#${i + 1}`}
                    </Badge>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{e.horseName}</strong>
                      <span style={{ marginLeft: "8px", fontSize: "0.82rem", color: "var(--c-muted)" }}>
                        Lane {e.laneNumber} · {e.jockeyName}
                      </span>
                    </div>
                    <input
                      type="number" min={0} placeholder="Time (s)" value={e.finishTime} disabled={locked}
                      onChange={(ev) => setField(i, "finishTime", ev.target.value)}
                      style={{ width: "100px" }}
                    />
                    <input
                      type="number" min={0} placeholder="Prize" value={e.prize} disabled={locked}
                      onChange={(ev) => setField(i, "prize", ev.target.value)}
                      style={{ width: "100px" }}
                    />
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button type="button" className="table-button" disabled={locked || i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="table-button" disabled={locked || i === entries.length - 1} onClick={() => move(i, 1)}>↓</button>
                    </div>
                  </div>
                ))}
              </div>
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
