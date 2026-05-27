import { cn } from "../utils/cn";

export default function Badge({ tone = "default", children }) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
