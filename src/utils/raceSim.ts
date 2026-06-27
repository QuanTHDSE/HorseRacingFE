import type { RaceSimHorse } from "../types";

// ── Deterministic RNG so the replay (overtakes) is stable per horse ───────────
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PACE_SEGMENTS = 6;

/** Trọng số tốc độ từng đoạn (seed theo horseId) → tạo vượt mặt giữa đường. */
export function paceWeights(horseId: string): number[] {
  const rng = mulberry32(hashString(horseId));
  return Array.from({ length: PACE_SEGMENTS }, () => 0.55 + rng() * 0.9);
}

/** progress(u): u∈[0,1] thời gian chuẩn hoá → quãng đường ∈[0,1], đơn điệu, p(0)=0, p(1)=1. */
export function paceProgress(u: number, weights: number[]): number {
  const clamped = Math.max(0, Math.min(1, u));
  const k = weights.length;
  const total = weights.reduce((a, b) => a + b, 0);
  const seg = Math.min(k - 1, Math.floor(clamped * k));
  const within = clamped * k - seg;
  let cum = 0;
  for (let i = 0; i < seg; i += 1) cum += weights[i]!;
  return (cum + weights[seg]! * within) / total;
}

// ── Oval (ellipse) geometry — vị trí theo % trong khung ───────────────────────
export interface OvalPoint { x: number; y: number }

/**
 * p∈[0,1] tiến độ 1 vòng. Trả về toạ độ % trên đường bầu dục.
 * FINISH ở giữa cạnh phải (θ=0); ngựa chạy ngược chiều kim đồng hồ.
 * laneIndex để xếp so le các làn (làn ngoài bán kính lớn hơn).
 */
export function ovalPoint(p: number, laneIndex: number, laneCount: number): OvalPoint {
  const baseRx = 40;
  const baseRy = 30;
  const laneSpread = laneCount > 1 ? laneIndex / (laneCount - 1) : 0; // 0..1
  const rx = baseRx - laneSpread * 9;
  const ry = baseRy - laneSpread * 7;
  const theta = -p * Math.PI * 2; // bắt đầu ở phải, đi ngược chiều kim đồng hồ
  return {
    x: 50 + rx * Math.cos(theta),
    y: 50 + ry * Math.sin(theta),
  };
}

// ── Bảng màu theo làn (xấp xỉ ảnh) ────────────────────────────────────────────
const LANE_COLORS = [
  "#e23b3b", "#3b82e2", "#e2873b", "#e2cc3b", "#9b51e0", "#27ae60",
  "#e23b9b", "#8a8f99", "#16a3a3", "#a0612f", "#5b6bd6", "#d14b8f",
];

export function laneColor(laneNumber: number): string {
  return LANE_COLORS[(laneNumber - 1) % LANE_COLORS.length]!;
}

// ── Trạng thái 1 ngựa tại thời điểm t của animation ───────────────────────────
export interface HorseFrame {
  horse: RaceSimHorse;
  progress: number; // 0..1 toàn cuộc đua
  pos: OvalPoint;
  color: string;
  facingLeft: boolean; // hướng đầu ngựa theo chiều di chuyển
  finished: boolean;
}

export interface RaceFrame {
  horses: HorseFrame[];      // theo thứ tự làn (ổn định để render)
  ranking: HorseFrame[];     // sắp theo tiến độ giảm dần (leaderboard)
  leader: HorseFrame | null;
  leaderProgress: number;
  raceTimeSec: number;       // đồng hồ ảo
  done: boolean;
}

const METERS_PER_LENGTH = 2.4;

/** Số vòng ngựa chạy quanh oval (chỉ để hiển thị cho sống động). */
export const VISUAL_LAPS = 3;

/** Tính khung hình tại elapsedMs (đã nhân hệ số tốc độ). */
export function computeFrame(
  horses: RaceSimHorse[],
  weightsByHorse: Record<string, number[]>,
  elapsedMs: number,
  durationMs: number,
): RaceFrame {
  const maxFinish = Math.max(...horses.map((h) => h.finishTime));
  const laneCount = horses.length;
  const sortedLanes = [...horses].sort((a, b) => a.laneNumber - b.laneNumber);

  const frames: HorseFrame[] = sortedLanes.map((horse, idx) => {
    const tEnd = durationMs * (horse.finishTime / maxFinish);
    const u = tEnd > 0 ? elapsedMs / tEnd : 1;
    const progress = paceProgress(u, weightsByHorse[horse.horseId] ?? [1, 1, 1, 1, 1, 1]);
    const pos = ovalPoint(progress * VISUAL_LAPS, idx, laneCount);
    return {
      horse,
      progress,
      pos,
      color: laneColor(horse.laneNumber),
      facingLeft: pos.y < 50, // nửa trên đường đua → chạy sang trái
      finished: u >= 1,
    };
  });

  const ranking = [...frames].sort(
    (a, b) => b.progress - a.progress || a.horse.finishTime - b.horse.finishTime,
  );
  const leader = ranking[0] ?? null;
  const leaderProgress = leader?.progress ?? 0;
  const done = frames.every((f) => f.finished);

  return {
    horses: frames,
    ranking,
    leader,
    leaderProgress,
    raceTimeSec: (elapsedMs / durationMs) * maxFinish,
    done,
  };
}

/** Khoảng cách phía sau leader, tính bằng "lengths" (L). */
export function lengthsBehind(leaderProgress: number, progress: number, distance: number): number {
  return Math.max(0, (leaderProgress - progress) * distance) / METERS_PER_LENGTH;
}

export function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
