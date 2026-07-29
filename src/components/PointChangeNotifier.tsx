import { useEffect, useMemo, useRef, useState } from "react";
import { api, type ApiSpectatorPoints } from "../services/api";
import { useToast } from "../context/ToastContext";
import type { Role, SpectatorPointsSummary } from "../types";

interface Props {
  userId: string;
  role: Role;
  onPointsChange?: (points: SpectatorPointsSummary) => void;
}

type PointTx = ApiSpectatorPoints["transactions"][number];

function txKey(tx: PointTx): string {
  return tx.id || `${tx.createdAt}:${tx.points}:${tx.type}`;
}

function describe(tx: PointTx): string {
  return tx.note || tx.type.replace(/_/g, " ");
}

export default function PointChangeNotifier({ userId, role, onPointsChange }: Props) {
  const toast = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [lastTx, setLastTx] = useState<PointTx | null>(null);
  const seenRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const enabled = ["owner", "jockey", "spectator"].includes(role);

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
        onPointsChange?.({
          currentBalance: res.points.currentBalance,
          totalPointsEarned: res.points.totalPointsEarned,
          totalPointsSpent: res.points.totalPointsSpent,
        });
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
  }, [enabled, onPointsChange, storageKey, toast]);

  if (!enabled || balance === null) return null;

  const tone = lastTx && lastTx.points < 0 ? "negative" : "positive";
  return (
    <div className={`header-point-wallet is-${tone}`} aria-live="polite">
      <span className="header-point-wallet-dot" aria-hidden="true" />
      <span>
        Ví điểm: <strong>{balance.toLocaleString("vi-VN")}</strong>
      </span>
    </div>
  );
}
