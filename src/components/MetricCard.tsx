import type { Tone } from "../types";
import { cn } from "../utils/cn";
import Skeleton from "./Skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
  /** Replace the value (and note) with shimmer placeholders while data loads. */
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  note,
  tone = "default",
  loading = false,
}: MetricCardProps) {
  return (
    <article
      className={cn("metric-card", `metric-${tone}`, loading && "is-loading")}
      aria-busy={loading || undefined}
    >
      <p>{label}</p>
      <strong>{loading ? <Skeleton width="3ch" /> : value}</strong>
      <span>{loading ? <Skeleton width="80%" /> : note}</span>
    </article>
  );
}
