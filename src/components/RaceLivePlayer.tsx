import { useEffect, useMemo, useRef, useState } from "react";
import type { RaceSimTimeline } from "../types";
import { computeFrame, fmtClock, lengthsBehind, paceWeights, type RaceFrame } from "../utils/raceSim";

const SPEEDS = [1, 2, 4] as const;

export default function RaceLivePlayer({
  timeline,
  onClose,
}: {
  timeline: RaceSimTimeline;
  onClose: () => void;
}) {
  const weights = useMemo(() => {
    const map: Record<string, number[]> = {};
    timeline.horses.forEach((h) => { map[h.horseId] = paceWeights(h.horseId); });
    return map;
  }, [timeline]);

  const [frame, setFrame] = useState<RaceFrame>(() =>
    computeFrame(timeline.horses, weights, 0, timeline.durationMs),
  );
  const [speed, setSpeed] = useState<number>(1);
  const [done, setDone] = useState(false);

  const elapsedRef = useRef(0);
  const speedRef = useRef(1);
  const lastTsRef = useRef<number | null>(null);
  const prevLeadRef = useRef({ p: 0, t: 0 });
  const [speedPct, setSpeedPct] = useState(80);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    let raf = 0;
    // bắt đầu lại đồng hồ mỗi lần mount (tránh nhảy do timestamp cũ / StrictMode)
    lastTsRef.current = null;
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      // chặn delta quá lớn (tab bị treo / remount) để ngựa không "nhảy" tới đích
      const rawDt = Math.min(64, ts - lastTsRef.current);
      const dt = rawDt * speedRef.current;
      lastTsRef.current = ts;
      elapsedRef.current = Math.min(timeline.durationMs, elapsedRef.current + dt);

      const f = computeFrame(timeline.horses, weights, elapsedRef.current, timeline.durationMs);
      setFrame(f);

      // tốc độ tức thời của leader (cho thanh SPEED)
      const tSec = elapsedRef.current / 1000;
      const dp = f.leaderProgress - prevLeadRef.current.p;
      const dts = tSec - prevLeadRef.current.t;
      if (dts > 0.05) {
        const inst = (dp / dts) * (timeline.durationMs / 1000); // ~1.0 ở tốc độ trung bình
        setSpeedPct(Math.max(8, Math.min(100, Math.round(inst * 85))));
        prevLeadRef.current = { p: f.leaderProgress, t: tSec };
      }

      if (elapsedRef.current >= timeline.durationMs || f.done) {
        setDone(true);
        setSpeedPct(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeline, weights]);

  const leader = frame.leader;
  const distRemaining = Math.max(0, Math.round((1 - frame.leaderProgress) * timeline.distance));
  const cond = timeline.trackCondition.toUpperCase();

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true">
      <style>{`
        @keyframes gallop-bob {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headChip}><span style={S.headLabel}>RACE</span> <b style={{ color: "#ffd24a" }}>{timeline.name}</b></div>
          <div style={S.headChip}><span style={S.headLabel}>DIST</span> <b style={{ color: "#ffd24a" }}>{timeline.distance}m</b></div>
          <div style={S.headChip}><span style={S.headLabel}>TIME</span> <b style={{ color: "#ffd24a" }}>{fmtClock(frame.raceTimeSec)}</b></div>
          <div style={S.headChip}><span style={S.headLabel}>LAP</span> <b style={{ color: "#ffd24a" }}>1 / {timeline.laps}</b></div>
          <button type="button" style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.body}>
          {/* ── Track + speed controls ── */}
          <div style={{ position: "relative" }}>
            <div style={S.speedCtrl}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  style={{ ...S.speedBtn, ...(speed === s ? S.speedBtnOn : {}) }}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div style={S.field}>
              <div style={S.dirt} />
              <div style={S.infield} />
              {/* FINISH line */}
              <div style={S.finishLine} />
              <div style={S.finishFlag}>🏁</div>

              {/* Horses */}
              {frame.horses.map((hf) => {
                const isLeader = !!leader && leader.horse.horseId === hf.horse.horseId;
                return (
                  <div
                    key={hf.horse.horseId}
                    style={{ ...S.runner, left: `${hf.pos.x}%`, top: `${hf.pos.y}%` }}
                    title={hf.horse.horseName}
                  >
                    {isLeader && <div style={S.crown}>👑</div>}
                    <div style={{ ...S.numBadge, background: hf.color }}>{hf.horse.clothNumber}</div>
                    <div
                      style={{
                        transform: `scaleX(${hf.facingLeft ? -1 : 1})`,
                        filter: isLeader ? "drop-shadow(0 0 6px #ffd24a)" : "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
                      }}
                    >
                      <div style={{ fontSize: 30, lineHeight: 1, animation: "gallop-bob 0.34s ease-in-out infinite" }}>
                        🏇
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right column: leaderboard ── */}
          <div style={S.board}>
            <div style={S.boardHead}>
              <span style={{ width: 28 }}>POS</span>
              <span style={{ flex: 1 }}>HORSE</span>
              <span style={{ width: 64, textAlign: "right" }}>DIST</span>
            </div>
            <div style={S.boardRows}>
              {frame.ranking.map((hf, i) => (
                <div key={hf.horse.horseId} style={S.boardRow}>
                  <span style={{ ...S.posBadge, background: hf.color }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ color: "#fff" }}>{hf.horse.horseName}</b>
                    <span style={S.jockey}> {hf.horse.jockeyName}</span>
                  </span>
                  <span style={{ width: 64, textAlign: "right", color: "#bdc4cf" }}>
                    {i === 0 ? "—" : `${lengthsBehind(frame.leaderProgress, hf.progress, timeline.distance).toFixed(1)}L`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom panels ── */}
        <div style={S.bottom}>
          <div style={S.panel}>
            <span style={S.panelLabel}>LEADER</span>
            {leader ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...S.posBadge, background: leader.color }}>{leader.horse.clothNumber}</span>
                <b style={{ color: "#fff" }}>{leader.horse.horseName}</b>
              </div>
            ) : <span style={{ color: "#9aa2ad" }}>—</span>}
            <div style={S.speedBarWrap}>
              <span style={S.panelLabel}>SPEED</span>
              <div style={S.speedBarOuter}>
                <div style={{ ...S.speedBarInner, width: `${speedPct}%` }} />
              </div>
            </div>
          </div>

          <div style={S.panel}>
            <span style={S.panelLabel}>DISTANCE REMAINING</span>
            <b style={{ color: "#ffd24a", fontSize: "1.6rem" }}>{distRemaining}m</b>
          </div>

          <div style={S.panel}>
            <span style={S.panelLabel}>TRACK CONDITION</span>
            <b style={{ color: "#4ade80", fontSize: "1.2rem" }}>🌱 {cond}</b>
          </div>
        </div>

        {/* ── Finish overlay ── */}
        {done && (
          <div style={S.finishCard}>
            <h3 style={{ margin: "0 0 4px", color: "#ffd24a" }}>🏆 Kết quả chung cuộc — {timeline.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#cbd2db" }}>
              Kết quả đã được lưu &amp; công bố. Dự đoán đã được settle.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...timeline.horses].sort((a, b) => a.rank - b.rank).map((h) => (
                <div key={h.horseId} style={S.finishRow}>
                  <span style={{ ...S.posBadge, background: "#2c3744" }}>
                    {h.rank === 1 ? "🥇" : h.rank === 2 ? "🥈" : h.rank === 3 ? "🥉" : h.rank}
                  </span>
                  <b style={{ flex: 1, color: "#fff" }}>{h.horseName}</b>
                  <span style={{ color: "#9aa2ad", fontSize: "0.85rem" }}>{h.jockeyName}</span>
                  <span style={{ width: 80, textAlign: "right", color: "#cbd2db" }}>{h.finishTime.toFixed(2)}s</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="primary-button" onClick={onClose}>Xong</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(1100px, 96vw)", maxHeight: "94vh", overflow: "auto",
    background: "#1d2530", border: "1px solid #2c3744", borderRadius: 14,
    boxShadow: "0 24px 60px rgba(0,0,0,0.5)", position: "relative",
  },
  header: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "12px 16px", borderBottom: "1px solid #2c3744", background: "#161d26",
    borderRadius: "14px 14px 0 0",
  },
  headChip: { display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#9aa2ad", letterSpacing: "0.04em" },
  headLabel: { fontSize: "0.68rem", color: "#7c8694", fontWeight: 700 },
  closeBtn: { marginLeft: "auto", background: "#2c3744", color: "#fff", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer" },
  body: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, padding: 16 },
  speedCtrl: { position: "absolute", top: 8, left: 8, zIndex: 2, display: "flex", flexDirection: "column", gap: 4 },
  speedBtn: { background: "#161d26", color: "#cbd2db", border: "1px solid #2c3744", borderRadius: 6, width: 36, height: 28, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 },
  speedBtnOn: { background: "#ffd24a", color: "#161d26", borderColor: "#ffd24a" },
  field: {
    position: "relative", width: "100%", aspectRatio: "3 / 2",
    background: "linear-gradient(#5bb24f, #4a9b42)", borderRadius: 12, overflow: "hidden",
    border: "2px solid #3c7a36",
  },
  dirt: {
    position: "absolute", left: "8%", top: "12%", width: "84%", height: "76%",
    background: "#c89a5e", borderRadius: "50%",
  },
  infield: {
    position: "absolute", left: "22%", top: "30%", width: "56%", height: "40%",
    background: "#57aa4c", borderRadius: "50%", boxShadow: "inset 0 0 0 2px #3c7a36",
  },
  finishLine: {
    position: "absolute", right: "8%", top: "44%", width: 4, height: "12%",
    background: "repeating-linear-gradient(#fff, #fff 4px, #111 4px, #111 8px)",
  },
  finishFlag: { position: "absolute", right: "3%", top: "46%", fontSize: "1rem" },
  runner: {
    position: "absolute", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none",
  },
  crown: { fontSize: 13, lineHeight: 1, marginBottom: -2 },
  numBadge: {
    minWidth: 16, height: 16, padding: "0 3px", borderRadius: 4, color: "#fff",
    fontWeight: 800, fontSize: "0.62rem", display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid rgba(0,0,0,0.35)", marginBottom: 1,
  },
  board: { background: "#161d26", borderRadius: 10, padding: 10, border: "1px solid #2c3744", minHeight: 0 },
  boardHead: { display: "flex", gap: 8, fontSize: "0.68rem", color: "#7c8694", fontWeight: 700, padding: "2px 6px 8px", borderBottom: "1px solid #2c3744" },
  boardRows: { display: "flex", flexDirection: "column", gap: 2, marginTop: 6 },
  boardRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 6, fontSize: "0.82rem" },
  posBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, borderRadius: 5, color: "#fff", fontWeight: 800, fontSize: "0.72rem", padding: "0 4px" },
  jockey: { color: "#9aa2ad", fontSize: "0.74rem" },
  bottom: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12, padding: "0 16px 16px" },
  panel: { background: "#161d26", border: "1px solid #2c3744", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  panelLabel: { fontSize: "0.68rem", color: "#7c8694", fontWeight: 700, letterSpacing: "0.05em" },
  speedBarWrap: { display: "flex", flexDirection: "column", gap: 4 },
  speedBarOuter: { height: 12, background: "#0e141b", borderRadius: 6, overflow: "hidden", border: "1px solid #2c3744" },
  speedBarInner: { height: "100%", background: "linear-gradient(90deg, #4ade80, #22c55e)", transition: "width 0.1s linear" },
  finishCard: {
    position: "absolute", inset: 0, background: "rgba(15,20,27,0.92)", borderRadius: 14,
    display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 32px",
  },
  finishRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "#1d2530", borderRadius: 8, border: "1px solid #2c3744" },
};
