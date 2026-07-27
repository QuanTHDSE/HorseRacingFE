import { useEffect, useState } from "react";
import Spinner from "./Spinner";
import { cn } from "../utils/cn";

interface LoadingStateProps {
  /** Main message. Default "Đang tải…". */
  label?: string;
  /**
   * Extra hint shown only once loading has taken longer than `slowAfterMs`.
   * Default explains the free-tier backend cold start.
   */
  slowHint?: string;
  /** Delay before the hint appears. Default 6000ms. Pass 0 to disable. */
  slowAfterMs?: number;
  /** Lay out on a single row instead of a centered block. */
  inline?: boolean;
}

const DEFAULT_SLOW_HINT =
  "Máy chủ đang khởi động lại, lần tải đầu tiên có thể mất tới một phút.";

/**
 * Centered "loading" block for panel bodies and page sections.
 * After a few seconds it explains the delay instead of leaving the user guessing.
 */
export default function LoadingState({
  label = "Đang tải…",
  slowHint = DEFAULT_SLOW_HINT,
  slowAfterMs = 6000,
  inline = false,
}: LoadingStateProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!slowAfterMs || !slowHint) return;
    const timer = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowAfterMs, slowHint]);

  return (
    <div className={cn("loading-state", inline && "is-inline")} role="status" aria-live="polite">
      <Spinner size={inline ? "sm" : "lg"} />
      <p>{label}</p>
      {slow && !inline ? <p className="loading-hint">{slowHint}</p> : null}
    </div>
  );
}
