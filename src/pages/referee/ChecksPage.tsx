import { useEffect, useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { RefereeParticipantCheck } from "../../types";
import { cn } from "../../utils/cn";
import { viHealth, viRaceStatus } from "../../utils/viLabels";

const HEALTH_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Fit: "success",
  Injured: "warning",
  Retired: "neutral",
};

export default function ChecksPage() {
  const { appState, handleGetRefereeChecks, handleToggleRefereeCheck } = useApp();

  const races = appState.refereeRaces;
  // Pre-race checks are meaningful before/at race time
  const eligible = races.filter((r) => r.liveStatus === "Upcoming" || r.liveStatus === "Live");

  const [raceId, setRaceId] = useState("");
  const [checks, setChecks] = useState<RefereeParticipantCheck[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const error = ""; const setError = fb.error;
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!raceId) { setChecks([]); setSelectedHorseId(null); return; }
    let alive = true;
    setSelectedHorseId(null);
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
  const selected = checks.find((c) => c.horseId === selectedHorseId) ?? null;

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
                  { key: "ownerName", label: "Chủ ngựa", render: (r) => r.ownerName ?? "Chưa có dữ liệu" },
                  {
                    key: "horseDetail",
                    label: "Hồ sơ",
                    render: (r) => (
                      <button
                        type="button"
                        className={cn("secondary-button", "btn-xs", selectedHorseId === r.horseId && "is-active")}
                        onClick={() => setSelectedHorseId((current) => current === r.horseId ? null : r.horseId)}
                      >
                        {selectedHorseId === r.horseId ? "Đóng" : "Xem chi tiết"}
                      </button>
                    ),
                  },
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
                    key: "checkStatus",
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

          {selected && (
            <Panel
              title={`Hồ sơ kiểm tra — ${selected.horseName}`}
              subtitle="Thông tin ngựa, chủ ngựa và hồ sơ phục vụ quyết định trước cuộc đua"
              action={
                <button type="button" className="secondary-button btn-xs" onClick={() => setSelectedHorseId(null)}>
                  Đóng
                </button>
              }
            >
              <div className="detail-body">
                {selected.horseImageUrl && (
                  <img
                    src={selected.horseImageUrl}
                    alt={selected.horseName}
                    style={{ width: "100%", height: "280px", objectFit: "contain", borderRadius: "8px", background: "var(--c-surf-low)" }}
                  />
                )}

                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Chủ ngựa</span>
                    <strong>{selected.ownerName ?? "Chưa có dữ liệu"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Mã đăng ký</span>
                    <strong>{selected.horseRegistrationId ?? "—"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Giống / Tuổi</span>
                    <strong>
                      {selected.horseBreed ?? "—"}
                      {selected.horseAge ? ` · ${selected.horseAge} tuổi` : ""}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Sức khỏe</span>
                    <span>
                      {selected.horseHealth
                        ? <Badge tone={HEALTH_TONE[selected.horseHealth] ?? "neutral"}>{viHealth(selected.horseHealth)}</Badge>
                        : "—"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Màu lông / Cân nặng</span>
                    <strong>
                      {selected.horseColor ?? "—"}
                      {selected.horseWeight ? ` · ${selected.horseWeight} kg` : ""}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Huấn luyện viên</span>
                    <strong>{selected.horseTrainerName ?? "—"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Nài ngựa</span>
                    <strong>{selected.jockeyName || "—"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Vị trí thi đấu</span>
                    <strong>Làn #{selected.laneNumber} · Áo #{selected.clothNumber ?? "—"}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Hồ sơ ngựa (PDF)</span>
                    {selected.horseProfilePdfUrl ? (
                      <a
                        className="secondary-button btn-xs"
                        href={selected.horseProfilePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selected.horseProfilePdfName || "Mở hồ sơ PDF"}
                      </a>
                    ) : (
                      <span style={{ color: "var(--c-muted)" }}>Chưa có hồ sơ</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Cuộc đua</span>
                    <strong>{selected.raceName}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Trạng thái kiểm tra</span>
                    <span>
                      {selected.vetApproved && selected.confirmed
                        ? <Badge tone="success">Đủ điều kiện thi đấu</Badge>
                        : <Badge tone="warning">Chưa hoàn tất</Badge>}
                    </span>
                  </div>
                </div>

                <div className="detail-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block" }}>Quyết định trước cuộc đua</strong>
                    <span className="detail-action-hint">Kiểm tra hồ sơ và thể trạng trước khi xác nhận ngựa xuất phát.</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={cn("table-button", selected.vetApproved && "is-complete")}
                      disabled={busy === `${selected.horseId}-vetApprovedAt`}
                      onClick={() => toggle(selected.horseId, "vetApprovedAt")}
                    >
                      {selected.vetApproved ? "Bỏ duyệt thú y" : "Duyệt thú y"}
                    </button>
                    <button
                      type="button"
                      className={cn("primary-button", "btn-xs", selected.confirmed && "is-complete")}
                      disabled={busy === `${selected.horseId}-confirmedAt`}
                      onClick={() => toggle(selected.horseId, "confirmedAt")}
                    >
                      {selected.confirmed ? "Hủy xác nhận xuất phát" : "Xác nhận đủ điều kiện đua"}
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
