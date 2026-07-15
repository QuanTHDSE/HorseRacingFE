import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type ToastTone = "success" | "error" | "info" | "warning";

interface ToastData {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}

export interface ToastApi {
  show: (tone: ToastTone, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastTone, { color: string; icon: string }> = {
  success: { color: "var(--c-success, #1a7a4c)", icon: "✓" },
  error: { color: "var(--c-danger, #b42b1e)", icon: "✕" },
  info: { color: "var(--c-info, #1a5fa8)", icon: "ℹ" },
  warning: { color: "var(--c-warning, #b25e00)", icon: "!" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((tone: ToastTone, title: string, message?: string) => {
    if (!title || !title.trim()) return;
    const id = `t${Date.now()}_${++idRef.current}`;
    setToasts((list) => [...list, { id, tone, title, message }].slice(-5)); // giữ tối đa 5 toast
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (t, m) => show("success", t, m),
    error: (t, m) => show("error", t, m),
    info: (t, m) => show("info", t, m),
    warning: (t, m) => show("warning", t, m),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={VIEWPORT}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VIEWPORT: CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: "min(360px, 92vw)",
  pointerEvents: "none",
};

function ToastCard({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const tone = TONE[toast.tone];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const duration = toast.tone === "error" ? 6000 : 4000;
    const timer = setTimeout(onClose, duration);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [toast.tone, onClose]);

  return (
    <div
      role="status"
      onClick={onClose}
      style={{
        pointerEvents: "auto",
        cursor: "pointer",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        background: "var(--c-surface, #fff)",
        border: "1px solid var(--c-outline-var, #ddd)",
        borderLeft: `4px solid ${tone.color}`,
        borderRadius: 12,
        boxShadow: "0 10px 28px rgba(0,0,0,.18)",
        transform: shown ? "translateX(0)" : "translateX(20px)",
        opacity: shown ? 1 : 0,
        transition: "transform .22s ease, opacity .22s ease",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: tone.color,
          color: "#fff",
          fontSize: "0.78rem",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {tone.icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ display: "block", fontSize: "0.86rem", lineHeight: 1.35 }}>{toast.title}</strong>
        {toast.message && (
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--c-muted, #666)", lineHeight: 1.4 }}>
            {toast.message}
          </p>
        )}
      </div>
      <span style={{ flexShrink: 0, color: "var(--c-muted, #999)", fontSize: "0.9rem", lineHeight: 1 }} aria-hidden>✕</span>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được dùng bên trong <ToastProvider>");
  return ctx;
}

/**
 * Drop-in cho các trang đang dùng state banner: trả về 2 setter bắn toast,
 * bỏ qua chuỗi rỗng (khi trang gọi setError("") để xoá thì không hiện toast).
 * Cách dùng: `const fb = useFeedback();` rồi
 *   `const someError = ""; const setSomeError = fb.error;`
 *   `const someMsg = "";   const setSomeMsg   = fb.success;`
 */
export function useFeedback() {
  const toast = useToast();
  const success = useCallback((m?: string) => { if (m && m.trim()) toast.success(m); }, [toast]);
  const error = useCallback((m?: string) => { if (m && m.trim()) toast.error(m); }, [toast]);
  const info = useCallback((m?: string) => { if (m && m.trim()) toast.info(m); }, [toast]);
  return { success, error, info };
}
