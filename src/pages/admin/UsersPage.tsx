import { useState } from "react";
import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

const ROLE_OPTIONS = [
  { value: "horse_owner", label: "Horse Owner" },
  { value: "jockey", label: "Jockey" },
  { value: "referee", label: "Referee" },
  { value: "spectator", label: "Spectator" },
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
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

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
      setMsg("Account created. The user can sign in with the password shown in the form.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
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
      setMsg("Role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.");
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
      setMsg("Account status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      {error && <div className="form-banner form-banner-error">{error}</div>}
      {msg && <div className="form-banner form-banner-success">{msg}</div>}

      <Panel
        title="Create Staff / Owner Account"
        subtitle="Admin creates Horse Owner, Jockey, Referee, or Spectator accounts. Horse owners can then add horses and invite jockeys."
      >
        <form className="admin-form" onSubmit={createUser}>
          <div className="form-grid-2">
            <label className="field">
              <span>Full name</span>
              <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </label>
            <label className="field">
              <span>Initial password</span>
              <input value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} required />
            </label>
            <label className="field">
              <span>Role</span>
              <select value={form.role} onChange={(e) => set("role", e.target.value as CreateRole)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            {form.role === "jockey" && (
              <>
                <label className="field">
                  <span>License number</span>
                  <input value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} />
                </label>
                <label className="field">
                  <span>License expiry</span>
                  <input type="date" value={form.licenseExpiry} onChange={(e) => set("licenseExpiry", e.target.value)} />
                </label>
              </>
            )}
            {form.role === "referee" && (
              <label className="field">
                <span>Certification ID</span>
                <input value={form.certificationId} onChange={(e) => set("certificationId", e.target.value)} />
              </label>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={busy === "create"}>
              {busy === "create" ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="User Account Management" subtitle="Manage roles and active status">
        <DataTable
          columns={[
            { key: "name", label: "User" },
            { key: "email", label: "Email" },
            {
              key: "role",
              label: "Role",
              render: (row) => row.role === "admin" ? (
                <Badge tone="accent">admin</Badge>
              ) : (
                <select
                  value={DISPLAY_TO_API_ROLE[row.role] ?? row.role}
                  disabled={busy === row.id || row.id === user?.id}
                  onChange={(e) => updateRole(row.id, e.target.value)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Active" ? "success" : "warning"}>{row.status}</Badge>
              ),
            },
            { key: "lastSeen", label: "Created" },
            {
              key: "id",
              label: "Actions",
              render: (row) => (
                <button
                  type="button"
                  className="table-button"
                  disabled={busy === row.id || row.id === user?.id}
                  onClick={() => toggleActive(row.id, row.status)}
                >
                  {row.status === "Active" ? "Disable" : "Enable"}
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
