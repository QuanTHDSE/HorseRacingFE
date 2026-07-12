import { useState } from "react";
import { cn } from "../utils/cn";
import type { Notification } from "../types";

interface Props {
  notifications: Notification[];
}

/** Icon chuông ở topbar + dropdown lưu/hiển thị các thông báo của người dùng. */
export default function NotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const unread = notifications.filter((n) => !seenIds.has(n.id)).length;

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      // Mở dropdown = đã xem hết → xoá badge chưa đọc.
      if (next) setSeenIds(new Set(notifications.map((n) => n.id)));
      return next;
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="notif-bell"
        onClick={toggle}
        title="Thông báo"
        aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ""}`}
      >
        🔔
        {unread > 0 && <span className="notif-bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="menu">
            <div className="notif-panel-head">
              <strong>Thông báo</strong>
              <span>{notifications.length} thông báo</span>
            </div>
            <div className="notif-panel-list">
              {notifications.length === 0 ? (
                <p className="notif-empty">Chưa có thông báo nào.</p>
              ) : (
                notifications.map((item) => (
                  <article key={item.id} className={cn("notification-card", `notification-${item.tone}`)}>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
