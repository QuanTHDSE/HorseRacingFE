import { useEffect, useState } from "react";
import Badge from "./Badge";
import { useApp } from "../context/AppContext";
import type { RaceLeaderboard as RaceLeaderboardData } from "../types";

interface Props {
  raceId: string;
  /** Ngựa cần làm nổi bật (vd: ngựa của owner đang đăng nhập). */
  highlightHorseIds?: string[];
  /** Nài cần làm nổi bật (vd: chính jockey đang đăng nhập). */
  highlightJockeyId?: string;
  /** Ẩn phần tiêu đề race (khi parent đã hiển thị tên race). */
  hideHeader?: boolean;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function fmtTime(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)}s`;
}

export default function RaceLeaderboard({ raceId, highlightHorseIds, highlightJockeyId, hideHeader }: Props) {
  const { handleGetRaceLeaderboard } = useApp();
  const [data, setData] = useState<RaceLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    handleGetRaceLeaderboard(raceId)
      .then((d) => { if (alive) setData(d); })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : "Không tải được bảng xếp hạng"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [raceId, handleGetRaceLeaderboard]);

  const hlHorses = new Set(highlightHorseIds ?? []);

  if (loading) return <p style={{ color: "var(--c-muted)", fontSize: "0.85rem", margin: 0 }}>Đang tải bảng xếp hạng…</p>;
  if (error) return <div className="form-banner form-banner-error">{error}</div>;
  if (!data) return null;

  if (data.stage === null || data.rankings.length === 0) {
    return (
      <p style={{ color: "var(--c-muted)", fontSize: "0.85rem", margin: 0 }}>
        Kết quả chưa được công bố cho cuộc đua này.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <strong>{data.raceName}</strong>
          <span style={{ color: "var(--c-muted)", fontSize: "0.8rem" }}>
            vòng {data.round}{data.distance ? ` · ${data.distance}m` : ""}{data.tournamentName ? ` · ${data.tournamentName}` : ""}
          </span>
        </div>
      )}

      {data.stage === "confirmed" && (
        <div style={{ fontSize: "0.75rem", color: "var(--c-muted)" }}>
          <Badge tone="warning">Đã xác nhận</Badge> Bản nháp — chưa công bố (chỉ admin/trọng tài thấy).
        </div>
      )}

      <div className="table-shell" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "56px" }}>Hạng</th>
              <th>Ngựa</th>
              <th>Nài</th>
              <th style={{ textAlign: "right" }}>Thời gian</th>
              <th style={{ textAlign: "right" }}>Cách biệt</th>
              <th style={{ textAlign: "right" }}>Giải</th>
            </tr>
          </thead>
          <tbody>
            {data.rankings.map((r) => {
              const highlighted = hlHorses.has(r.horse.id) || (highlightJockeyId && r.jockey.id === highlightJockeyId);
              return (
                <tr
                  key={`${r.horse.id}-${r.rank}`}
                  style={{
                    background: highlighted ? "color-mix(in srgb, var(--c-accent) 14%, transparent)" : undefined,
                    opacity: r.isDisqualified ? 0.6 : 1,
                  }}
                >
                  <td style={{ fontWeight: 600 }}>
                    {MEDAL[r.rank] ?? ""} {r.rank}
                    {r.isDeadHeat && <span title="Đồng hạng" style={{ color: "var(--c-muted)" }}> =</span>}
                  </td>
                  <td style={{ textDecoration: r.isDisqualified ? "line-through" : undefined }}>
                    {r.horse.name}
                    {highlighted && <Badge tone="accent">của bạn</Badge>}
                    {r.isDisqualified && <Badge tone="danger">DQ</Badge>}
                  </td>
                  <td>{r.jockey.fullName}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtTime(r.finishTime)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--c-muted)" }}>
                    {r.rank === 1 ? "—" : r.marginBehind != null ? `+${r.marginBehind.toFixed(2)}s` : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {r.prize > 0 ? r.prize.toLocaleString("vi-VN") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
