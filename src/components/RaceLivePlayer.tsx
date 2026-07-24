import { useEffect, useMemo, useRef, useState } from "react";
import type { RaceSimTimeline } from "../types";
import { computeFrame, fmtClock, lengthsBehind, paceWeights, type RaceFrame } from "../utils/raceSim";

const SPEEDS = [1, 2, 4] as const;
const HORSE_VIOLATION_RATE = 0.2;
const JOCKEY_VIOLATION_RATE = 0.25;

const HORSE_VIOLATIONS = [
  "Đổi hướng đột ngột, có dấu hiệu cản đường ngựa phía sau.",
  "Chạy lệch làn và lấn sang phần đường của ngựa bên cạnh.",
  "Có va chạm với ngựa bên cạnh trong lúc tranh vị trí.",
  "Không giữ đúng quỹ đạo tại khúc cua.",
] as const;

const JOCKEY_VIOLATIONS = [
  "Có dấu hiệu ép làn khi đang vượt.",
  "Sử dụng roi liên tiếp vượt mức cần thiết.",
  "Không duy trì khoảng cách an toàn với đối thủ phía trước.",
  "Điều khiển ngựa chuyển làn khi chưa đủ khoảng trống.",
] as const;

interface RaceNote {
  id: string;
  progress: number;
  time: string;
  tone: "neutral" | "info" | "warning" | "violation" | "finish";
  text: string;
  violationTarget?: "horse" | "jockey";
  subjectName?: string;
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function addSimulatedViolationNotes(
  notes: RaceNote[],
  timeline: RaceSimTimeline,
  maxFinish: number,
): void {
  const initialNoteCount = notes.length;

  timeline.horses.forEach((horse) => {
    const horseSeed = `${timeline.raceId}:horse:${horse.horseId}`;
    const horseRoll = seededUnit(`${horseSeed}:roll`);

    if (horseRoll < HORSE_VIOLATION_RATE) {
      const progress = 0.18 + seededUnit(`${horseSeed}:time`) * 0.64;
      const description =
        HORSE_VIOLATIONS[
          Math.floor(seededUnit(`${horseSeed}:type`) * HORSE_VIOLATIONS.length)
        ] ?? HORSE_VIOLATIONS[0];
      notes.push({
        id: `horse-violation-${horse.horseId}`,
        progress,
        time: fmtClock(progress * maxFinish),
        tone: "violation",
        violationTarget: "horse",
        subjectName: horse.horseName,
        text: `Nghi vấn vi phạm của ngựa ${horse.horseName}: ${description}`,
      });
    }

    const jockeySeed = `${timeline.raceId}:jockey:${horse.jockeyId || horse.horseId}`;
    const jockeyRoll = seededUnit(`${jockeySeed}:roll`);

    if (jockeyRoll < JOCKEY_VIOLATION_RATE) {
      const progress = 0.2 + seededUnit(`${jockeySeed}:time`) * 0.62;
      const description =
        JOCKEY_VIOLATIONS[
          Math.floor(seededUnit(`${jockeySeed}:type`) * JOCKEY_VIOLATIONS.length)
        ] ?? JOCKEY_VIOLATIONS[0];
      notes.push({
        id: `jockey-violation-${horse.jockeyId || horse.horseId}`,
        progress,
        time: fmtClock(progress * maxFinish),
        tone: "violation",
        violationTarget: "jockey",
        subjectName: horse.jockeyName,
        text: `Nghi vấn vi phạm của nài ${horse.jockeyName}: ${description}`,
      });
    }
  });

  // Mỗi lượt mô phỏng dành cho trọng tài cần có ít nhất một tình huống để
  // kiểm tra quy trình lập biên bản, kể cả khi toàn bộ lượt quay tỷ lệ đều trượt.
  if (notes.length === initialNoteCount && timeline.horses.length > 0) {
    const fallbackSeed = `${timeline.raceId}:fallback-violation`;
    const horse =
      timeline.horses[
        Math.floor(seededUnit(`${fallbackSeed}:participant`) * timeline.horses.length)
      ] ?? timeline.horses[0];
    if (!horse) return;

    const isJockey = seededUnit(`${fallbackSeed}:target`) < 0.55;
    const progress = 0.35 + seededUnit(`${fallbackSeed}:time`) * 0.35;
    const descriptions = isJockey ? JOCKEY_VIOLATIONS : HORSE_VIOLATIONS;
    const description =
      descriptions[
        Math.floor(seededUnit(`${fallbackSeed}:type`) * descriptions.length)
      ] ?? descriptions[0];
    const subjectName = isJockey ? horse.jockeyName : horse.horseName;

    notes.push({
      id: "fallback-violation",
      progress,
      time: fmtClock(progress * maxFinish),
      tone: "violation",
      violationTarget: isJockey ? "jockey" : "horse",
      subjectName,
      text: `Nghi vấn vi phạm của ${isJockey ? "nài" : "ngựa"} ${subjectName}: ${description}`,
    });
  }
}

function buildRaceNotes(
  timeline: RaceSimTimeline,
  weights: Record<string, number[]>,
): RaceNote[] {
  if (timeline.horses.length === 0) return [];

  const maxFinish = Math.max(...timeline.horses.map((horse) => horse.finishTime));
  const notes: RaceNote[] = [
    {
      id: "start",
      progress: 0,
      time: "0:00.00",
      tone: "info",
      text: `${timeline.horses.length} ngựa đã xuất phát. Trọng tài bắt đầu theo dõi cuộc đua.`,
    },
  ];

  let previousOrder = computeFrame(timeline.horses, weights, 0, timeline.durationMs).ranking;
  let lastLeadNoteProgress = -1;
  let lastMoveNoteProgress = -1;

  for (let step = 1; step < 20; step += 1) {
    const progress = step / 20;
    const frame = computeFrame(
      timeline.horses,
      weights,
      timeline.durationMs * progress,
      timeline.durationMs,
    );
    const currentOrder = frame.ranking;
    const previousLeader = previousOrder[0];
    const currentLeader = currentOrder[0];
    const time = fmtClock(progress * maxFinish);

    if (
      previousLeader &&
      currentLeader &&
      previousLeader.horse.horseId !== currentLeader.horse.horseId &&
      progress - lastLeadNoteProgress >= 0.1
    ) {
      notes.push({
        id: `lead-${step}`,
        progress,
        time,
        tone: "warning",
        text: `${currentLeader.horse.horseName} vượt ${previousLeader.horse.horseName} và vươn lên dẫn đầu.`,
      });
      lastLeadNoteProgress = progress;
    } else if (progress - lastMoveNoteProgress >= 0.15) {
      const previousPositions = new Map(
        previousOrder.map((horse, index) => [horse.horse.horseId, index]),
      );
      const climber = currentOrder
        .map((horse, index) => ({
          horse,
          gained: (previousPositions.get(horse.horse.horseId) ?? index) - index,
        }))
        .sort((a, b) => b.gained - a.gained)[0];

      if (climber && climber.gained >= 2) {
        notes.push({
          id: `move-${step}`,
          progress,
          time,
          tone: "info",
          text: `${climber.horse.horse.horseName} tăng ${climber.gained} bậc, hiện đứng vị trí ${currentOrder.indexOf(climber.horse) + 1}.`,
        });
        lastMoveNoteProgress = progress;
      }
    }

    if (step === 5 || step === 10 || step === 15) {
      const distance = Math.round(progress * timeline.distance);
      notes.push({
        id: `checkpoint-${step}`,
        progress,
        time,
        tone: "neutral",
        text: `Qua mốc ${distance}m: ${currentLeader?.horse.horseName ?? "chưa xác định"} đang dẫn đầu.`,
      });
    }

    if (step === 18) {
      notes.push({
        id: "final-stretch",
        progress,
        time,
        tone: "warning",
        text: `Vào đoạn nước rút cuối. Còn khoảng ${Math.max(1, Math.round(timeline.distance * 0.1))}m đến đích.`,
      });
    }

    previousOrder = currentOrder;
  }

  addSimulatedViolationNotes(notes, timeline, maxFinish);

  const winner = [...timeline.horses].sort((a, b) => a.rank - b.rank)[0];
  notes.push({
    id: "finish",
    progress: 1,
    time: fmtClock(maxFinish),
    tone: "finish",
    text: winner
      ? `${winner.horseName} cán đích đầu tiên. Cuộc đua đã kết thúc, chờ trọng tài chốt kết quả.`
      : "Cuộc đua đã kết thúc, chờ trọng tài chốt kết quả.",
  });

  return notes.sort((a, b) => a.progress - b.progress);
}

// Màu sắc màn đua theo mặt sân của trường đua
const SURFACE_THEME: Record<string, { field: string; track: string; infield: string; rail: string; label: string }> = {
  dirt:      { field: "linear-gradient(#5bb24f, #4a9b42)", track: "#c89a5e", infield: "#57aa4c", rail: "#3c7a36", label: "Dirt" },
  turf:      { field: "linear-gradient(#3f8f4a, #2f7a3c)", track: "#66b357", infield: "#357a3f", rail: "#255a2c", label: "Turf" },
  synthetic: { field: "linear-gradient(#565d68, #464c56)", track: "#9aa0ab", infield: "#5a616c", rail: "#343a43", label: "Synthetic" },
};

export default function RaceLivePlayer({
  timeline,
  onClose,
  showRaceNotes = false,
}: {
  timeline: RaceSimTimeline;
  onClose: () => void;
  showRaceNotes?: boolean;
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const speedRef = useRef(1);
  const lastTsRef = useRef<number | null>(null);
  const prevLeadRef = useRef({ p: 0, t: 0 });
  const [speedPct, setSpeedPct] = useState(80);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const raceNotes = useMemo(
    () => buildRaceNotes(timeline, weights),
    [timeline, weights],
  );

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Cuộn tới màn xem đua khi nó vừa được thêm vào trang
  useEffect(() => {
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
  const theme = SURFACE_THEME[timeline.surface] ?? SURFACE_THEME.turf;
  const maxFinish = Math.max(...timeline.horses.map((horse) => horse.finishTime), 1);
  const elapsedProgress = Math.min(1, frame.raceTimeSec / maxFinish);
  const visibleNotes = showRaceNotes
    ? raceNotes.filter((note) => note.progress <= elapsedProgress + 0.001)
    : [];
  const visibleViolationCount = visibleNotes.filter(
    (note) => note.tone === "violation",
  ).length;

  useEffect(() => {
    if (!showRaceNotes) return;
    notesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [showRaceNotes, visibleNotes.length]);

  return (
    <div style={S.wrap} ref={wrapRef}>
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
          {timeline.trackName && (
            <div style={S.headChip}>
              <span style={S.headLabel}>🏟</span>
              <b style={{ color: "#ffd24a" }}>{timeline.trackName}</b>
              {timeline.trackLocation && <span style={{ color: "#9aa2ad" }}>· {timeline.trackLocation}</span>}
            </div>
          )}
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

            <div style={{ ...S.field, background: theme.field, borderColor: theme.rail }}>
              <div style={{ ...S.dirt, background: theme.track }} />
              <div style={{ ...S.infield, background: theme.infield, boxShadow: `inset 0 0 0 2px ${theme.rail}` }} />
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
            <span style={{ fontSize: "0.72rem", color: "#9aa2ad" }}>Mặt sân: {theme.label}</span>
          </div>
        </div>

        {showRaceNotes && (
          <section style={S.notesPanel} aria-label="Nhật ký diễn biến dành cho trọng tài">
            <div style={S.notesHeader}>
              <div>
                <span style={S.panelLabel}>NHẬT KÝ TRỌNG TÀI</span>
                <strong style={S.notesTitle}>Diễn biến trong cuộc đua</strong>
              </div>
              <div style={S.notesMeta}>
                <span style={S.rateChip}>Ngựa: {Math.round(HORSE_VIOLATION_RATE * 100)}%</span>
                <span style={S.rateChip}>Nài: {Math.round(JOCKEY_VIOLATION_RATE * 100)}%</span>
                <span style={S.violationCount}>{visibleViolationCount} nghi vấn</span>
                <span style={S.liveIndicator}>
                  <span style={S.liveDot} />
                  {done ? "Đã kết thúc" : "Đang ghi nhận"}
                </span>
              </div>
            </div>
            <div style={S.notesList} aria-live="polite">
              {visibleNotes.map((note) => (
                <article
                  key={note.id}
                  style={{
                    ...S.noteRow,
                    ...(note.tone === "warning" ? S.noteWarning : {}),
                    ...(note.tone === "violation" ? S.noteViolation : {}),
                    ...(note.tone === "finish" ? S.noteFinish : {}),
                  }}
                >
                  <time style={S.noteTime}>{note.time}</time>
                  <span style={S.noteMarker}>
                    {note.tone === "finish"
                      ? "🏁"
                      : note.tone === "violation"
                        ? "⚠"
                        : note.tone === "warning"
                          ? "!"
                          : "•"}
                  </span>
                  <span style={S.noteText}>
                    {note.violationTarget && (
                      <span
                        style={{
                          ...S.targetBadge,
                          ...(note.violationTarget === "horse" ? S.horseBadge : S.jockeyBadge),
                        }}
                      >
                        {note.violationTarget === "horse" ? "NGỰA" : "NÀI NGỰA"}
                      </span>
                    )}
                    {note.text}
                  </span>
                </article>
              ))}
              <div ref={notesEndRef} />
            </div>
            <p style={S.notesHint}>
              Tỷ lệ mô phỏng trên được tính độc lập cho từng ngựa và từng nài. Các cảnh báo chỉ là nghi vấn hỗ trợ quan sát; trọng tài phải kiểm tra và lập biên bản trước khi áp dụng hình phạt.
            </p>
          </section>
        )}

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
  wrap: { width: "100%" },
  modal: {
    width: "100%",
    background: "#1d2530", border: "1px solid #2c3744", borderRadius: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden",
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
  notesPanel: {
    margin: "0 16px 16px", background: "#161d26", border: "1px solid #394556",
    borderRadius: 10, overflow: "hidden",
  },
  notesHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "12px 14px", borderBottom: "1px solid #2c3744",
  },
  notesTitle: { display: "block", color: "#fff", fontSize: "0.95rem", marginTop: 3 },
  notesMeta: {
    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7,
    flexWrap: "wrap",
  },
  rateChip: {
    padding: "4px 7px", borderRadius: 999, background: "#25303d", color: "#cbd2db",
    border: "1px solid #394556", fontSize: "0.68rem", fontWeight: 700,
  },
  violationCount: {
    padding: "4px 7px", borderRadius: 999, background: "rgba(239,68,68,0.12)",
    color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)",
    fontSize: "0.68rem", fontWeight: 800,
  },
  liveIndicator: {
    display: "inline-flex", alignItems: "center", gap: 6, color: "#cbd2db",
    fontSize: "0.72rem", fontWeight: 700,
  },
  liveDot: {
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.16)",
  },
  notesList: { maxHeight: 180, overflowY: "auto", padding: "6px 10px" },
  noteRow: {
    display: "grid", gridTemplateColumns: "62px 22px 1fr", alignItems: "start",
    gap: 8, padding: "8px 6px", borderBottom: "1px solid rgba(57,69,86,0.55)",
  },
  noteWarning: { background: "rgba(245,158,11,0.08)" },
  noteViolation: {
    background: "rgba(239,68,68,0.12)", borderLeft: "3px solid #ef4444",
  },
  noteFinish: { background: "rgba(74,222,128,0.08)" },
  noteTime: { color: "#ffd24a", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" },
  noteMarker: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", background: "#2c3744",
    color: "#fff", fontSize: "0.68rem", fontWeight: 800,
  },
  noteText: { color: "#d8dee7", fontSize: "0.8rem", lineHeight: 1.45 },
  targetBadge: {
    display: "inline-block", padding: "2px 5px", marginRight: 7, borderRadius: 4,
    fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.04em",
  },
  horseBadge: { background: "#7c3aed", color: "#ede9fe" },
  jockeyBadge: { background: "#0369a1", color: "#e0f2fe" },
  notesHint: {
    margin: 0, padding: "8px 14px", borderTop: "1px solid #2c3744",
    color: "#7c8694", fontSize: "0.7rem", lineHeight: 1.4,
  },
  finishCard: {
    position: "absolute", inset: 0, background: "rgba(15,20,27,0.92)", borderRadius: 14,
    display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 32px",
  },
  finishRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "#1d2530", borderRadius: 8, border: "1px solid #2c3744" },
};
