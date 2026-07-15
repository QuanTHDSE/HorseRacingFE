import { useRef, useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { CreateHorseInput, Horse } from "../../types";
import { cn } from "../../utils/cn";
import { viHealth } from "../../utils/viLabels";

/** Reusable PDF uploader — uploads to BE and reports back { url, name }. */
function PdfUploadField({
  url,
  name,
  disabled,
  onUploaded,
  onClear,
}: {
  url?: string;
  name?: string;
  disabled?: boolean;
  onUploaded: (url: string, name: string) => void;
  onClear: () => void;
}) {
  const { handleUploadHorsePdf } = useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const fb = useFeedback();
  const err: string = ""; const setErr = fb.error;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng file
    if (!file) return;
    if (file.type !== "application/pdf") { setErr("Chỉ chấp nhận file PDF."); return; }
    setUploading(true);
    setErr("");
    try {
      const res = await handleUploadHorsePdf(file);
      onUploaded(res.url, res.name);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Tải lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="field" style={{ gridColumn: "1 / -1" }}>
      <span>Hồ sơ ngựa (PDF) — để admin xem &amp; duyệt</span>
      <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} disabled={disabled || uploading} />
      {uploading && <span style={{ fontSize: "0.78rem", color: "var(--c-muted)" }}>Đang tải lên…</span>}
      {err && <span style={{ fontSize: "0.78rem", color: "var(--c-danger)" }}>{err}</span>}
      {url && !uploading && (
        <span style={{ display: "inline-flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
          <a className="secondary-button btn-xs" href={url} target="_blank" rel="noreferrer">📄 {name || "Xem PDF"}</a>
          <button type="button" className="table-button is-danger" disabled={disabled} onClick={onClear}>Gỡ</button>
        </span>
      )}
    </label>
  );
}

type HealthFilter = "all" | "Fit" | "Injured" | "Retired";

const HEALTH_TONE: Record<string, string> = { Fit: "success", Injured: "warning", Retired: "neutral" };

// Các giống ngựa đua phổ biến để owner chọn thay vì tự gõ
const HORSE_BREEDS = [
  "Thoroughbred",
  "Arabian",
  "Anglo-Arabian",
  "Quarter Horse",
  "Standardbred",
  "Appaloosa",
  "Akhal-Teke",
  "Andalusian",
  "Warmblood",
  "Mustang",
  "Other",
];

const EMPTY_FORM: CreateHorseInput = {
  name: "",
  breed: "",
  age: 0,
  registrationId: "",
  weight: undefined,
  color: "",
  trainerName: "",
  profilePdfUrl: "",
  profilePdfName: "",
};

function ageNum(s: string): number { return Math.max(1, Math.min(30, parseInt(s, 10) || 1)); }

export default function HorsesPage() {
  const { appState, handleCreateHorse, handleUpdateHorse, handleDeleteHorse } = useApp();

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [cForm, setCForm] = useState<CreateHorseInput>(EMPTY_FORM);
  const [cLoading, setCLoading] = useState(false);
  const fb = useFeedback();
  const cErrors: string[] = []; const setCErrors = (arr: string[]) => arr.forEach((e) => fb.error(e));
  const cSuccess: string = ""; const setCSuccess = fb.success;

  // Edit panel
  const [editHorse, setEditHorse] = useState<Horse | null>(null);
  const [eForm, setEForm] = useState<Partial<CreateHorseInput>>({});
  const [eLoading, setELoading] = useState(false);
  const eMsg: string = "";
  const setEMsg = (m?: string) => {
    if (!m || !m.trim()) return;
    const low = m.toLowerCase();
    if (low.includes("fail") || low.includes("error")) fb.error(m); else fb.success(m);
  };

  // Filter
  const [filter, setFilter] = useState<HealthFilter>("all");

  const horses = appState.horses;
  const filtered = filter === "all" ? horses : horses.filter((h) => h.health === filter);

  const fitCount = horses.filter((h) => h.health === "Fit").length;
  const injuredCount = horses.filter((h) => h.health === "Injured").length;
  const retiredCount = horses.filter((h) => h.health === "Retired").length;

  // ── Create handlers ────────────────────────────────────────────────────────

  function cf(field: keyof CreateHorseInput, value: string | number | undefined) {
    setCForm((p) => ({ ...p, [field]: value }));
    setCErrors([]);
  }

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!cForm.name.trim()) errs.push("Name is required.");
    if (!cForm.breed.trim()) errs.push("Breed is required.");
    if (!cForm.age || cForm.age < 1) errs.push("Age must be at least 1.");
    if (errs.length) { setCErrors(errs); return; }

    setCLoading(true);
    try {
      await handleCreateHorse({
        name: cForm.name.trim(),
        breed: cForm.breed.trim(),
        age: Number(cForm.age),
        registrationId: cForm.registrationId?.trim() || undefined,
        weight: cForm.weight ? Number(cForm.weight) : undefined,
        color: cForm.color?.trim() || undefined,
        trainerName: cForm.trainerName?.trim() || undefined,
        profilePdfUrl: cForm.profilePdfUrl?.trim() || undefined,
        profilePdfName: cForm.profilePdfName?.trim() || undefined,
      });
      setCForm(EMPTY_FORM);
      setCSuccess("Horse registered successfully!");
      setShowCreate(false);
      setTimeout(() => setCSuccess(""), 4000);
    } catch (err: unknown) {
      setCErrors([err instanceof Error ? err.message : "Failed to register horse."]);
    } finally {
      setCLoading(false);
    }
  }

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function openEdit(h: Horse) {
    if (editHorse?.id === h.id) { setEditHorse(null); setEMsg(""); return; }
    setEditHorse(h);
    setEForm({
      name: h.name,
      breed: h.breed,
      age: h.age,
      color: h.color,
      weight: h.weight,
      trainerName: h.trainerName,
      profilePdfUrl: h.profilePdfUrl,
      profilePdfName: h.profilePdfName,
    });
    setEMsg("");
  }

  async function doEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editHorse) return;
    setELoading(true);
    setEMsg("");
    try {
      const payload: Partial<CreateHorseInput> = {};
      if (eForm.name?.trim()) payload.name = eForm.name.trim();
      if (eForm.breed?.trim()) payload.breed = eForm.breed.trim();
      if (eForm.age) payload.age = Number(eForm.age);
      if (eForm.color?.trim()) payload.color = eForm.color.trim();
      if (eForm.weight) payload.weight = Number(eForm.weight);
      if (eForm.trainerName?.trim()) payload.trainerName = eForm.trainerName.trim();
      if (eForm.profilePdfUrl !== undefined) payload.profilePdfUrl = eForm.profilePdfUrl.trim();
      if (eForm.profilePdfName !== undefined) payload.profilePdfName = eForm.profilePdfName.trim();

      await handleUpdateHorse(editHorse.id, payload);
      setEMsg("Horse updated!");
      setEditHorse(null);
    } catch (err: unknown) {
      setEMsg(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setELoading(false);
    }
  }

  return (
    <div className="page-stack">
      {/* ── Metrics ── */}
      <div className="metric-grid four">
        <MetricCard label="Tổng số ngựa" value={String(horses.length)} note="Trong chuồng của bạn" />
        <MetricCard label="Khỏe mạnh" value={String(fitCount)} note="Sẵn sàng thi đấu" tone="success" />
        <MetricCard label="Chấn thương" value={String(injuredCount)} note="Đang theo dõi" tone="warning" />
        <MetricCard label="Giải nghệ" value={String(retiredCount)} note="Không còn thi đấu" tone="neutral" />
      </div>

      {/* ── Create form (toggle) ── */}
      {cSuccess && <div className="form-banner form-banner-success">{cSuccess}</div>}
      <Panel
        title="Đăng ký ngựa mới"
        subtitle="Thêm một con ngựa mới vào chuồng của bạn"
        action={
          <button
            type="button"
            className={cn("secondary-button btn-xs", showCreate && "is-active")}
            onClick={() => { setShowCreate((v) => !v); setCErrors([]); setCForm(EMPTY_FORM); }}
          >
            {showCreate ? "Hủy" : "+ Ngựa mới"}
          </button>
        }
      >
        {showCreate && (
          <>
            {cErrors.length > 0 && (
              <div className="form-banner form-banner-error">
                {cErrors.map((e, i) => <span key={i} style={{ display: "block" }}>{e}</span>)}
              </div>
            )}
            <form onSubmit={doCreate} className="admin-form">
              <div className="form-grid-2">
                <label className="field">
                  <span>Tên <span className="required">*</span></span>
                  <input value={cForm.name} onChange={(e) => cf("name", e.target.value)} placeholder="vd: Tia Chớp" disabled={cLoading} />
                </label>
                <label className="field">
                  <span>Giống <span className="required">*</span></span>
                  <select value={cForm.breed} onChange={(e) => cf("breed", e.target.value)} disabled={cLoading}>
                    <option value="">— Chọn giống ngựa —</option>
                    {HORSE_BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Tuổi <span className="required">*</span></span>
                  <input type="number" min={1} max={30} value={cForm.age || ""} onChange={(e) => cf("age", ageNum(e.target.value))} placeholder="vd: 4" disabled={cLoading} />
                </label>
                <label className="field">
                  <span>Cân nặng (kg)</span>
                  <input type="number" min={350} max={600} value={cForm.weight ?? ""} onChange={(e) => cf("weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="350–600" disabled={cLoading} />
                </label>
                <label className="field">
                  <span>Màu lông / đặc điểm</span>
                  <input value={cForm.color ?? ""} onChange={(e) => cf("color", e.target.value)} placeholder="vd: Nâu hạt dẻ" disabled={cLoading} />
                </label>
                <label className="field">
                  <span>Tên huấn luyện viên</span>
                  <input value={cForm.trainerName ?? ""} onChange={(e) => cf("trainerName", e.target.value)} placeholder="Không bắt buộc" disabled={cLoading} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Mã đăng ký</span>
                  <input value={cForm.registrationId ?? ""} onChange={(e) => cf("registrationId", e.target.value)} placeholder="Số đăng ký chính thức (không bắt buộc)" disabled={cLoading} />
                </label>
                <PdfUploadField
                  url={cForm.profilePdfUrl}
                  name={cForm.profilePdfName}
                  disabled={cLoading}
                  onUploaded={(url, name) => setCForm((p) => ({ ...p, profilePdfUrl: url, profilePdfName: name }))}
                  onClear={() => setCForm((p) => ({ ...p, profilePdfUrl: "", profilePdfName: "" }))}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-button" disabled={cLoading} onClick={() => { setCForm(EMPTY_FORM); setCErrors([]); }}>Đặt lại</button>
                <button type="submit" className="primary-button" disabled={cLoading}>{cLoading ? "Đang đăng ký…" : "Đăng ký ngựa"}</button>
              </div>
            </form>
          </>
        )}
        {!showCreate && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Bấm "+ Ngựa mới" để đăng ký một con ngựa mới vào chuồng của bạn.</p>
        )}
      </Panel>

      {/* ── Horse list ── */}
      <Panel
        title="Hồ sơ ngựa"
        subtitle={`${filtered.length} / ${horses.length} ngựa`}
        action={
          <div className="filter-tabs">
            {(["all", "Fit", "Injured", "Retired"] as HealthFilter[]).map((f) => (
              <button key={f} type="button" className={cn("filter-tab", filter === f && "is-active")} onClick={() => setFilter(f)}>
                {f === "all" ? "Tất cả" : viHealth(f)}
              </button>
            ))}
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "name", label: "Tên" },
            { key: "breed", label: "Giống" },
            { key: "age", label: "Tuổi", render: (row) => `${row.age} tuổi` },
            { key: "color", label: "Màu lông", render: (row) => row.color ?? "—" },
            { key: "weight", label: "Cân nặng", render: (row) => row.weight ? `${row.weight}kg` : "—" },
            {
              key: "health",
              label: "Sức khỏe",
              render: (row) => <Badge tone={HEALTH_TONE[row.health] as any ?? "neutral"}>{viHealth(row.health)}</Badge>,
            },
            {
              key: "profilePdfUrl",
              label: "PDF",
              render: (row) => row.profilePdfUrl ? (
                <a className="secondary-button btn-xs" href={row.profilePdfUrl} target="_blank" rel="noreferrer">
                  Xem PDF
                </a>
              ) : <span style={{ color: "var(--text-muted)" }}>—</span>,
            },
            {
              key: "id",
              label: "Sửa",
              render: (row) => (
                <button
                  type="button"
                  className={cn("secondary-button btn-xs", editHorse?.id === row.id && "is-active")}
                  onClick={() => openEdit(row)}
                >
                  {editHorse?.id === row.id ? "Đóng" : "Sửa"}
                </button>
              ),
            },
          ]}
          rows={filtered}
          empty="Không tìm thấy ngựa nào."
        />
      </Panel>

      {/* ── Edit panel ── */}
      {editHorse && (
        <Panel
          title={`Chỉnh sửa — ${editHorse.name}`}
          subtitle="Cập nhật thông tin hồ sơ ngựa"
          action={<button type="button" className="secondary-button btn-xs" onClick={() => { setEditHorse(null); setEMsg(""); }}>Đóng</button>}
        >
          {eMsg && (
            <div className={cn("form-banner", eMsg.toLowerCase().includes("fail") || eMsg.toLowerCase().includes("error") ? "form-banner-error" : "form-banner-success")}>
              {eMsg}
            </div>
          )}
          <form onSubmit={doEdit} className="admin-form">
            <div className="form-grid-2">
              <label className="field">
                <span>Tên</span>
                <input value={eForm.name ?? ""} onChange={(e) => setEForm((p) => ({ ...p, name: e.target.value }))} disabled={eLoading} />
              </label>
              <label className="field">
                <span>Giống</span>
                <select value={eForm.breed ?? ""} onChange={(e) => setEForm((p) => ({ ...p, breed: e.target.value }))} disabled={eLoading}>
                  <option value="">— Chọn giống ngựa —</option>
                  {(eForm.breed && !HORSE_BREEDS.includes(eForm.breed)
                    ? [eForm.breed, ...HORSE_BREEDS]
                    : HORSE_BREEDS
                  ).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Tuổi</span>
                <input type="number" min={1} max={30} value={eForm.age ?? ""} onChange={(e) => setEForm((p) => ({ ...p, age: ageNum(e.target.value) }))} disabled={eLoading} />
              </label>
              <label className="field">
                <span>Cân nặng (kg)</span>
                <input type="number" min={350} max={600} value={eForm.weight ?? ""} onChange={(e) => setEForm((p) => ({ ...p, weight: e.target.value ? Number(e.target.value) : undefined }))} disabled={eLoading} />
              </label>
              <label className="field">
                <span>Màu lông</span>
                <input value={eForm.color ?? ""} onChange={(e) => setEForm((p) => ({ ...p, color: e.target.value }))} disabled={eLoading} />
              </label>
              <label className="field">
                <span>Huấn luyện viên</span>
                <input value={eForm.trainerName ?? ""} onChange={(e) => setEForm((p) => ({ ...p, trainerName: e.target.value }))} disabled={eLoading} />
              </label>
              <PdfUploadField
                url={eForm.profilePdfUrl}
                name={eForm.profilePdfName}
                disabled={eLoading}
                onUploaded={(url, name) => setEForm((p) => ({ ...p, profilePdfUrl: url, profilePdfName: name }))}
                onClear={() => setEForm((p) => ({ ...p, profilePdfUrl: "", profilePdfName: "" }))}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" disabled={eLoading} onClick={() => { setEditHorse(null); setEMsg(""); }}>Hủy</button>
              <button type="submit" className="primary-button" disabled={eLoading}>{eLoading ? "Đang lưu…" : "Lưu thay đổi"}</button>
            </div>
          </form>

          {/* Danger zone — delete (blocked if the horse has an active registration) */}
          <div style={{ marginTop: "18px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
              Xóa ngựa này khỏi chuồng. Không thể xóa khi ngựa còn đơn đăng ký đang chờ hoặc đã duyệt.
            </p>
            <ConfirmDeleteButton
              label="Xóa ngựa"
              onConfirm={() => handleDeleteHorse(editHorse.id)}
              onDeleted={() => setEditHorse(null)}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
