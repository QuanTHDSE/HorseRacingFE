import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

type RegFilter = "all" | "Pending" | "Approved" | "Rejected";

const STATUS_TONE: Record<string, string> = {
  Pending:  "warning",
  Approved: "success",
  Rejected: "danger",
};

const RACE_STATUS_TONE: Record<string, string> = {
  Upcoming:  "accent",
  Live:      "success",
  Completed: "neutral",
  Cancelled: "danger",
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function OwnerSchedulePage() {
  const { appState, handleRegisterForRace, handleCancelRegistration } = useApp();

  // Registration form
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedRace, setSelectedRace]             = useState("");
  const [selectedHorse, setSelectedHorse]           = useState("");
  const [regLoading, setRegLoading]                 = useState(false);
  const [regError, setRegError]                     = useState("");
  const [regSuccess, setRegSuccess]                 = useState("");

  // List filter
  const [filter, setFilter] = useState<RegFilter>("all");

  // Cancel in progress
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError]   = useState("");

  const horses      = appState.horses;
  const tournaments = appState.tournaments;
  const regs        = appState.ownerRegistrations;

  const racesForTournament = selectedTournament
    ? appState.races.filter((r) => r.tournamentId === selectedTournament && (r.liveStatus === "Upcoming" || r.liveStatus === "Live"))
    : [];

  const fitHorses = horses.filter((h) => h.health === "Fit");

  const filtered = filter === "all" ? regs : regs.filter((r) => r.status === filter);

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRace)  { setRegError("Please select a race.");  return; }
    if (!selectedHorse) { setRegError("Please select a horse."); return; }
    setRegError("");
    setRegLoading(true);
    try {
      await handleRegisterForRace(selectedRace, selectedHorse);
      setSelectedRace("");
      setSelectedHorse("");
      setSelectedTournament("");
      setRegSuccess("Registration submitted! Once the admin approves your horse, hire a jockey on the Jockeys page.");
      setTimeout(() => setRegSuccess(""), 5000);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  }

  async function doCancel(id: string) {
    setCancellingId(id);
    setCancelError("");
    try {
      await handleCancelRegistration(id);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page-stack">
      {/* ── Register form ── */}
      <Panel title="Register for a race" subtitle="Enter your horse in an upcoming race">
        {regSuccess && <div className="form-banner form-banner-success">{regSuccess}</div>}
        {regError   && <div className="form-banner form-banner-error">{regError}</div>}
        <form onSubmit={doRegister} className="admin-form">
          <div className="form-grid-2">
            <label className="field">
              <span>Tournament</span>
              <select
                value={selectedTournament}
                onChange={(e) => { setSelectedTournament(e.target.value); setSelectedRace(""); }}
                disabled={regLoading}
              >
                <option value="">— Select tournament —</option>
                {tournaments.filter((t) => t.status === "Registration" || t.status === "Live").map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Race <span className="required">*</span></span>
              <select
                value={selectedRace}
                onChange={(e) => setSelectedRace(e.target.value)}
                disabled={!selectedTournament || regLoading}
              >
                <option value="">— Select race —</option>
                {racesForTournament.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {fmtDate(r.date)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Horse <span className="required">*</span></span>
              <select
                value={selectedHorse}
                onChange={(e) => setSelectedHorse(e.target.value)}
                disabled={regLoading}
              >
                <option value="">— Select horse —</option>
                {fitHorses.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.breed})</option>
                ))}
              </select>
            </label>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 12px" }}>
            Flow: register → admin approves your horse → hire a jockey on the <strong>Jockeys</strong> page → jockey accepts.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={regLoading}
              onClick={() => { setSelectedTournament(""); setSelectedRace(""); setSelectedHorse(""); setRegError(""); }}
            >
              Clear
            </button>
            <button type="submit" className="primary-button" disabled={regLoading}>
              {regLoading ? "Submitting…" : "Submit registration"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Registration list ── */}
      <Panel
        title="My race registrations"
        subtitle={`${filtered.length} of ${regs.length} registrations`}
        action={
          <div className="filter-tabs">
            {(["all", "Pending", "Approved", "Rejected"] as RegFilter[]).map((f) => (
              <button key={f} type="button" className={cn("filter-tab", filter === f && "is-active")} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        }
      >
        {cancelError && <div className="form-banner form-banner-error" style={{ marginBottom: "10px" }}>{cancelError}</div>}
        <DataTable
          columns={[
            { key: "raceName",  label: "Race"  },
            { key: "horseName", label: "Horse" },
            { key: "raceDate",  label: "Date",        render: (row) => fmtDate(row.raceDate)    },
            {
              key: "raceStatus",
              label: "Race status",
              render: (row) => (
                <Badge tone={RACE_STATUS_TONE[row.raceStatus ?? ""] as any ?? "neutral"}>
                  {row.raceStatus ?? "—"}
                </Badge>
              ),
            },
            {
              key: "jockeyName",
              label: "Jockey",
              render: (row) => row.jockeyName ?? <span style={{ color: "var(--text-muted)" }}>Not assigned</span>,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any ?? "neutral"}>{row.status}</Badge>
              ),
            },
            {
              key: "id",
              label: "Action",
              render: (row) =>
                row.status === "Pending" ? (
                  <button
                    type="button"
                    className="table-button is-danger"
                    disabled={cancellingId === row.id}
                    onClick={() => doCancel(row.id)}
                  >
                    {cancellingId === row.id ? "…" : "Cancel"}
                  </button>
                ) : (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                ),
            },
          ]}
          rows={filtered}
          empty="No registrations found."
        />
      </Panel>
    </div>
  );
}
