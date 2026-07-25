import { Link } from "react-router-dom";
import { Eye, Gauge, type LucideIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
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
  const {
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    authMode,
    authError,
    isLoading,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleModeChange,
  } = useApp();

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
                      onClick={() => setRegisterForm((prev) => ({ ...prev, role: opt.value }))}
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
