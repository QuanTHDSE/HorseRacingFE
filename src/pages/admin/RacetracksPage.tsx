import { useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import type { TrackSurface } from "../../types";

const SURFACE_LABEL: Record<TrackSurface, string> = {
  turf: "Turf (cỏ)", synthetic: "Synthetic (tổng hợp)", dirt: "Dirt (đất)",
};

const EMPTY_FORM = {
  name: "",
  location: "",
  countryCode: "VN",
  surface: "turf" as TrackSurface,
  isActive: true,
};

export default function RacetracksPage() {
  const { appState, handleCreateRacetrack } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const racetracks = appState.racetracks ?? [];

  function handleField(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())        errs.push("Track name is required.");
    if (!form.location.trim())    errs.push("Location is required.");
    if (!form.countryCode.trim()) errs.push("Country code is required.");
    if (errs.length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await handleCreateRacetrack({
        name: form.name.trim(),
        location: form.location.trim(),
        countryCode: form.countryCode.trim().toUpperCase(),
        surface: form.surface,
        isActive: form.isActive,
      });
      setForm(EMPTY_FORM);
      setSuccessMsg("Racetrack added successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Failed to create racetrack."]);
    } finally {
      setLoading(false);
    }
  }

  const activeCount   = racetracks.filter((t) => t.isActive).length;
  const inactiveCount = racetracks.filter((t) => !t.isActive).length;

  return (
    <div className="page-stack">
      {/* ── Stats ── */}
      <div className="metric-grid three">
        <MetricCard label="Total racetracks" value={String(racetracks.length)} note="Registered in the system" />
        <MetricCard label="Active tracks"     value={String(activeCount)}   note="Có thể gán cho cuộc đua" tone="success" />
        <MetricCard label="Inactive"          value={String(inactiveCount)} note="Đang ngừng hoạt động"    tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Add new racetrack" subtitle="Khai báo một trường đua để gán cho các cuộc đua">
        {successMsg && <div className="form-banner form-banner-success">{successMsg}</div>}
        {errors.length > 0 && (
          <div className="form-banner form-banner-error">
            {errors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field">
              <span>Track name <span className="required">*</span></span>
              <input value={form.name} onChange={(e) => handleField("name", e.target.value)} placeholder="e.g. Phú Thọ Racecourse" disabled={loading} />
            </label>
            <label className="field">
              <span>Location <span className="required">*</span></span>
              <input value={form.location} onChange={(e) => handleField("location", e.target.value)} placeholder="e.g. TP. Hồ Chí Minh" disabled={loading} />
            </label>
            <label className="field">
              <span>Country code <span className="required">*</span></span>
              <input value={form.countryCode} onChange={(e) => handleField("countryCode", e.target.value)} placeholder="VN" maxLength={3} disabled={loading} />
            </label>
            <label className="field">
              <span>Default surface</span>
              <select value={form.surface} onChange={(e) => handleField("surface", e.target.value)} disabled={loading}>
                <option value="turf">Turf (cỏ)</option>
                <option value="synthetic">Synthetic (tổng hợp)</option>
                <option value="dirt">Dirt (đất)</option>
              </select>
            </label>
            <label className="pc-switch" style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => handleField("isActive", e.target.checked)} disabled={loading} />
              <span className="pc-track" />
              <span className="pc-switch-text">Đang hoạt động (cho phép gán vào cuộc đua)</span>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button" disabled={loading} onClick={() => { setForm(EMPTY_FORM); setErrors([]); }}>
              Reset
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Saving…" : "Add racetrack"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Directory ── */}
      <Panel title="Racetrack directory" subtitle="All registered venues and their current status">
        <DataTable
          columns={[
            { key: "name",        label: "Track name" },
            { key: "location",    label: "Location"   },
            { key: "countryCode", label: "Country"    },
            { key: "surface",     label: "Surface", render: (row) => SURFACE_LABEL[row.surface] ?? row.surface },
            {
              key: "isActive",
              label: "Status",
              render: (row) => <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>,
            },
          ]}
          rows={racetracks}
          empty="No racetracks registered yet."
        />
      </Panel>
    </div>
  );
}
