import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Panel, Spinner } from "../components";
import { roleConfigs } from "../config/roleConfigs";
import { useApp } from "../context/AppContext";
import { useFeedback } from "../context/ToastContext";
import { api } from "../services/api";

export default function AccountPage() {
  const { user, handleUpdateMyProfile, handleChangeMyPassword } = useApp();
  const { success: showSuccess, error: showError } = useFeedback();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;
    api.auth.me()
      .then(({ user: apiUser }) => {
        if (!active) return;
        setFullName(apiUser.fullName);
        setPhone(apiUser.phone ?? "");
        setLicenseNumber(apiUser.licenseNumber ?? "");
        setLicenseExpiry(apiUser.licenseExpiry ?? null);
      })
      .catch((error: unknown) => {
        showError(error instanceof Error ? error.message : "Không thể tải thông tin tài khoản.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => { active = false; };
  }, [showError]);

  if (!user) return null;

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim()) {
      showError("Họ và tên là bắt buộc.");
      return;
    }
    setProfileSaving(true);
    try {
      await handleUpdateMyProfile({ fullName: fullName.trim(), phone: phone.trim() });
      showSuccess("Đã cập nhật thông tin tài khoản.");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      showError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPasswordSaving(true);
    try {
      const message = await handleChangeMyPassword(oldPassword, newPassword);
      showSuccess(message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Không thể đổi mật khẩu.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <Panel
        title="Tài khoản của tôi"
        subtitle="Cập nhật thông tin cá nhân và bảo mật tài khoản"
        action={<Badge tone="accent">{roleConfigs[user.role].label}</Badge>}
      >
        {profileLoading ? (
          <div className="empty-state"><Spinner /> Đang tải thông tin tài khoản…</div>
        ) : (
          <form className="form-grid" onSubmit={submitProfile}>
            <label className="field">
              <span>Họ và tên</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={profileSaving} />
            </label>
            <label className="field">
              <span>Số điện thoại</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" disabled={profileSaving} />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={user.email} disabled />
            </label>
            <label className="field">
              <span>Vai trò</span>
              <input value={roleConfigs[user.role].label} disabled />
            </label>
            {user.role === "jockey" ? (
              <>
                <label className="field">
                  <span>Số giấy phép Jockey</span>
                  <input value={licenseNumber || "Chưa cập nhật"} disabled />
                </label>
                <label className="field">
                  <span>Ngày hết hạn giấy phép</span>
                  <input value={licenseExpiry ? new Date(licenseExpiry).toLocaleDateString("vi-VN") : "Chưa cập nhật"} disabled />
                </label>
              </>
            ) : null}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={profileSaving}>
                {profileSaving ? <><Spinner size="sm" onPrimary /> Đang lưu…</> : "Lưu thông tin"}
              </button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Đổi mật khẩu" subtitle="Sử dụng mật khẩu mới có ít nhất 8 ký tự">
        <form className="form-grid" onSubmit={submitPassword}>
          <label className="field">
            <span>Mật khẩu hiện tại</span>
            <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} autoComplete="current-password" disabled={passwordSaving} required />
          </label>
          <label className="field">
            <span>Mật khẩu mới</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" disabled={passwordSaving} required />
          </label>
          <label className="field">
            <span>Xác nhận mật khẩu mới</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={passwordSaving} required />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={passwordSaving}>
              {passwordSaving ? <><Spinner size="sm" onPrimary /> Đang đổi…</> : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
