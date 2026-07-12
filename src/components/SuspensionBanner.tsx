import { useState } from "react";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";
import type { PenaltyDetail } from "../types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORY_LABEL: Record<string, string> = {
  race_conduct: "Race conduct",
  medical: "Medical",
  equipment: "Equipment",
  administrative: "Administrative",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const TARGET_LABEL: Record<string, string> = {
  horse: "Horse",
  jockey: "Jockey",
  both: "Horse & jockey",
};

const PENALTY_APPLIED_LABEL: Record<string, string> = {
  warning: "Warning",
  demote: "Demotion",
  disqualify: "Disqualification",
  disqualification: "Disqualification",
  restart: "Race restart",
  time_ban: "Time-boxed ban",
  permanent_ban: "Permanent ban",
};

export default function SuspensionBanner() {
  const { user, handleGetJockeyPenaltyDetail } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<PenaltyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const penalty = user?.penaltyStatus;
  if (!penalty?.isBanned) return null;

  const label = penalty.bannedUntil
    ? `You are suspended from racing until ${fmtDate(penalty.bannedUntil)}.`
    : "You are suspended from racing indefinitely by the organizer.";

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && detail === null && !loadingDetail) {
      setLoadingDetail(true);
      try {
        const res = await handleGetJockeyPenaltyDetail();
        setDetail(res);
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  return (
    <div className={cn("notification-card", "notification-danger", "suspension-banner")}>
      <div className="suspension-banner-row">
        <span className="suspension-banner-icon" aria-hidden>⚠</span>
        <p className="suspension-banner-text">
          {label}{penalty.reason ? ` Reason: ${penalty.reason}` : ""}
        </p>
      </div>
      <button type="button" className="secondary-button btn-xs" onClick={toggle}>
        {expanded ? "Hide details" : "Learn more"}
      </button>

      {expanded && (
        <div className="suspension-detail">
          {loadingDetail && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading details…</p>
          )}
          {!loadingDetail && detail === null && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No violation details available.</p>
          )}
          {!loadingDetail && detail !== null && (
            <>
              {detail.rule && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: "8px", fontSize: "0.875rem" }}>
                  <span><span style={{ color: "var(--text-muted)" }}>Rule code</span> {detail.rule.code}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Rule name</span> {detail.rule.name}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Category</span> {CATEGORY_LABEL[detail.rule.category] ?? detail.rule.category}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Severity</span> {SEVERITY_LABEL[detail.rule.severity] ?? detail.rule.severity}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Target</span> {TARGET_LABEL[detail.target] ?? detail.target}</span>
                  <span><span style={{ color: "var(--text-muted)" }}>Penalty applied</span> {detail.penaltyApplied ? (PENALTY_APPLIED_LABEL[detail.penaltyApplied] ?? detail.penaltyApplied) : "—"}</span>
                  {detail.rule.banDurationDays > 0 && (
                    <span><span style={{ color: "var(--text-muted)" }}>Ban duration</span> {detail.rule.banDurationDays} day(s)</span>
                  )}
                </div>
              )}
              <p style={{ margin: "0 0 4px", fontSize: "0.875rem" }}>{detail.description}</p>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Recorded {fmtDate(detail.recordedAt)}</span>
              {detail.race && (
                <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Related race: <strong>{detail.race.name}</strong> · {fmtDate(detail.race.scheduledAt)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
