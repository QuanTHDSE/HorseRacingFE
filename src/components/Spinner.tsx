import { cn } from "../utils/cn";

interface SpinnerProps {
  /** Visual size. Default "md" (18px). */
  size?: "sm" | "md" | "lg";
  /** Use the light variant when placed on a filled/primary background. */
  onPrimary?: boolean;
  /** Screen-reader label. Falsy keeps the spinner purely decorative. */
  label?: string;
}

/**
 * Bare circular spinner. Compose it into buttons, rows or panels —
 * for a full "loading" block with a message use <LoadingState /> instead.
 */
export default function Spinner({ size = "md", onPrimary, label }: SpinnerProps) {
  return (
    <span
      className={cn("spinner", size !== "md" && `is-${size}`, onPrimary && "on-primary")}
      role={label ? "status" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
