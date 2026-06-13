import { useEffect, useRef, useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";

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
  const [invError, setInvError]             = useState("");
  const [invSuccess, setInvSuccess]         = useState("");

  const regs = appState.ownerRegistrations;

  // Eligible to invite: registrations the admin has APPROVED that don't have a jockey yet.
  // (Owner hires a jockey only after the horse entry is approved.)
  const eligibleRegs = regs.filter((r) => r.status === "Approved" && !r.jockeyId);

  // Registrations that already have a jockey assigned (invitation accepted)
  const withJockey = regs.filter((r) => r.jockeyName);

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
    if (!registrationId)  { setInvError("Please select a race registration."); return; }
    if (!selectedJockey)  { setInvError("Please search and select a jockey."); return; }
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
      setInvSuccess("Invitation sent! Once the jockey accepts, the entry is complete and added to the race line-up.");
      setTimeout(() => setInvSuccess(""), 6000);
    } catch (err: unknown) {
      setInvError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setInvLoading(false);
    }
  }

  return (
    <div className="page-stack">
      {/* ── Invite form ── */}
      <Panel title="Invite a jockey" subtitle="Search by name and send a ride invitation">
        {invSuccess && <div className="form-banner form-banner-success">{invSuccess}</div>}
        {invError   && <div className="form-banner form-banner-error">{invError}</div>}

        <form onSubmit={doInvite} className="admin-form">
          <div className="form-grid-2">
            {/* Registration select */}
            <label className="field">
              <span>Race registration <span className="required">*</span></span>
              <select
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
                disabled={invLoading}
              >
                <option value="">— Select registration —</option>
                {eligibleRegs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.horseName} → {r.raceName} ({r.status})
                  </option>
                ))}
              </select>
              {eligibleRegs.length === 0 && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  No approved registrations awaiting a jockey. The admin must approve your horse entry first.
                </span>
              )}
            </label>

            {/* Jockey search */}
            <div className="field">
              <span style={{ display: "block", marginBottom: "4px", fontSize: "0.875rem", fontWeight: 500 }}>
                Jockey <span className="required">*</span>
              </span>
              <div style={{ position: "relative" }}>
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedJockey) setSelectedJockey(null);
                  }}
                  placeholder="Type jockey name to search…"
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
                    No jockeys found for "{searchQuery}"
                  </div>
                )}
              </div>
              {/* Selected badge */}
              {selectedJockey && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                  <Badge tone="success">Selected: {selectedJockey.fullName}</Badge>
                  <button
                    type="button"
                    onClick={clearJockeySelection}
                    style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ✕ Change
                  </button>
                </div>
              )}
              {searching && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Searching…
                </span>
              )}
            </div>

            {/* Message */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Message (optional)</span>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. We'd love to have you race Thunder Echo at the Spring Cup."
                disabled={invLoading}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          {selectedReg && selectedJockey && (
            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "12px" }}>
              Inviting <strong>{selectedJockey.fullName}</strong> to ride{" "}
              <em>{selectedReg.horseName}</em> in <em>{selectedReg.raceName}</em>
            </div>
          )}

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
            Once the jockey accepts, your horse + jockey are added to the race line-up and the entry is complete.
          </p>

          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={invLoading}
              onClick={() => { setRegistrationId(""); setMessage(""); clearJockeySelection(); setInvError(""); }}>
              Clear
            </button>
            <button type="submit" className="primary-button" disabled={invLoading || !registrationId || !selectedJockey}>
              {invLoading ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Assigned jockeys ── */}
      <Panel
        title="Assigned jockeys"
        subtitle="Registrations where a jockey accepted the invitation"
      >
        {withJockey.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No jockeys assigned yet.</p>
        ) : (
          <DataTable
            columns={[
              { key: "raceName",   label: "Race"   },
              { key: "horseName",  label: "Horse"  },
              { key: "jockeyName", label: "Jockey", render: (row) => row.jockeyName ?? "—" },
              {
                key: "status",
                label: "Registration",
                render: (row) => (
                  <Badge tone={STATUS_TONE[row.status] as any ?? "neutral"}>{row.status}</Badge>
                ),
              },
            ]}
            rows={withJockey}
          />
        )}
      </Panel>

      {/* ── All registrations summary ── */}
      <Panel title="All registrations" subtitle="Complete list of race entries and their jockey status">
        <DataTable
          columns={[
            { key: "raceName",   label: "Race"   },
            { key: "horseName",  label: "Horse"  },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any ?? "neutral"}>{row.status}</Badge>
              ),
            },
            {
              key: "jockeyName",
              label: "Jockey",
              render: (row) => row.jockeyName
                ? <span style={{ color: "var(--text-success)" }}>{row.jockeyName}</span>
                : <span style={{ color: "var(--text-muted)" }}>Not assigned</span>,
            },
          ]}
          rows={regs}
          empty="No registrations yet."
        />
      </Panel>
    </div>
  );
}
