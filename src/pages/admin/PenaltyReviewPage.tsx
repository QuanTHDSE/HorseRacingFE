import { useEffect, useMemo, useState } from "react";
import { Badge, ConfirmDeleteButton, LoadingState, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RaceViolation } from "../../types";
import { viRaceStatus } from "../../utils/viLabels";

const PENALTY_LABEL: Record<string, string> = {
  warning: "Cảnh cáo",
  result_void: "Hủy kết quả",
  time_ban: "Cấm thi đấu có thời hạn",
  permanent_ban: "Cấm thi đấu vĩnh viễn",
};

function penaltyTone(penalty?: string | null): "danger" | "warning" | "info" {
  if (!penalty || penalty === "warning") return "warning";
  if (penalty === "time_ban") return "info";
  return "danger";
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PenaltyReviewPage() {
  const {
    appState,
    isDataLoading,
    handleGetAdminRaceViolations,
    handleAdminLiftRaceBan,
  } = useApp();
  const { success: showSuccess, error: showError } = useFeedback();
  const [raceId, setRaceId] = useState("");
  const [violations, setViolations] = useState<RaceViolation[]>([]);
  const [loading, setLoading] = useState(false);

  const races = useMemo(
    () => appState.races.slice().sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return Number.isNaN(dateDiff) ? b.id.localeCompare(a.id) : dateDiff;
    }),
    [appState.races],
  );

  const selectedRace = races.find((race) => race.id === raceId);
  const liftableBans = violations.filter((violation) => violation.canLiftBan);

  useEffect(() => {
    if (!raceId) {
      setViolations([]);
      return;
    }

    let active = true;
    setLoading(true);
    handleGetAdminRaceViolations(raceId)
      .then((items) => {
        if (active) setViolations(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setViolations([]);
          showError(error instanceof Error ? error.message : "Không tải được danh sách vi phạm.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [raceId, handleGetAdminRaceViolations, showError]);

  async function liftBan(violationId: string): Promise<void> {
    const { wasPublished } = await handleAdminLiftRaceBan(raceId, violationId);
    const refreshed = await handleGetAdminRaceViolations(raceId);
    setViolations(refreshed);
    showSuccess(
      wasPublished
        ? "Đã gỡ án cấm. Kết quả đã công bố, trạng thái bị loại, điểm và giải thưởng được giữ nguyên."
        : "Đã gỡ án cấm. Biên bản và trạng thái bị loại vẫn được giữ nguyên.",
    );
  }

  return (
    <div className="page-stack">
      <Panel
        title="Gỡ án cấm ngựa và nài ngựa"
        subtitle="Chỉ gỡ án cấm theo ngày hoặc cấm vĩnh viễn; biên bản và kết quả cuộc đua vẫn được giữ nguyên"
      >
        <label className="field">
          <span>Chọn cuộc đua</span>
          <select
            value={raceId}
            onChange={(event) => setRaceId(event.target.value)}
            disabled={isDataLoading}
          >
            <option value="">— Chọn cuộc đua cần kiểm tra —</option>
            {races.map((race) => (
              <option key={race.id} value={race.id}>
                {race.name} · {viRaceStatus(race.liveStatus)} · {fmtDate(race.date)}
              </option>
            ))}
          </select>
        </label>
      </Panel>

      {raceId && (
        <Panel
          title={`Biên bản vi phạm — ${selectedRace?.name ?? "Cuộc đua"}`}
          subtitle={`${liftableBans.length} án cấm có thể gỡ`}
          action={
            <Badge tone={liftableBans.length > 0 ? "warning" : "neutral"}>
              {liftableBans.length} án cấm
            </Badge>
          }
        >
          {loading ? (
            <LoadingState label="Đang tải biên bản vi phạm…" />
          ) : liftableBans.length === 0 ? (
            <div className="referee-empty-state">
              <strong>Không có án cấm có thể gỡ</strong>
              <p>Cảnh cáo và hủy kết quả không thuộc phạm vi gỡ án của admin.</p>
            </div>
          ) : (
            <div className="referee-violation-list">
              {liftableBans.map((violation) => (
                <article className="referee-violation-card" key={violation.id}>
                  <div className="referee-violation-main">
                    <div className="referee-violation-heading">
                      <div>
                        <span className="referee-eyebrow">{fmtDate(violation.recordedAt)}</span>
                        <strong>{violation.type}</strong>
                      </div>
                      <Badge tone={penaltyTone(violation.penaltyApplied)}>
                        {violation.penaltyApplied
                          ? (PENALTY_LABEL[violation.penaltyApplied] ?? violation.penaltyApplied)
                          : "Chưa xác định"}
                      </Badge>
                    </div>
                    <p>{violation.description}</p>
                    <div className="referee-violation-meta">
                      <span>
                        <small>Ngựa</small>
                        <b>{violation.horseName ?? "—"}</b>
                      </span>
                      <span>
                        <small>Nài ngựa</small>
                        <b>{violation.jockeyName ?? "—"}</b>
                      </span>
                      <span>
                        <small>Đối tượng bị phạt</small>
                        <b>
                          {violation.target === "jockey"
                            ? "Nài ngựa"
                            : violation.target === "both"
                              ? "Ngựa và nài"
                              : "Ngựa"}
                        </b>
                      </span>
                      {violation.bannedUntil && (
                        <span>
                          <small>Cấm đến</small>
                          <b>{fmtDate(violation.bannedUntil)}</b>
                        </span>
                      )}
                    </div>
                  </div>
                  <ConfirmDeleteButton
                    label="Gỡ án cấm"
                    confirmLabel="Xác nhận gỡ án?"
                    onConfirm={() => liftBan(violation.id)}
                  />
                </article>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
