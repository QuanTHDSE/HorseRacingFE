import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RefereeParticipantCheck } from "../../types";
import { cn } from "../../utils/cn";
import { viRaceStatus } from "../../utils/viLabels";

export default function ChecksPage() {
  const { appState, handleGetRefereeChecks, handleToggleRefereeCheck } = useApp();

  const races = appState.refereeRaces;
  // Pre-race checks are meaningful before/at race time
  const eligible = races.filter((r) => r.liveStatus === "Upcoming" || r.liveStatus === "Live");

  const [raceId, setRaceId] = useState("");
  const [checks, setChecks] = useState<RefereeParticipantCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const error = ""; const setError = fb.error;
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!raceId) { setChecks([]); return; }
    let alive = true;
    setLoading(true);
    setError("");
    handleGetRefereeChecks(raceId)
      .then((c) => alive && setChecks(c))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Không tải được checklist"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [raceId, handleGetRefereeChecks]);

  async function toggle(horseId: string, field: "vetApprovedAt" | "confirmedAt") {
    setBusy(`${horseId}-${field}`);
    setError("");
    try {
      const updated = await handleToggleRefereeCheck(raceId, horseId, field);
      setChecks(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusy(null);
    }
  }

  const vetDone = checks.filter((c) => c.vetApproved).length;
  const lineupDone = checks.filter((c) => c.confirmed).length;

  return (
    <div className="page-stack">
      <Panel title="Duyệt trước cuộc đua" subtitle="Chọn cuộc đua để kiểm tra thú y và xác nhận xuất phát từng ngựa">
        <label className="field" style={{ maxWidth: "420px" }}>
          <span>Cuộc đua</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            <option value="">— Chọn cuộc đua —</option>
            {eligible.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · vòng {r.round} ({viRaceStatus(r.liveStatus)})</option>
            ))}
          </select>
          {eligible.length === 0 && (
            <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>
              Không có cuộc đua sắp/đang diễn ra để duyệt.
            </span>
          )}
        </label>
      </Panel>

      {error && <div className="form-banner form-banner-error">{error}</div>}

      {raceId && (
        <>
          <div className="metric-grid three">
            <MetricCard label="Số ngựa" value={String(checks.length)} note="Tham gia cuộc đua" />
            <MetricCard label="Đã duyệt thú y" value={`${vetDone}/${checks.length}`} note="Đã kiểm tra thú y" tone={vetDone === checks.length && checks.length > 0 ? "success" : "warning"} />
            <MetricCard label="Đã xác nhận xuất phát" value={`${lineupDone}/${checks.length}`} note="Đã xác nhận đội hình" tone={lineupDone === checks.length && checks.length > 0 ? "success" : "warning"} />
          </div>

          <Panel title="Checklist từng ngựa" subtitle="Bấm để bật/tắt từng mục">
            {loading ? (
              <p style={{ color: "var(--c-muted)", fontSize: "0.875rem" }}>Đang tải…</p>
            ) : (
              <DataTable
                columns={[
                  { key: "laneNumber", label: "Lane", render: (r) => `#${r.laneNumber}` },
                  { key: "clothNumber", label: "Áo số", render: (r) => r.clothNumber ? `#${r.clothNumber}` : "—" },
                  { key: "horseName", label: "Ngựa" },
                  { key: "jockeyName", label: "Nài ngựa" },
                  { key: "ownerName", label: "Chủ ngựa", render: (r) => r.ownerName ?? "—" },
                  {
                    key: "vetApproved",
                    label: "Thú y",
                    render: (r) => (
                      <button
                        type="button"
                        className={cn("table-button", r.vetApproved && "is-complete")}
                        disabled={busy === `${r.horseId}-vetApprovedAt`}
                        onClick={() => toggle(r.horseId, "vetApprovedAt")}
                      >
                        {r.vetApproved ? "✓ Đã duyệt" : "Duyệt"}
                      </button>
                    ),
                  },
                  {
                    key: "confirmed",
                    label: "Xuất phát",
                    render: (r) => (
                      <button
                        type="button"
                        className={cn("table-button", r.confirmed && "is-complete")}
                        disabled={busy === `${r.horseId}-confirmedAt`}
                        onClick={() => toggle(r.horseId, "confirmedAt")}
                      >
                        {r.confirmed ? "✓ Đã xác nhận" : "Xác nhận"}
                      </button>
                    ),
                  },
                  {
                    key: "horseId",
                    label: "Trạng thái",
                    render: (r) =>
                      r.vetApproved && r.confirmed
                        ? <Badge tone="success">Sẵn sàng</Badge>
                        : <Badge tone="warning">Chưa đủ</Badge>,
                  },
                ]}
                rows={checks.map((c) => ({ ...c, id: c.horseId }))}
                empty="Cuộc đua chưa có ngựa nào."
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
