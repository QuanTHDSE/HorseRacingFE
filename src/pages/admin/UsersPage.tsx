import { useEffect, useMemo, useState } from "react";
import { Badge, ConfirmDeleteButton, DataTable, Panel, Spinner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { SystemUser } from "../../types";
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
type EditableRole = CreateRole | "admin";

function dateInputValue(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function profileSummary(row: SystemUser) {
  if (row.role === "jockey") {
    return row.licenseNumber
      ? `License ${row.licenseNumber}${row.licenseExpiry ? ` · exp ${dateInputValue(row.licenseExpiry)}` : ""}`
      : "Chưa có license";
  }
  if (row.role === "referee") {
    return row.certificationId ? `Cert ${row.certificationId}` : "Chưa có chứng nhận";
  }
  return row.phone || "—";
}

export default function UsersPage() {
  const { appState, user, isDataLoading, handleCreateAdminUser, handleUpdateAdminUser, handleDeleteAdminUser } = useApp();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "Demo@123",
    phone: "",
    role: "horse_owner" as CreateRole,
    licenseExpiry: "",
    certificationId: "",
  });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    role: "horse_owner" as EditableRole,
    password: "",
    licenseNumber: "",
    licenseExpiry: "",
    certificationId: "",
  });
  const [busy, setBusy] = useState("");
  const fb = useFeedback();
  const msg = ""; const setMsg = fb.success;
  const error = ""; const setError = fb.error;

  const editingUser = useMemo(
    () => appState.users.find((u) => u.id === editingId) ?? null,
    [appState.users, editingId],
  );

  useEffect(() => {
    if (!editingUser) return;
    setEditForm({
      fullName: editingUser.name,
      phone: editingUser.phone ?? "",
      role: (DISPLAY_TO_API_ROLE[editingUser.role] ?? editingUser.role) as EditableRole,
      password: "",
      licenseNumber: editingUser.licenseNumber ?? "",
      licenseExpiry: dateInputValue(editingUser.licenseExpiry),
      certificationId: editingUser.certificationId ?? "",
    });
  }, [editingUser]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMsg("");
    setError("");
  }

  function setEdit<K extends keyof typeof editForm>(key: K, value: (typeof editForm)[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
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
        licenseExpiry: form.role === "jockey" ? form.licenseExpiry || null : undefined,
        certificationId: form.role === "referee" ? form.certificationId.trim() || undefined : undefined,
      });
      setForm((prev) => ({
        ...prev,
        fullName: "",
        email: "",
        phone: "",
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

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    setBusy(editingUser.id);
    setMsg("");
    setError("");
    try {
      await handleUpdateAdminUser(editingUser.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        password: editForm.password || undefined,
        licenseNumber: editForm.role === "jockey" ? editForm.licenseNumber.trim() || null : undefined,
        licenseExpiry: editForm.role === "jockey" ? editForm.licenseExpiry || null : undefined,
        certificationId: editForm.role === "referee" ? editForm.certificationId.trim() || null : undefined,
      });
      setMsg("Đã lưu thông tin tài khoản.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được tài khoản.");
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

  async function deleteUser(id: string) {
    await handleDeleteAdminUser(id);
    if (editingId === id) setEditingId("");
    setMsg("Đã xóa tài khoản chưa phát sinh dữ liệu.");
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
                  <input value="Hệ thống tự động cấp khi tạo tài khoản" disabled />
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
              {busy === "create" ? <><Spinner size="sm" onPrimary /> Đang tạo…</> : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </Panel>

      {editingUser && (
        <Panel
          title={`Sửa tài khoản - ${editingUser.name}`}
          subtitle="Cập nhật thông tin hồ sơ, role, trạng thái chuyên môn và đặt lại mật khẩu khi cần."
        >
          <form className="admin-form" onSubmit={saveEdit}>
            <div className="form-grid-2">
              <label className="field">
                <span>Họ và tên</span>
                <input value={editForm.fullName} onChange={(e) => setEdit("fullName", e.target.value)} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={editingUser.email} disabled />
              </label>
              <label className="field">
                <span>Vai trò</span>
                <select
                  value={editForm.role}
                  disabled={editingUser.role === "admin" || editingUser.id === user?.id}
                  onChange={(e) => setEdit("role", e.target.value as EditableRole)}
                >
                  {editingUser.role === "admin" && <option value="admin">Quản trị viên</option>}
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input value={editForm.phone} onChange={(e) => setEdit("phone", e.target.value)} />
              </label>
              <label className="field">
                <span>Đặt lại mật khẩu</span>
                <input
                  value={editForm.password}
                  onChange={(e) => setEdit("password", e.target.value)}
                  minLength={editForm.password ? 8 : undefined}
                  placeholder="Để trống nếu không đổi"
                />
              </label>
              {editForm.role === "jockey" && (
                <>
                  <label className="field">
                    <span>Số giấy phép</span>
                    <input value={editForm.licenseNumber} onChange={(e) => setEdit("licenseNumber", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Ngày hết hạn giấy phép</span>
                    <input type="date" value={editForm.licenseExpiry} onChange={(e) => setEdit("licenseExpiry", e.target.value)} />
                  </label>
                </>
              )}
              {editForm.role === "referee" && (
                <label className="field">
                  <span>Mã chứng nhận</span>
                  <input value={editForm.certificationId} onChange={(e) => setEdit("certificationId", e.target.value)} />
                </label>
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={busy === editingUser.id}>
                {busy === editingUser.id ? <><Spinner size="sm" onPrimary /> Đang lưu…</> : "Lưu thay đổi"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setEditingId("")}>
                Đóng
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Quản lý tài khoản người dùng" subtitle="Quản lý vai trò, hồ sơ chuyên môn, trạng thái hoạt động và xóa tài khoản chưa phát sinh dữ liệu">
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
            { key: "profile", label: "Hồ sơ", render: profileSummary },
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <button type="button" className="table-button" disabled={busy === row.id} onClick={() => setEditingId(row.id)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="table-button"
                    disabled={busy === row.id || row.id === user?.id}
                    onClick={() => toggleActive(row.id, row.status)}
                  >
                    {row.status === "Active" ? "Vô hiệu hóa" : "Kích hoạt"}
                  </button>
                  {row.role !== "admin" && (
                    <ConfirmDeleteButton
                      disabled={busy === row.id || row.id === user?.id}
                      label="Xóa"
                      confirmLabel="Xóa?"
                      onConfirm={() => deleteUser(row.id)}
                    />
                  )}
                </div>
              ),
            },
          ]}
          rows={appState.users}
          loading={isDataLoading}
        />
      </Panel>
    </div>
  );
}
