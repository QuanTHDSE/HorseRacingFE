import type { ReactNode } from "react";
import type { Tone } from "../types";
import { cn } from "../utils/cn";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

export default function Badge({ tone = "default", children }: BadgeProps) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
