import { useEffect, useState } from "react";
import Spinner from "./Spinner";

interface BootScreenProps {
  label?: string;
}

/**
 * Full-screen splash shown while the stored token is exchanged for a session.
 * Without it the router would briefly bounce a signed-in user to /login on refresh.
 */
export default function BootScreen({ label = "Đang khôi phục phiên đăng nhập…" }: BootScreenProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-mark">RT</div>
      <Spinner size="lg" />
      <h1>{label}</h1>
      {slow ? (
        <p>Máy chủ đang khởi động lại sau thời gian nghỉ, việc này có thể mất tới một phút.</p>
      ) : null}
    </div>
  );
}
