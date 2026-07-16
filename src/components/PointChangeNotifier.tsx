import { useEffect, useMemo, useRef, useState } from "react";
import { api, type ApiSpectatorPoints } from "../services/api";
import { useToast } from "../context/ToastContext";
import type { Role } from "../types";

interface Props {
  userId: string;
  role: Role;
}

type PointTx = ApiSpectatorPoints["transactions"][number];

function txKey(tx: PointTx): string {
  return tx.id || `${tx.createdAt}:${tx.points}:${tx.type}`;
}

function describe(tx: PointTx): string {
  return tx.note || tx.type.replace(/_/g, " ");
}

export default function PointChangeNotifier({ userId, role }: Props) {
  const toast = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [lastTx, setLastTx] = useState<PointTx | null>(null);
  const seenRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const enabled = role !== "admin";

  const storageKey = useMemo(() => `horse-race:last-point-tx:${userId}`, [userId]);

  useEffect(() => {
    if (!enabled) return;
    seenRef.current = window.localStorage.getItem(storageKey);
    readyRef.current = false;

    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const res = await api.points.getMine();
        if (cancelled) return;
        setBalance(res.points.currentBalance);
        const newest = res.points.transactions[0];
        if (!newest) {
          readyRef.current = true;
          return;
        }

        const key = txKey(newest);
        if (!seenRef.current) {
          seenRef.current = key;
          window.localStorage.setItem(storageKey, key);
          readyRef.current = true;
          return;
        }

        if (readyRef.current && key !== seenRef.current) {
          setLastTx(newest);
          const amount = Math.abs(newest.points).toLocaleString("vi-VN");
          if (newest.points > 0) {
            toast.success(`+${amount} điểm`, describe(newest));
          } else if (newest.points < 0) {
            toast.error(`-${amount} điểm`, describe(newest));
          }
        }
        seenRef.current = key;
        window.localStorage.setItem(storageKey, key);
        readyRef.current = true;
      } catch {
        // Wallet polling is non-critical; keep the UI quiet if a role has no wallet yet.
      }
    }

    poll();
    timer = window.setInterval(poll, 6000);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, storageKey, toast]);

  if (!enabled || balance === null) return null;

  const tone = lastTx && lastTx.points < 0 ? "negative" : "positive";
  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "9px 12px",
        background: "rgba(20, 20, 20, 0.88)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
        pointerEvents: "none",
        fontSize: 13,
        maxWidth: "min(320px, calc(100vw - 32px))",
      }}
      aria-live="polite"
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: tone === "negative" ? "#ef4444" : "#22c55e",
          boxShadow: `0 0 0 4px ${tone === "negative" ? "rgba(239,68,68,.18)" : "rgba(34,197,94,.18)"}`,
          flex: "0 0 auto",
        }}
      />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        Ví điểm: <strong>{balance.toLocaleString("vi-VN")}</strong>
      </span>
    </div>
  );
}
