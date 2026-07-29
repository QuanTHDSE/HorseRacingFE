export const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  result_void: "Hủy kết quả",
  disqualify: "Hủy kết quả",
  disqualification: "Hủy kết quả",
  time_ban: "Cấm có thời hạn",
  permanent_ban: "Cấm vô thời hạn",
};

export function penaltyLabel(p?: string | null): string {
  return p ? PENALTY_LABEL[p] ?? p : "—";
}

const RESULT_VOIDING_PENALTIES = ["result_void", "time_ban", "permanent_ban", "disqualify", "disqualification"];

export function isResultVoidingPenalty(p?: string | null): boolean {
  return !!p && RESULT_VOIDING_PENALTIES.includes(p);
}

export function penaltyTone(p?: string | null): "danger" | "warning" | "info" {
  if (!p) return "info";
  if (isResultVoidingPenalty(p)) return "danger";
  return "info";
}

export const VIOLATION_TARGET_LABEL: Record<"horse" | "jockey" | "both", string> = {
  horse: "Ngựa",
  jockey: "Nài",
  both: "Cả hai",
};
