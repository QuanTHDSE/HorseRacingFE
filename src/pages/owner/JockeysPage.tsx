import { useEffect, useRef, useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import { api } from "../../services/api";
import { viRegStatus } from "../../utils/viLabels";

const STATUS_TONE: Record<string, string> = {
  Pending:  "warning",
  Approved: "success",
  Rejected: "danger",
};

interface JockeyResult {
  id: string;
  fullName: string;
  licenseNumber?: string;
}

export default function JockeysPage() {
  const { appState, handleInviteJockey } = useApp();

  // Search state
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<JockeyResult[]>([]);
  const [searching, setSearching]           = useState(false);
  const [selectedJockey, setSelectedJockey] = useState<JockeyResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite form
  const [registrationId, setRegistrationId] = useState("");
  const [message, setMessage]               = useState("");
  const [invLoading, setInvLoading]         = useState(false);
  const fb = useFeedback();
  const invError: string = ""; const setInvError = fb.error;
  const invSuccess: string = ""; const setInvSuccess = fb.success;

  const regs = appState.ownerRegistrations;

  // Eligible to invite: registrations the admin has APPROVED that don't have a jockey yet.
  // (Owner hires a jockey only after the horse entry is approved.)
  const eligibleRegs = regs.filter((r) => r.status === "Approved" && !r.jockeyId);

  const selectedReg = regs.find((r) => r.id === registrationId);

  // Debounced jockey search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || selectedJockey) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.horseOwner.searchJockeys(searchQuery.trim());
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedJockey]);

  function selectJockey(j: JockeyResult) {
    setSelectedJockey(j);
    setSearchQuery(j.fullName);
    setSearchResults([]);
  }

  function clearJockeySelection() {
    setSelectedJockey(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function doInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!registrationId)  { setInvError("Vui lòng chọn một đơn đăng ký cuộc đua."); return; }
    if (!selectedJockey)  { setInvError("Vui lòng tìm và chọn một nài ngựa."); return; }
    setInvError("");
    setInvLoading(true);
    try {
      await handleInviteJockey(
        selectedReg!.raceId,
        selectedReg!.horseId,
        selectedJockey.id,
        message.trim() || undefined,
      );
      setRegistrationId("");
      setMessage("");
      clearJockeySelection();
      setInvSuccess("Đã gửi lời mời! Khi nài chấp nhận, suất đua hoàn tất và được thêm vào danh sách thi đấu.");
      setTimeout(() => setInvSuccess(""), 6000);
    } catch (err: unknown) {
      setInvError(err instanceof Error ? err.message : "Gửi lời mời thất bại.");
    } finally {
      setInvLoading(false);
    }
  }

  return (
    <div className="page-stack">
      {/* ── Invite form ── */}
      <Panel title="Mời nài ngựa" subtitle="Tìm theo tên và gửi lời mời cưỡi ngựa">
        {invSuccess && <div className="form-banner form-banner-success">{invSuccess}</div>}
        {invError   && <div className="form-banner form-banner-error">{invError}</div>}

        <form onSubmit={doInvite} className="admin-form">
          <div className="form-grid-2">
            {/* Registration select */}
            <label className="field">
              <span>Đơn đăng ký cuộc đua <span className="required">*</span></span>
              <select
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
                disabled={invLoading}
              >
                <option value="">— Chọn đơn đăng ký —</option>
                {eligibleRegs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.horseName} → {r.raceName} ({viRegStatus(r.status)})
                  </option>
                ))}
              </select>
              {eligibleRegs.length === 0 && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Không có đơn đã duyệt nào đang chờ nài. Admin phải duyệt suất đua của ngựa trước.
                </span>
              )}
            </label>

            {/* Jockey search */}
            <div className="field">
              <span style={{ display: "block", marginBottom: "4px", fontSize: "0.875rem", fontWeight: 500 }}>
                Nài ngựa <span className="required">*</span>
              </span>
              <div style={{ position: "relative" }}>
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedJockey) setSelectedJockey(null);
                  }}
                  placeholder="Gõ tên nài ngựa để tìm…"
                  disabled={invLoading}
                  autoComplete="off"
                />
                {/* Search dropdown */}
                {searchResults.length > 0 && !selectedJockey && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    zIndex: 20,
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  }}>
                    {searchResults.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => selectJockey(j)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                          fontSize: "0.875rem",
                          color: "var(--text-primary)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <strong>{j.fullName}</strong>
                        {j.licenseNumber && (
                          <span style={{ marginLeft: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            #{j.licenseNumber}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {/* No results */}
                {!searching && searchQuery.trim().length > 1 && searchResults.length === 0 && !selectedJockey && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    padding: "10px 14px",
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    zIndex: 20,
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  }}>
                    Không tìm thấy nài nào cho "{searchQuery}"
                  </div>
                )}
              </div>
              {/* Selected badge */}
              {selectedJockey && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                  <Badge tone="success">Đã chọn: {selectedJockey.fullName}</Badge>
                  <button
                    type="button"
                    onClick={clearJockeySelection}
                    style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ✕ Đổi
                  </button>
                </div>
              )}
              {searching && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Đang tìm…
                </span>
              )}
            </div>

            {/* Message */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Lời nhắn (không bắt buộc)</span>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="vd: Rất mong bạn cưỡi Tia Chớp tại Cúp Mùa Xuân."
                disabled={invLoading}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          {selectedReg && selectedJockey && (
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px" }}>
              Đang mời <strong>{selectedJockey.fullName}</strong> cưỡi{" "}
              <em>{selectedReg.horseName}</em> trong <em>{selectedReg.raceName}</em>
            </div>
          )}

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
            Khi nài chấp nhận, ngựa + nài của bạn được thêm vào danh sách thi đấu và suất đua hoàn tất.
          </p>

          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={invLoading}
              onClick={() => { setRegistrationId(""); setMessage(""); clearJockeySelection(); setInvError(""); }}>
              Xóa
            </button>
            <button type="submit" className="primary-button" disabled={invLoading || !registrationId || !selectedJockey}>
              {invLoading ? "Đang gửi…" : "Gửi lời mời"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── All registrations summary ── */}
      <Panel title="Tất cả đăng ký" subtitle="Danh sách đầy đủ các suất đua và trạng thái nài ngựa">
        <DataTable
          columns={[
            { key: "raceName",   label: "Cuộc đua" },
            { key: "horseName",  label: "Ngựa"     },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any ?? "neutral"}>{viRegStatus(row.status)}</Badge>
              ),
            },
            {
              key: "jockeyName",
              label: "Nài ngựa",
              render: (row) => row.jockeyName
                ? <span style={{ color: "var(--text-success)" }}>{row.jockeyName}</span>
                : <span style={{ color: "var(--text-muted)" }}>Chưa phân công</span>,
            },
          ]}
          rows={regs}
          empty="Chưa có đăng ký nào."
        />
      </Panel>
    </div>
  );
}
