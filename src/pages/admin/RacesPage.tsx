import { useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

const EMPTY_FORM = {
  name: "",
  tournamentId: "",
  racetrackId: "",
  date: "",
  distance: "",
  round: "Registration",
};

export default function RacesPage() {
  const { appState, handleCreateRace } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const racetracks = appState.racetracks ?? [];
  const races      = appState.races ?? [];

  function handleField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())        errs.push("Race name is required.");
    if (!form.tournamentId)       errs.push("Please select a tournament.");
    if (!form.racetrackId)        errs.push("Please select a racetrack.");
    if (!form.date.trim())        errs.push("Race date is required.");
    if (!form.distance.trim())    errs.push("Distance is required.");
    if (errs.length) { setErrors(errs); return; }

    handleCreateRace(form);
    setForm(EMPTY_FORM);
    setSuccessMsg("Race created successfully!");
    setTimeout(() => setSuccessMsg(""), 3500);
  }

  const upcomingCount = races.filter((r) => r.liveStatus === "Upcoming").length;
  const liveCount     = races.filter((r) => r.liveStatus === "Live").length;
  const draftCount    = races.filter((r) => r.liveStatus === "Draft").length;

  return (
    <div className="page-stack">

      {/* ── Stats ── */}
      <div className="metric-grid four">
        <MetricCard label="Total races"    value={String(races.length)}    note="All races in the system" />
        <MetricCard label="Live now"        value={String(liveCount)}       note="Currently in progress"   tone="success" />
        <MetricCard label="Upcoming"        value={String(upcomingCount)}   note="Confirmed and scheduled" tone="accent"  />
        <MetricCard label="Draft"           value={String(draftCount)}      note="Awaiting confirmation"   tone="warning" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Create new race" subtitle="Set up a new race within an existing tournament">

        {successMsg && (
          <div className="form-banner form-banner-success">{successMsg}</div>
        )}
        {errors.length > 0 && (
          <div className="form-banner form-banner-error">
            {errors.map((err, i) => <span key={i} style={{ display: "block" }}>{err}</span>)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Race name <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="e.g. Race 07 — Golden Sprint"
              />
            </label>
            <label className="field">
              <span>Tournament <span className="required">*</span></span>
              <select
                value={form.tournamentId}
                onChange={(e) => handleField("tournamentId", e.target.value)}
              >
                <option value="">— Select tournament —</option>
                {appState.tournaments.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Racetrack <span className="required">*</span></span>
              <select
                value={form.racetrackId}
                onChange={(e) => handleField("racetrackId", e.target.value)}
              >
                <option value="">— Select racetrack —</option>
                {racetracks.filter((t) => t.status === "Active").map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.location}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Race date & time <span className="required">*</span></span>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => handleField("date", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Distance <span className="required">*</span></span>
              <input
                value={form.distance}
                onChange={(e) => handleField("distance", e.target.value)}
                placeholder="e.g. 1800m"
              />
            </label>
            <label className="field">
              <span>Round</span>
              <select
                value={form.round}
                onChange={(e) => handleField("round", e.target.value)}
              >
                <option value="Registration">Registration</option>
                <option value="Quarter-final">Quarter-final</option>
                <option value="Semi-final">Semi-final</option>
                <option value="Final">Final</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setForm(EMPTY_FORM); setErrors([]); }}
            >
              Reset
            </button>
            <button type="submit" className="primary-button">
              Create race
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Race schedule table ── */}
      <Panel title="Race schedule" subtitle="All races across all tournaments">
        <DataTable
          columns={[
            { key: "name",     label: "Race"       },
            { key: "track",    label: "Track"      },
            { key: "date",     label: "Date"       },
            { key: "distance", label: "Distance"   },
            { key: "round",    label: "Round"      },
            {
              key: "liveStatus",
              label: "Status",
              render: (row) => (
                <Badge
                  tone={
                    row.liveStatus === "Live"     ? "success" :
                    row.liveStatus === "Upcoming" ? "accent"  :
                    row.liveStatus === "Draft"    ? "warning" : "neutral"
                  }
                >
                  {row.liveStatus}
                </Badge>
              ),
            },
            {
              key: "ownerConfirmed",
              label: "Owner",
              render: (row) => (
                <Badge tone={row.ownerConfirmed ? "success" : "warning"}>
                  {row.ownerConfirmed ? "Confirmed" : "Pending"}
                </Badge>
              ),
            },
          ]}
          rows={races}
          empty="No races created yet."
        />
      </Panel>

    </div>
  );
}
