import { useState } from "react";

interface ConfirmDeleteButtonProps {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
  onDeleted?: () => void;
  disabled?: boolean;
}

/**
 * Two-step inline delete: first click asks for confirmation, second click deletes.
 * Self-manages loading state and shows its own error message (red) on failure.
 */
export default function ConfirmDeleteButton({
  onConfirm,
  label = "Xóa",
  confirmLabel = "Xác nhận?",
  onDeleted,
  disabled,
}: ConfirmDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function doDelete() {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onDeleted?.();
      setConfirming(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xóa thất bại.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
      {confirming ? (
        <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
          <button type="button" className="table-button is-danger" disabled={loading} onClick={doDelete}>
            {loading ? "…" : confirmLabel}
          </button>
          <button type="button" className="table-button" disabled={loading} onClick={() => setConfirming(false)}>
            Hủy
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="table-button is-danger"
          disabled={disabled}
          onClick={() => { setError(""); setConfirming(true); }}
        >
          {label}
        </button>
      )}
      {error && (
        <span style={{ fontSize: "0.78rem", color: "var(--danger, #dc2626)" }}>{error}</span>
      )}
    </div>
  );
}
