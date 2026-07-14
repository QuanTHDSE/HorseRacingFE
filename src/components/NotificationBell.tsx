import { useState } from "react";
import { cn } from "../utils/cn";
import type { CSSProperties } from "react";
import type { Notification } from "../types";

interface Props {
  notifications: Notification[];
}

// Inline style để không phụ thuộc styles.css (đảm bảo luôn hiển thị đúng).
const S: Record<string, CSSProperties> = {
  wrap: { position: "relative" },
  bell: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid var(--c-outline-var)",
    background: "var(--c-surface)",
    cursor: "pointer",
    fontSize: "1.05rem",
    lineHeight: 1,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 9,
    background: "var(--c-danger)",
    color: "#fff",
    fontSize: "0.68rem",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: { position: "fixed", inset: 0, zIndex: 40 },
  panel: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 340,
    maxWidth: "92vw",
    maxHeight: 440,
    display: "flex",
    flexDirection: "column",
    background: "var(--c-surface)",
    border: "1px solid var(--c-outline-var)",
    borderRadius: 16,
    boxShadow: "0 12px 32px rgba(0,0,0,.18)",
    zIndex: 50,
    overflow: "hidden",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 14px",
    borderBottom: "1px solid var(--c-outline-var)",
    fontSize: "0.9rem",
  },
  headCount: { color: "var(--c-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" },
  list: { padding: 10, overflowY: "auto", display: "grid", gap: 8 },
  empty: { color: "var(--c-muted)", fontSize: "0.85rem", textAlign: "center", padding: "22px 0", margin: 0 },
};

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
    <div style={S.wrap}>
      <button
        type="button"
        style={S.bell}
        onClick={toggle}
        title="Thông báo"
        aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ""}`}
      >
        🔔
        {unread > 0 && <span style={S.badge}>{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <div style={S.backdrop} onClick={() => setOpen(false)} />
          <div style={S.panel} role="menu">
            <div style={S.head}>
              <strong>Thông báo</strong>
              <span style={S.headCount}>{notifications.length} thông báo</span>
            </div>
            <div style={S.list}>
              {notifications.length === 0 ? (
                <p style={S.empty}>Chưa có thông báo nào.</p>
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
