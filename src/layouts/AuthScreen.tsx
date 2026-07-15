import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";

const FEATURES = [
  {
    icon: "🏟️",
    title: "Thiết lập giải đấu & cuộc đua",
    desc: "Tạo giải đấu, cấu hình đường đua và quản lý toàn bộ lịch đua từ đầu đến cuối.",
  },
  {
    icon: "🐴",
    title: "Quản lý ngựa & nài ngựa",
    desc: "Đăng ký ngựa, phân công nài, theo dõi hồ sơ sức khỏe và thống kê thành tích.",
  },
  {
    icon: "📡",
    title: "Điều hành đua trực tiếp",
    desc: "Bảng điều khiển của trọng tài với theo dõi thời gian thực, ghi nhận vi phạm và cảnh báo tức thì.",
  },
  {
    icon: "🏅",
    title: "Kết quả & Dự đoán",
    desc: "Công bố kết quả chính thức, trao thưởng và thu hút khán giả bằng dự đoán trực tiếp.",
  },
];

const STATS = [
  { value: "12+", label: "Giải đấu" },
  { value: "48", label: "Ngựa" },
  { value: "24", label: "Nài ngựa" },
  { value: "6", label: "Đường đua" },
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
    <div className="auth-layout">

      {/* ════════════════════════════════════════
          LEFT — Hero panel
      ════════════════════════════════════════ */}
      <section className="auth-hero">

        {/* Brand header */}
        <div className="auth-hero-brand">
          <div className="auth-hero-logo">RT</div>
          <div>
            <span className="auth-hero-brand-name">RacetrackVN</span>
            <span className="auth-hero-brand-sub">Nền tảng quản lý</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="auth-hero-copy">
          <span className="auth-hero-eyebrow">🏆 Nền tảng đua ngựa số 1 Việt Nam</span>
          <h1>Quản lý mọi cuộc đua,<br />từ đầu đến cuối</h1>
          <p>
            Nền tảng số hoàn chỉnh kết nối chủ ngựa, nài ngựa, trọng tài và khán giả —
            bao trùm toàn bộ vòng đời của mỗi giải đua ngựa.
          </p>
        </div>

        {/* Platform stats */}
        <div className="auth-stats-row">
          {STATS.map((s) => (
            <div key={s.label} className="auth-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Feature showcase */}
        <div className="auth-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="auth-feature">
              <span className="auth-feature-icon">{f.icon}</span>
              <div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ════════════════════════════════════════
          RIGHT — Form panel
      ════════════════════════════════════════ */}
      <section className="auth-panel">

        {/* Panel brand */}
        <div className="auth-panel-top">
          <div className="auth-panel-mark">RT</div>
          <div>
            <p className="auth-panel-brand">RacetrackVN</p>
            <p className="auth-panel-sub">Truy cập an toàn vào khu làm việc của bạn</p>
          </div>
        </div>

        {/* Tabs */}
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
              <p>Đăng ký làm khán giả để theo dõi các cuộc đua và tham gia dự đoán.</p>
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
      </section>

    </div>
  );
}
