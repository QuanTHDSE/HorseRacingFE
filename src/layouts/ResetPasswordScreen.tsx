import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import bgImage from "../../assets/race-bg.jpg";

export default function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!token) {
      setError("Link đặt lại mật khẩu thiếu token. Vui lòng mở lại link trong email.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hai lần nhập mật khẩu chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.auth.resetPassword(token, password);
      setMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="auth-bg-overlay" />
      <header className="home-nav">
        <Link to="/" className="home-nav-brand">
          <div className="brand-mark">RT</div>
          <span className="home-nav-brand-name">RacetrackVN</span>
        </Link>
        <div className="home-nav-actions">
          <Link className="ghost-button" to="/login">← Đăng nhập</Link>
        </div>
      </header>
      <main className="auth-center">
        <div className="auth-card reset-card">
          <div className="reset-alert">ĐẶT LẠI MẬT KHẨU</div>
          <div className="form-copy">
            <h2>Tạo mật khẩu mới</h2>
            <p>Nhập mật khẩu mới cho tài khoản của bạn. Link chỉ có hiệu lực trong thời gian giới hạn.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Mật khẩu mới</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
                autoComplete="new-password"
                disabled={loading}
              />
            </label>
            <label className="field">
              <span>Nhập lại mật khẩu</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={loading}
              />
            </label>
            {message ? <div className="form-success">{message}</div> : null}
            {error ? <div className="form-error">{error}</div> : null}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
