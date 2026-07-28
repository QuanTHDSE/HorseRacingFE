import type { Race, Tone } from "../../types";

export const JOCKEY_RACE_STATUS_TONE: Record<string, Tone> = {
  Upcoming: "accent",
  Ready: "warning",
  Live: "success",
  Completed: "neutral",
  Cancelled: "danger",
};

const STATUS_PRIORITY: Record<string, number> = {
  Live: 0,
  Ready: 1,
  Upcoming: 2,
  Completed: 3,
  Cancelled: 4,
};

export function raceTimestamp(value?: string): number {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function sortJockeyRaces(races: Race[]): Race[] {
  return [...races].sort((left, right) => {
    const statusDiff = (STATUS_PRIORITY[left.liveStatus] ?? 9) - (STATUS_PRIORITY[right.liveStatus] ?? 9);
    if (statusDiff !== 0) return statusDiff;

    const leftTime = raceTimestamp(left.date);
    const rightTime = raceTimestamp(right.date);
    return left.liveStatus === "Completed" ? rightTime - leftTime : leftTime - rightTime;
  });
}

export function formatRaceDate(value?: string): string {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRaceDateTime(value?: string): string {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRaceTime(value?: string): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function scheduleDayKey(value?: string): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatScheduleDay(value?: string): string {
  if (!value) return "Chưa xác định ngày";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa xác định ngày";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (dayDiff === 0) return "Hôm nay";
  if (dayDiff === 1) return "Ngày mai";
  if (dayDiff === -1) return "Hôm qua";

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isSameLocalDay(value: string | undefined, reference = new Date()): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate();
}
