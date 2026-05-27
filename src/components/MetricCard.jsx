import { cn } from "../utils/cn";

export default function MetricCard({ label, value, note, tone = "default" }) {
  return (
    <article className={cn("metric-card", `metric-${tone}`)}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}
