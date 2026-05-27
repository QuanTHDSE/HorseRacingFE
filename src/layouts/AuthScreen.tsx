import { Badge, Panel } from "../components";
import { roleConfigs } from "../config/roleConfigs";
import { useApp } from "../context/AppContext";
import { cn } from "../utils/cn";

export default function AuthScreen() {
  const {
    accounts,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    authMode,
    authError,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleSelectAccount,
    handleModeChange,
  } = useApp();

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <Badge tone="accent">HorseRacing Management Platform</Badge>
        <h1>The complete platform for managing horse racing tournaments end-to-end</h1>
        <p>
          A role-based management system for horse owners, jockeys, race referees, spectators, and administrators —
          covering every stage from registration and scheduling to live monitoring and result publication.
        </p>

        <div className="auth-highlight-grid">
          <article className="highlight-card">
            <h3>Role-based workspaces</h3>
            <p>Every user enters a tailored workspace with role-specific menus, actions, and relevant race data.</p>
          </article>
          <article className="highlight-card">
            <h3>End-to-end race workflow</h3>
            <p>From horse registration and jockey assignment to pre-race checks, live monitoring, and result publishing.</p>
          </article>
          <article className="highlight-card">
            <h3>Real-time race management</h3>
            <p>Confirm races, approve registrations, accept invitations, and submit predictions all within one platform.</p>
          </article>
        </div>

        <Panel title="System accounts" subtitle="Select an account to sign in instantly">
          <div className="demo-account-list">
            {accounts.map((account) => (
              <button
                key={account.id}
                className="demo-account-card"
                type="button"
                onClick={() => handleSelectAccount(account)}
              >
                <div className="demo-badge">{account.badge}</div>
                <div>
                  <strong>{account.name}</strong>
                  <p>{roleConfigs[account.role].label}</p>
                  <span>
                    {account.email} / {account.password}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="auth-panel">
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
              <span>Email</span>
              <input
                name="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="owner@royalstables.vn"
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
              />
            </label>
            {authError ? <div className="form-error">{authError}</div> : null}
            <button className="primary-button" type="submit">
              Sign In
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-copy">
              <h2>Create an account</h2>
              <p>Register as a horse owner, jockey, or spectator. Referee and admin accounts are managed by the system.</p>
            </div>
            <label className="field">
              <span>Full name</span>
              <input
                name="name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Enter your full name"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                name="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="name@example.vn"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </label>
            <label className="field">
              <span>Select role</span>
              <select
                name="role"
                value={registerForm.role}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
              >
                <option value="owner">Horse Owner</option>
                <option value="jockey">Jockey</option>
                <option value="spectator">Spectator</option>
              </select>
            </label>
            {authError ? <div className="form-error">{authError}</div> : null}
            <button className="primary-button" type="submit">
              Create account
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
