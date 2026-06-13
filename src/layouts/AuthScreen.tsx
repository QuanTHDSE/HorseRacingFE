import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";

const FEATURES = [
  {
    icon: "🏟️",
    title: "Tournament & Race Setup",
    desc: "Create tournaments, configure racetracks, and manage complete race calendars end-to-end.",
  },
  {
    icon: "🐴",
    title: "Horse & Jockey Management",
    desc: "Register horses, assign jockeys, track health records and performance statistics.",
  },
  {
    icon: "📡",
    title: "Live Race Control",
    desc: "Referee dashboards with real-time monitoring, violation logging, and instant alerts.",
  },
  {
    icon: "🏅",
    title: "Results & Predictions",
    desc: "Publish official results, distribute rewards, and engage spectators with live predictions.",
  },
];

const STATS = [
  { value: "12+", label: "Tournaments" },
  { value: "48", label: "Horses" },
  { value: "24", label: "Jockeys" },
  { value: "6", label: "Racetracks" },
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
            <span className="auth-hero-brand-sub">Management Platform</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="auth-hero-copy">
          <span className="auth-hero-eyebrow">🏆 Vietnam's #1 Horse Racing Platform</span>
          <h1>Manage every race,<br />from start to finish</h1>
          <p>
            The complete digital platform connecting owners, jockeys, referees, and spectators —
            covering the entire lifecycle of every horse racing tournament.
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
            <p className="auth-panel-sub">Secure access to your workspace</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={cn("auth-tab", authMode === "login" && "is-active")}
            type="button"
            onClick={() => handleModeChange("login")}
          >
            Sign In
          </button>
          <button
            className={cn("auth-tab", authMode === "register" && "is-active")}
            type="button"
            onClick={() => handleModeChange("register")}
          >
            Register
          </button>
        </div>

        {authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="form-copy">
              <h2>Welcome back</h2>
              <p>Sign in to access your role-based workspace and manage your racing activities.</p>
            </div>
            <label className="field">
              <span>Email address</span>
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
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </label>
            {authError ? <div className="form-error">{authError}</div> : null}
            <button className="primary-button" type="submit" style={{ width: "100%" }} disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-copy">
              <h2>Join RacetrackVN</h2>
              <p>Register as a spectator to follow races and make predictions.</p>
            </div>
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={isLoading}
              />
            </label>
            <label className="field">
              <span>Email address</span>
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
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </label>
            {authError ? <div className="form-error">{authError}</div> : null}
            <button className="primary-button" type="submit" style={{ width: "100%" }} disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create account →"}
            </button>
          </form>
        )}

        <p className="auth-panel-footer">
          © 2026 RacetrackVN · All rights reserved
        </p>
      </section>

    </div>
  );
}
