import type { Tone } from "../types";
import { cn } from "../utils/cn";

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}

export default function MetricCard({ label, value, note, tone = "default" }: MetricCardProps) {
  return (
    <article className={cn("metric-card", `metric-${tone}`)}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}
