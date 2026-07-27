import { cn } from "../utils/cn";

interface SkeletonProps {
  /** CSS width, e.g. "100%", "8ch", 120. Default "100%". */
  width?: string | number;
  /** CSS height. Ignored for variant "text", which sizes from the font. */
  height?: string | number;
  variant?: "text" | "block" | "circle";
  className?: string;
}

/**
 * Shimmering placeholder that stands in for content while it loads.
 * Keep the shape close to the real content so the layout does not jump.
 */
export default function Skeleton({
  width = "100%",
  height,
  variant = "text",
  className,
}: SkeletonProps) {
  return (
    <span
      className={cn("skeleton", variant !== "block" && `is-${variant}`, className)}
      style={{ width, ...(height !== undefined ? { height } : {}) }}
      aria-hidden="true"
    />
  );
}
