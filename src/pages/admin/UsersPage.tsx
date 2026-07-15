import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import { viUserStatus } from "../../utils/viLabels";

const ROLE_OPTIONS = [
  { value: "horse_owner", label: "Chủ ngựa" },
  { value: "jockey", label: "Nài ngựa" },
  { value: "referee", label: "Trọng tài" },
  { value: "spectator", label: "Khán giả" },
] as const;

const DISPLAY_TO_API_ROLE: Record<string, "horse_owner" | "jockey" | "referee" | "spectator" | "admin"> = {
  owner: "horse_owner",
  jockey: "jockey",
  referee: "referee",
  spectator: "spectator",
  admin: "admin",
};

type CreateRole = (typeof ROLE_OPTIONS)[number]["value"];

export default function UsersPage() {
  const { appState, user, handleCreateAdminUser, handleUpdateAdminUser } = useApp();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "Demo@123",
    phone: "",
    role: "horse_owner" as CreateRole,
    licenseNumber: "",
    licenseExpiry: "",
    certificationId: "",
  });
  const [busy, setBusy] = useState("");
  const fb = useFeedback();
  const msg = ""; const setMsg = fb.success;
  const error = ""; const setError = fb.error;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMsg("");
    setError("");
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    setMsg("");
    setError("");
    try {
      await handleCreateAdminUser({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        licenseNumber: form.role === "jockey" ? form.licenseNumber.trim() || undefined : undefined,
        licenseExpiry: form.role === "jockey" ? form.licenseExpiry || null : undefined,
        certificationId: form.role === "referee" ? form.certificationId.trim() || undefined : undefined,
      });
      setForm((prev) => ({
        ...prev,
        fullName: "",
        email: "",
        phone: "",
        licenseNumber: "",
        licenseExpiry: "",
        certificationId: "",
      }));
      setMsg("Đã tạo tài khoản. Người dùng có thể đăng nhập bằng mật khẩu hiển thị trong biểu mẫu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được tài khoản.");
    } finally {
      setBusy("");
    }
  }

  async function updateRole(id: string, role: "horse_owner" | "jockey" | "referee" | "spectator" | "admin") {
    setBusy(id);
    setMsg("");
    setError("");
    try {
      await handleUpdateAdminUser(id, { role });
      setMsg("Đã cập nhật vai trò.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được vai trò.");
    } finally {
      setBusy("");
    }
  }

  async function toggleActive(id: string, currentStatus: string) {
    setBusy(id);
    setMsg("");
    setError("");
    try {
      await handleUpdateAdminUser(id, { isActive: currentStatus !== "Active" });
      setMsg("Đã cập nhật trạng thái tài khoản.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái tài khoản.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      <Panel
        title="Tạo tài khoản nhân sự / chủ ngựa"
        subtitle="Quản trị viên tạo tài khoản Chủ ngựa, Nài ngựa, Trọng tài hoặc Khán giả. Chủ ngựa sau đó có thể thêm ngựa và mời nài."
      >
        <form className="admin-form" onSubmit={createUser}>
          <div className="form-grid-2">
            <label className="field">
              <span>Họ và tên</span>
              <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </label>
            <label className="field">
              <span>Mật khẩu ban đầu</span>
              <input value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} required />
            </label>
            <label className="field">
              <span>Vai trò</span>
              <select value={form.role} onChange={(e) => set("role", e.target.value as CreateRole)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Số điện thoại</span>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            {form.role === "jockey" && (
              <>
                <label className="field">
                  <span>Số giấy phép</span>
                  <input value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} />
                </label>
                <label className="field">
                  <span>Ngày hết hạn giấy phép</span>
                  <input type="date" value={form.licenseExpiry} onChange={(e) => set("licenseExpiry", e.target.value)} />
                </label>
              </>
            )}
            {form.role === "referee" && (
              <label className="field">
                <span>Mã chứng nhận</span>
                <input value={form.certificationId} onChange={(e) => set("certificationId", e.target.value)} />
              </label>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={busy === "create"}>
              {busy === "create" ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Quản lý tài khoản người dùng" subtitle="Quản lý vai trò và trạng thái hoạt động">
        <DataTable
          columns={[
            { key: "name", label: "Người dùng" },
            { key: "email", label: "Email" },
            {
              key: "role",
              label: "Vai trò",
              render: (row) => row.role === "admin" ? (
                <Badge tone="accent">Quản trị viên</Badge>
              ) : (
                <select
                  value={DISPLAY_TO_API_ROLE[row.role] ?? row.role}
                  disabled={busy === row.id || row.id === user?.id}
                  onChange={(e) => updateRole(row.id, e.target.value as Parameters<typeof updateRole>[1])}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              ),
            },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={row.status === "Active" ? "success" : "warning"}>{viUserStatus(row.status)}</Badge>
              ),
            },
            { key: "lastSeen", label: "Ngày tạo" },
            {
              key: "id",
              label: "Thao tác",
              render: (row) => (
                <button
                  type="button"
                  className="table-button"
                  disabled={busy === row.id || row.id === user?.id}
                  onClick={() => toggleActive(row.id, row.status)}
                >
                  {row.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
                </button>
              ),
            },
          ]}
          rows={appState.users}
        />
      </Panel>
    </div>
  );
}
