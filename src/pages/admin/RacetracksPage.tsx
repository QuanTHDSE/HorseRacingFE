import { useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { RacetrackSurface, RacetrackStatus } from "../../types";

const EMPTY_FORM = {
  name: "",
  location: "",
  surface: "Grass" as RacetrackSurface,
  length: "",
  capacity: 0,
  status: "Active" as RacetrackStatus,
};

export default function RacetracksPage() {
  const { appState, handleCreateRacetrack } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const racetracks = appState.racetracks ?? [];

  function handleField(field: keyof typeof EMPTY_FORM, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())     errs.push("Track name is required.");
    if (!form.location.trim()) errs.push("Location is required.");
    if (!form.length.trim())   errs.push("Track length is required.");
    if (form.capacity <= 0)    errs.push("Capacity must be greater than 0.");
    if (errs.length) { setErrors(errs); return; }

    handleCreateRacetrack(form);
    setForm(EMPTY_FORM);
    setSuccessMsg("Racetrack added successfully!");
    setTimeout(() => setSuccessMsg(""), 3500);
  }

  const activeCount      = racetracks.filter((t) => t.status === "Active").length;
  const maintenanceCount = racetracks.filter((t) => t.status === "Maintenance").length;

  return (
    <div className="page-stack">

      {/* ── Stats ── */}
      <div className="metric-grid three">
        <MetricCard label="Total racetracks"      value={String(racetracks.length)} note="Registered in the system" />
        <MetricCard label="Active tracks"          value={String(activeCount)}       note="Ready to host races"           tone="success" />
        <MetricCard label="Under maintenance"      value={String(maintenanceCount)}  note="Temporarily unavailable"       tone="warning" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Add new racetrack" subtitle="Fill in all required fields to register a new venue">

        {successMsg && (
          <div className="form-banner form-banner-success">{successMsg}</div>
        )}
        {errors.length > 0 && (
          <div className="form-banner form-banner-error">
            {errors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field">
              <span>Track name <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="e.g. Central Track"
              />
            </label>
            <label className="field">
              <span>Location <span className="required">*</span></span>
              <input
                value={form.location}
                onChange={(e) => handleField("location", e.target.value)}
                placeholder="e.g. Ho Chi Minh City"
              />
            </label>
            <label className="field">
              <span>Surface type</span>
              <select
                value={form.surface}
                onChange={(e) => handleField("surface", e.target.value)}
              >
                <option value="Grass">Grass</option>
                <option value="Dirt">Dirt</option>
                <option value="Synthetic">Synthetic</option>
              </select>
            </label>
            <label className="field">
              <span>Track length <span className="required">*</span></span>
              <input
                value={form.length}
                onChange={(e) => handleField("length", e.target.value)}
                placeholder="e.g. 1800m"
              />
            </label>
            <label className="field">
              <span>Seating capacity <span className="required">*</span></span>
              <input
                type="number"
                min={1}
                value={form.capacity || ""}
                onChange={(e) => handleField("capacity", Number(e.target.value))}
                placeholder="e.g. 8000"
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => handleField("status", e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
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
              Add racetrack
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Directory ── */}
      <Panel title="Racetrack directory" subtitle="All registered venues and their current status">
        <DataTable
          columns={[
            { key: "name",     label: "Track name" },
            { key: "location", label: "Location"   },
            { key: "surface",  label: "Surface"    },
            { key: "length",   label: "Length"     },
            {
              key: "capacity",
              label: "Capacity",
              render: (row) => row.capacity.toLocaleString(),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge
                  tone={
                    row.status === "Active"      ? "success" :
                    row.status === "Maintenance" ? "warning" : "neutral"
                  }
                >
                  {row.status}
                </Badge>
              ),
            },
          ]}
          rows={racetracks}
          empty="No racetracks registered yet."
        />
      </Panel>

    </div>
  );
}
