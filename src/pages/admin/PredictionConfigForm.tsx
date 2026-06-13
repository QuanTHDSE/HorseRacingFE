import { useEffect, useState } from "react";
import { Badge } from "../../components";
import { useApp } from "../../context/AppContext";
import type { PredictionConfig } from "../../types";

interface Props {
  tournamentId: string;
  editable: boolean;
}

const ROLLOVER_OPTIONS: { value: PredictionConfig["rolloverPolicy"]; label: string }[] = [
  { value: "to_organizer",      label: "Chuyển cho ban tổ chức" },
  { value: "rollover_next_race", label: "Dồn sang cuộc đua kế tiếp" },
  { value: "refund",            label: "Hoàn lại người chơi" },
];

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

function SumBadge({ sum }: { sum: number }) {
  return (
    <Badge tone={sum === 100 ? "success" : "danger"}>
      Σ {sum}% {sum === 100 ? "✓" : "(phải = 100)"}
    </Badge>
  );
}

export default function PredictionConfigForm({ tournamentId, editable }: Props) {
  const { handleGetPredictionConfig, handleUpdatePredictionConfig } = useApp();

  const [cfg, setCfg] = useState<PredictionConfig | null>(null);
  const [rankText, setRankText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError("");
    setMsg("");
    handleGetPredictionConfig(tournamentId)
      .then((c) => {
        if (!alive) return;
        setCfg(c);
        setRankText(c ? c.rankRewardRates.join(", ") : "");
      })
      .catch((e: unknown) => alive && setLoadError(e instanceof Error ? e.message : "Không tải được cấu hình"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tournamentId, handleGetPredictionConfig]);

  function set<K extends keyof PredictionConfig>(key: K, value: PredictionConfig[K]) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMsg("");
  }
  function num(key: keyof PredictionConfig, raw: string) {
    set(key, (raw === "" ? 0 : Number(raw)) as PredictionConfig[keyof PredictionConfig]);
  }

  if (loading) return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Đang tải cấu hình dự đoán…</p>;
  if (loadError) return <div className="form-banner form-banner-error">{loadError}</div>;
  if (!cfg) return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Không có cấu hình.</p>;

  const rankRates = rankText.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
  const poolSum = cfg.organizerFeeRate + cfg.racingRewardRate + cfg.spectatorRewardRate;
  const splitSum = cfg.ownerShareRate + cfg.jockeyShareRate;
  const rankSum = rankRates.reduce((a, b) => a + b, 0);
  const valid = poolSum === 100 && splitSum === 100 && rankSum === 100;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    setMsg("");
    try {
      const updated = await handleUpdatePredictionConfig(tournamentId, {
        ...cfg,
        rankRewardRates: rankRates,
      });
      setCfg(updated);
      setRankText(updated.rankRewardRates.join(", "));
      setIsError(false);
      setMsg("Đã lưu cấu hình dự đoán.");
    } catch (err: unknown) {
      setIsError(true);
      setMsg(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const dis = !editable || saving;

  return (
    <form onSubmit={save} className="admin-form">
      {!editable && (
        <div className="form-banner" style={{ background: "var(--surface-2)" }}>
          Chỉ chỉnh cấu hình khi giải đấu ở trạng thái Draft hoặc Registration. Hiện đang ở chế độ xem.
        </div>
      )}
      {msg && <div className={`form-banner ${isError ? "form-banner-error" : "form-banner-success"}`}>{msg}</div>}

      {/* ── Cơ bản ── */}
      <h4 style={{ margin: "4px 0 8px", fontSize: "0.9rem" }}>Dự đoán</h4>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
        <input type="checkbox" checked={cfg.isEnabled} disabled={dis} onChange={(e) => set("isEnabled", e.target.checked)} />
        <span>Bật tính năng dự đoán cho giải đấu này</span>
      </label>
      <div className="form-grid-2">
        <label className="field">
          <span>Điểm mỗi dự đoán đúng</span>
          <input type="number" min={0} value={cfg.pointsPerCorrect} disabled={dis} onChange={(e) => num("pointsPerCorrect", e.target.value)} />
        </label>
        <label className="field">
          <span>Điểm thưởng đoán đúng Top 3</span>
          <input type="number" min={0} value={cfg.bonusPointsTop3} disabled={dis} onChange={(e) => num("bonusPointsTop3", e.target.value)} />
        </label>
        <label className="field">
          <span>Số dự đoán tối đa / cuộc đua</span>
          <input type="number" min={1} max={5} value={cfg.maxPredictionsPerRace} disabled={dis} onChange={(e) => num("maxPredictionsPerRace", e.target.value)} />
        </label>
        <label className="field">
          <span>Điểm tối thiểu để chia thưởng</span>
          <input type="number" min={1} value={cfg.minScoreToShare} disabled={dis} onChange={(e) => num("minScoreToShare", e.target.value)} />
        </label>
        <label className="field">
          <span>Mở dự đoán lúc</span>
          <input type="datetime-local" value={toLocalInput(cfg.predictionOpenAt)} disabled={dis} onChange={(e) => set("predictionOpenAt", fromLocalInput(e.target.value))} />
        </label>
        <label className="field">
          <span>Đóng dự đoán lúc</span>
          <input type="datetime-local" value={toLocalInput(cfg.predictionCloseAt)} disabled={dis} onChange={(e) => set("predictionCloseAt", fromLocalInput(e.target.value))} />
        </label>
      </div>

      {/* ── Pool cá cược ── */}
      <h4 style={{ margin: "18px 0 8px", fontSize: "0.9rem" }}>Quỹ thưởng (pool)</h4>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
        <input type="checkbox" checked={cfg.poolEnabled} disabled={dis} onChange={(e) => set("poolEnabled", e.target.checked)} />
        <span>Bật quỹ thưởng góp (pool)</span>
      </label>
      <div className="form-grid-2">
        <label className="field">
          <span>Phí tham gia (điểm)</span>
          <input type="number" min={0} value={cfg.entryFee} disabled={dis} onChange={(e) => num("entryFee", e.target.value)} />
        </label>
        <label className="field">
          <span>Phần trăm phí (0–30%)</span>
          <input type="number" min={0} max={30} value={cfg.feePercent} disabled={dis} onChange={(e) => num("feePercent", e.target.value)} />
        </label>
        <label className="field">
          <span>Chính sách khi pool dư</span>
          <select value={cfg.rolloverPolicy} disabled={dis} onChange={(e) => set("rolloverPolicy", e.target.value as PredictionConfig["rolloverPolicy"])}>
            {ROLLOVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {/* ── Phân bổ pool (Σ=100) ── */}
      <h4 style={{ margin: "18px 0 8px", fontSize: "0.9rem", display: "flex", gap: "10px", alignItems: "center" }}>
        Phân bổ quỹ <SumBadge sum={poolSum} />
      </h4>
      <div className="form-grid-2">
        <label className="field">
          <span>Ban tổ chức (%)</span>
          <input type="number" min={0} max={100} value={cfg.organizerFeeRate} disabled={dis} onChange={(e) => num("organizerFeeRate", e.target.value)} />
        </label>
        <label className="field">
          <span>Thưởng đua (%)</span>
          <input type="number" min={0} max={100} value={cfg.racingRewardRate} disabled={dis} onChange={(e) => num("racingRewardRate", e.target.value)} />
        </label>
        <label className="field">
          <span>Thưởng khán giả (%)</span>
          <input type="number" min={0} max={100} value={cfg.spectatorRewardRate} disabled={dis} onChange={(e) => num("spectatorRewardRate", e.target.value)} />
        </label>
      </div>

      {/* ── Chia thưởng đua (Σ=100) ── */}
      <h4 style={{ margin: "18px 0 8px", fontSize: "0.9rem", display: "flex", gap: "10px", alignItems: "center" }}>
        Chia thưởng phần "đua" <SumBadge sum={splitSum} />
      </h4>
      <div className="form-grid-2">
        <label className="field">
          <span>Chủ ngựa (%)</span>
          <input type="number" min={0} max={100} value={cfg.ownerShareRate} disabled={dis} onChange={(e) => num("ownerShareRate", e.target.value)} />
        </label>
        <label className="field">
          <span>Nài ngựa (%)</span>
          <input type="number" min={0} max={100} value={cfg.jockeyShareRate} disabled={dis} onChange={(e) => num("jockeyShareRate", e.target.value)} />
        </label>
      </div>

      {/* ── Tỷ lệ theo thứ hạng (Σ=100) ── */}
      <h4 style={{ margin: "18px 0 8px", fontSize: "0.9rem", display: "flex", gap: "10px", alignItems: "center" }}>
        Tỷ lệ thưởng theo thứ hạng <SumBadge sum={rankSum} />
      </h4>
      <label className="field">
        <span>Danh sách % theo hạng (cách nhau bởi dấu phẩy, vd: 50, 25, 15, 7, 3)</span>
        <input value={rankText} disabled={dis} onChange={(e) => { setRankText(e.target.value); setMsg(""); }} placeholder="50, 25, 15, 7, 3" />
      </label>

      {editable && (
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button type="submit" className="primary-button" disabled={saving || !valid}>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </div>
      )}
      {editable && !valid && (
        <p className="detail-action-hint" style={{ marginTop: "8px", color: "var(--danger, #dc2626)" }}>
          Mỗi nhóm tỷ lệ (phân bổ quỹ, chia thưởng đua, theo thứ hạng) phải có tổng đúng 100% mới lưu được.
        </p>
      )}
    </form>
  );
}
