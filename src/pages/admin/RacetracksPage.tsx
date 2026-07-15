import { useState } from "react";
import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { TrackSurface } from "../../types";

const SURFACE_LABEL: Record<TrackSurface, string> = {
  turf: "Cỏ", synthetic: "Tổng hợp", dirt: "Đất",
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
  const fb = useFeedback();
  const successMsg: string = ""; const setSuccessMsg = fb.success;
  const errors: string[] = []; const setErrors = (arr: string[]) => arr.forEach((e) => fb.error(e));
  const [loading, setLoading] = useState(false);

  const racetracks = appState.racetracks ?? [];

  function handleField(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.name.trim())        errs.push("Vui lòng nhập tên đường đua.");
    if (!form.location.trim())    errs.push("Vui lòng nhập địa điểm.");
    if (!form.countryCode.trim()) errs.push("Vui lòng nhập mã quốc gia.");
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
      setSuccessMsg("Đã thêm đường đua thành công!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Tạo đường đua thất bại."]);
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
        <MetricCard label="Tổng số đường đua" value={String(racetracks.length)} note="Đã đăng ký trong hệ thống" />
        <MetricCard label="Đang hoạt động"    value={String(activeCount)}   note="Có thể gán cho cuộc đua" tone="success" />
        <MetricCard label="Ngừng hoạt động"   value={String(inactiveCount)} note="Đang ngừng hoạt động"    tone="neutral" />
      </div>

      {/* ── Create form ── */}
      <Panel title="Thêm đường đua mới" subtitle="Khai báo một đường đua để gán cho các cuộc đua">
        {successMsg && <div className="form-banner form-banner-success">{successMsg}</div>}
        {errors.length > 0 && (
          <div className="form-banner form-banner-error">
            {errors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid-2">
            <label className="field">
              <span>Tên đường đua <span className="required">*</span></span>
              <input value={form.name} onChange={(e) => handleField("name", e.target.value)} placeholder="vd: Trường đua Phú Thọ" disabled={loading} />
            </label>
            <label className="field">
              <span>Địa điểm <span className="required">*</span></span>
              <input value={form.location} onChange={(e) => handleField("location", e.target.value)} placeholder="vd: TP. Hồ Chí Minh" disabled={loading} />
            </label>
            <label className="field">
              <span>Mã quốc gia <span className="required">*</span></span>
              <input value={form.countryCode} onChange={(e) => handleField("countryCode", e.target.value)} placeholder="VN" maxLength={3} disabled={loading} />
            </label>
            <label className="field">
              <span>Mặt đường mặc định</span>
              <select value={form.surface} onChange={(e) => handleField("surface", e.target.value)} disabled={loading}>
                <option value="turf">Cỏ</option>
                <option value="synthetic">Tổng hợp</option>
                <option value="dirt">Đất</option>
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
              Đặt lại
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Đang lưu…" : "Thêm đường đua"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Directory ── */}
      <Panel title="Danh mục đường đua" subtitle="Tất cả địa điểm đã đăng ký và trạng thái hiện tại">
        <DataTable
          columns={[
            { key: "name",        label: "Tên đường đua" },
            { key: "location",    label: "Địa điểm"      },
            { key: "countryCode", label: "Quốc gia"      },
            { key: "surface",     label: "Mặt đường", render: (row) => SURFACE_LABEL[row.surface] ?? row.surface },
            {
              key: "isActive",
              label: "Trạng thái",
              render: (row) => <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Hoạt động" : "Ngừng"}</Badge>,
            },
          ]}
          rows={racetracks}
          empty="Chưa đăng ký đường đua nào."
        />
      </Panel>
    </div>
  );
}
