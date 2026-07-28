import { Link } from "react-router-dom";
import { Eye, Gauge, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { cn } from "../utils/cn";
import bgImage from "../../assets/race-bg.jpg";

const ROLE_OPTIONS: {
  value: "spectator" | "jockey";
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    value: "spectator",
    label: "Khán giả",
    desc: "Theo dõi đua trực tiếp, dự đoán kết quả và nhận thưởng",
    icon: Eye,
  },
  {
    value: "jockey",
    label: "Nài ngựa",
    desc: "Nhận lời mời thi đấu và quản lý các cuộc đua được giao",
    icon: Gauge,
  },
];

export default function AuthScreen() {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const {
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    authMode,
    authError,
    authMessage,
    isLoading,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleModeChange,
  } = useApp();

  async function handleForgotSubmit() {
    setForgotMessage("");
    setForgotError("");
    setForgotLoading(true);
    try {
      const result = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotMessage(result.message);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Không thể gửi email đặt lại mật khẩu.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="auth-bg-overlay" />

      {/* ── Nav — transparent blurred navbar, same as homepage ─────── */}
      <header className="home-nav">
        <Link to="/" className="home-nav-brand">
          <div className="brand-mark">RT</div>
          <span className="home-nav-brand-name">RacetrackVN</span>
        </Link>
        <div className="home-nav-actions">
          <Link className="ghost-button" to="/">← Trang chủ</Link>
        </div>
      </header>

      {/* ── Centered auth card ──────────────────────────────────────── */}
      <main className="auth-center">
        <div className="auth-card">

          <div className="auth-tabs">
            <button
              className={cn("auth-tab", authMode === "login" && "is-active")}
              type="button"
              onClick={() => handleModeChange("login")}
            >
              Đăng nhập
            </button>
            <button
              className={cn("auth-tab", authMode === "register" && "is-active")}
              type="button"
              onClick={() => handleModeChange("register")}
            >
              Đăng ký
            </button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="form-copy">
                <h2>Chào mừng trở lại</h2>
                <p>Đăng nhập để vào khu làm việc theo vai trò và quản lý hoạt động đua ngựa của bạn.</p>
              </div>
              <label className="field">
                <span>Địa chỉ email</span>
                <input
                  name="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  placeholder="you@example.vn"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </label>
              <label className="field">
                <span>Mật khẩu</span>
                <input
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </label>
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setForgotOpen((open) => !open);
                  setForgotEmail(loginForm.email);
                  setForgotMessage("");
                  setForgotError("");
                }}
              >
                Quên mật khẩu?
              </button>
              {forgotOpen ? (
                <div className="reset-inline-panel">
                  <strong>ĐẶT LẠI MẬT KHẨU</strong>
                  <p>Nhập email tài khoản, hệ thống sẽ gửi link đặt mật khẩu mới.</p>
                  <label className="field">
                    <span>Email nhận link</span>
                    <input
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.vn"
                      autoComplete="email"
                      disabled={forgotLoading}
                    />
                  </label>
                  {forgotMessage ? <div className="form-success">{forgotMessage}</div> : null}
                  {forgotError ? <div className="form-error">{forgotError}</div> : null}
                  <button className="secondary-button" type="button" onClick={handleForgotSubmit} disabled={forgotLoading}>
                    {forgotLoading ? "Đang gửi email..." : "Gửi link đặt lại"}
                  </button>
                </div>
              ) : null}
              {authMessage ? <div className="form-success">{authMessage}</div> : null}
              {authError ? <div className="form-error">{authError}</div> : null}
              <button className="primary-button" type="submit" style={{ width: "100%" }} disabled={isLoading}>
                {isLoading ? "Đang đăng nhập…" : "Đăng nhập →"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <div className="form-copy">
                <h2>Tham gia RacetrackVN</h2>
                <p>Chọn loại tài khoản phù hợp và đăng ký để bắt đầu trải nghiệm.</p>
              </div>

              <div className="field">
                <span>Loại tài khoản</span>
                <div className="auth-role-grid">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn("auth-role-option", registerForm.role === opt.value && "is-active")}
                      onClick={() => setRegisterForm((prev) => ({
                        ...prev,
                        role: opt.value,
                        applicationPdf: opt.value === "jockey" ? prev.applicationPdf : null,
                      }))}
                      disabled={isLoading}
                    >
                      <span className="auth-role-icon"><opt.icon size={18} strokeWidth={2} /></span>
                      <strong>{opt.label}</strong>
                      <p>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Họ và tên</span>
                <input
                  name="name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  placeholder="Nhập họ và tên của bạn"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </label>
              <label className="field">
                <span>Địa chỉ email</span>
                <input
                  name="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  placeholder="name@example.vn"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input
                  name="phone"
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ví dụ: 0912345678"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={isLoading}
                  required
                />
              </label>
              <label className="field">
                <span>Mật khẩu</span>
                <input
                  name="password"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                  placeholder="Ít nhất 8 ký tự"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </label>
              {registerForm.role === "jockey" ? (
                <label className="field">
                  <span>Hồ sơ năng lực Jockey (PDF)</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setRegisterForm((prev) => ({ ...prev, applicationPdf: file }));
                    }}
                    disabled={isLoading}
                    required
                  />
                  <small>
                    {registerForm.applicationPdf
                      ? `Đã chọn: ${registerForm.applicationPdf.name}`
                      : "Tải giấy phép hoặc hồ sơ chuyên môn định dạng PDF, tối đa 10MB."}
                  </small>
                </label>
              ) : null}
              {authError ? <div className="form-error">{authError}</div> : null}
              <button className="primary-button" type="submit" style={{ width: "100%" }} disabled={isLoading}>
                {isLoading ? "Đang tạo tài khoản…" : "Tạo tài khoản →"}
              </button>
            </form>
          )}

          <p className="auth-panel-footer">
            © 2026 RacetrackVN · Bảo lưu mọi quyền
          </p>
        </div>
      </main>
    </div>
  );
}
