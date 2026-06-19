import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { PredictionConfig } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  tournamentId: string;
  editable: boolean;
}

const ROLLOVER_OPTIONS: { value: PredictionConfig["rolloverPolicy"]; label: string }[] = [
  { value: "to_organizer",       label: "Chuyển cho ban tổ chức" },
  { value: "rollover_next_race", label: "Dồn sang cuộc đua kế tiếp" },
  { value: "refund",             label: "Hoàn lại người chơi" },
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
function parseList(text: string): number[] {
  return text.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}

// ── Small presentational helpers ───────────────────────────────

function Switch({ checked, disabled, onChange, label }: {
  checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="pc-switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="pc-track" />
      <span className="pc-switch-text">{label}</span>
    </label>
  );
}

function Section({ title, sub, right, off, children }: {
  title: string; sub?: string; right?: React.ReactNode; off?: boolean; children: React.ReactNode;
}) {
  return (
    <section className={cn("pc-section", off && "is-off")}>
      <div className="pc-section-head">
        <div>
          <h4 className="pc-section-title">{title}</h4>
          {sub && <p className="pc-section-sub">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function SumChip({ sum }: { sum: number }) {
  const ok = sum === 100;
  return <span className={cn("pc-sum", ok ? "is-ok" : "is-bad")}>Σ {sum}% {ok ? "✓" : "≠ 100"}</span>;
}

function NumField({ label, value, min, max, onChange, disabled, unit }: {
  label: string; value: number; min?: number; max?: number;
  onChange: (v: number) => void; disabled?: boolean; unit?: string;
}) {
  const input = (
    <input
      type="number" min={min} max={max} value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
  return (
    <label className="field">
      <span>{label}</span>
      {unit ? <span className="pc-unit" data-unit={unit}>{input}</span> : input}
    </label>
  );
}

// ── Main form ──────────────────────────────────────────────────

export default function PredictionConfigForm({ tournamentId, editable }: Props) {
  const { handleGetPredictionConfig, handleUpdatePredictionConfig } = useApp();

  const [cfg, setCfg] = useState<PredictionConfig | null>(null);
  const [rankText, setRankText] = useState("");
  const [riskText, setRiskText] = useState("");
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
        setRiskText(c ? c.quickRiskMultipliers.join(", ") : "");
      })
      .catch((e: unknown) => alive && setLoadError(e instanceof Error ? e.message : "Không tải được cấu hình"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tournamentId, handleGetPredictionConfig]);

  function set<K extends keyof PredictionConfig>(key: K, value: PredictionConfig[K]) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMsg("");
  }

  if (loading) return <p className="pc-section-sub">Đang tải cấu hình dự đoán…</p>;
  if (loadError) return <div className="form-banner form-banner-error">{loadError}</div>;
  if (!cfg) return <p className="pc-section-sub">Không có cấu hình.</p>;

  const rankRates = parseList(rankText);
  const quickRisks = parseList(riskText);
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
        quickRiskMultipliers: quickRisks,
      });
      setCfg(updated);
      setRankText(updated.rankRewardRates.join(", "));
      setRiskText(updated.quickRiskMultipliers.join(", "));
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
  const poolOff = !cfg.poolEnabled;

  const distTotal = poolSum || 1;
  const distSegs = [
    { label: "Tổ chức",  val: cfg.organizerFeeRate,   color: "var(--c-warning)" },
    { label: "Đua",      val: cfg.racingRewardRate,    color: "var(--c-tertiary)" },
    { label: "Khán giả", val: cfg.spectatorRewardRate, color: "var(--c-primary)" },
  ];

  return (
    <form onSubmit={save} className="pc-form">
      {!editable && (
        <div className="form-banner" style={{ background: "var(--c-surf)" }}>
          Chỉ chỉnh cấu hình khi giải đấu ở trạng thái <strong>Draft</strong> hoặc <strong>Registration</strong>. Đang ở chế độ xem.
        </div>
      )}
      {msg && <div className={`form-banner ${isError ? "form-banner-error" : "form-banner-success"}`}>{msg}</div>}

      {/* ── 1. Dự đoán cơ bản ── */}
      <Section
        title="Dự đoán cơ bản"
        sub="Điểm thưởng và khung giờ cho dự đoán thường"
        right={<Switch checked={cfg.isEnabled} disabled={dis} onChange={(v) => set("isEnabled", v)} label="Bật dự đoán" />}
        off={!cfg.isEnabled}
      >
        <div className="form-grid-2">
          <NumField label="Điểm mỗi dự đoán đúng" value={cfg.pointsPerCorrect} min={0} disabled={dis || !cfg.isEnabled} onChange={(v) => set("pointsPerCorrect", v)} />
          <NumField label="Điểm thưởng đoán đúng Top 3" value={cfg.bonusPointsTop3} min={0} disabled={dis || !cfg.isEnabled} onChange={(v) => set("bonusPointsTop3", v)} />
          <NumField label="Số dự đoán tối đa / cuộc đua" value={cfg.maxPredictionsPerRace} min={1} max={5} disabled={dis || !cfg.isEnabled} onChange={(v) => set("maxPredictionsPerRace", v)} />
          <NumField label="Điểm tối thiểu để chia thưởng" value={cfg.minScoreToShare} min={1} disabled={dis || !cfg.isEnabled} onChange={(v) => set("minScoreToShare", v)} />
          <label className="field">
            <span>Mở dự đoán lúc</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionOpenAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionOpenAt", fromLocalInput(e.target.value))} />
          </label>
          <label className="field">
            <span>Đóng dự đoán lúc</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionCloseAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionCloseAt", fromLocalInput(e.target.value))} />
          </label>
        </div>
      </Section>

      {/* ── 2. Bounty Pool ── */}
      <Section
        title="Quỹ thưởng góp · Bounty Pool"
        sub="Người chơi góp điểm với mức rủi ro, đoán đúng chia lại quỹ"
        right={<Switch checked={cfg.poolEnabled} disabled={dis} onChange={(v) => set("poolEnabled", v)} label="Bật pool" />}
      >
        <p className="pc-hint">
          Điểm góp = <strong>Phí tham gia × Mức rủi ro</strong>. Đoán đúng được hoàn điểm góp và chia thêm từ
          quỹ theo <strong>điểm có trọng số rủi ro (score = điểm góp × rủi ro)</strong> — dám rủi ro cao mà đúng thì
          phần thưởng tăng theo bình phương.
        </p>
        <div className={cn(poolOff && "is-off")} style={poolOff ? { opacity: 0.5, pointerEvents: dis ? "none" : "auto" } : undefined}>
          <div className="form-grid-2">
            <NumField label="Phí tham gia (điểm)" value={cfg.entryFee} min={0} disabled={dis || poolOff} onChange={(v) => set("entryFee", v)} />
            <NumField label="Phần trăm phí giữ lại" value={cfg.feePercent} min={0} max={30} unit="%" disabled={dis || poolOff} onChange={(v) => set("feePercent", v)} />
            <NumField label="Rủi ro tối thiểu" value={cfg.minRiskMultiplier} min={1} unit="×" disabled={dis || poolOff} onChange={(v) => set("minRiskMultiplier", v)} />
            <NumField label="Rủi ro tối đa" value={cfg.maxRiskMultiplier} min={1} unit="×" disabled={dis || poolOff} onChange={(v) => set("maxRiskMultiplier", v)} />
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Các mức rủi ro nhanh (số nguyên, cách nhau dấu phẩy)</span>
              <input value={riskText} disabled={dis || poolOff} onChange={(e) => { setRiskText(e.target.value); setMsg(""); }} placeholder="1, 2, 3, 6" />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Chính sách khi quỹ dư (không ai đoán đúng)</span>
              <select value={cfg.rolloverPolicy} disabled={dis || poolOff} onChange={(e) => set("rolloverPolicy", e.target.value as PredictionConfig["rolloverPolicy"])}>
                {ROLLOVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Section>

      {/* ── 3. Phân bổ quỹ thắng ── */}
      <Section title="Phân bổ quỹ thắng (Win Pool)" sub="Tổng 3 phần phải đúng 100%" right={<SumChip sum={poolSum} />}>
        <div className="form-grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          <NumField label="Ban tổ chức" value={cfg.organizerFeeRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("organizerFeeRate", v)} />
          <NumField label="Thưởng đua (owner+jockey)" value={cfg.racingRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("racingRewardRate", v)} />
          <NumField label="Thưởng khán giả (prize pool)" value={cfg.spectatorRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("spectatorRewardRate", v)} />
        </div>
        <div style={{ marginTop: "14px" }}>
          <div className="pc-dist">
            {distSegs.map((s) => (
              <div key={s.label} className="pc-dist-seg" style={{ width: `${(s.val / distTotal) * 100}%`, background: s.color }} />
            ))}
          </div>
          <div className="pc-dist-legend">
            {distSegs.map((s) => (
              <span key={s.label}><i className="pc-dist-dot" style={{ background: s.color }} /> {s.label} · {s.val}%</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 4. Chia thưởng phần đua ── */}
      <Section title="Chia thưởng phần đua" sub="Owner và jockey của ngựa về nhất · tổng 100%" right={<SumChip sum={splitSum} />}>
        <div className="form-grid-2">
          <NumField label="Chủ ngựa (owner)" value={cfg.ownerShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("ownerShareRate", v)} />
          <NumField label="Nài ngựa (jockey)" value={cfg.jockeyShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("jockeyShareRate", v)} />
        </div>
      </Section>

      {/* ── 5. Tỷ lệ theo thứ hạng ── */}
      <Section title="Tỷ lệ thưởng theo thứ hạng" sub="Dùng cho chế độ điểm thường · tổng 100%" right={<SumChip sum={rankSum} />}>
        <label className="field">
          <span>Danh sách % theo hạng (cách nhau dấu phẩy)</span>
          <input value={rankText} disabled={dis} onChange={(e) => { setRankText(e.target.value); setMsg(""); }} placeholder="50, 25, 15, 7, 3" />
        </label>
      </Section>

      {editable && (
        <>
          {!valid && (
            <p className="pc-section-sub" style={{ color: "var(--c-danger)", fontWeight: 600 }}>
              ⚠ Mỗi nhóm tỷ lệ (phân bổ quỹ, chia thưởng đua, theo thứ hạng) phải có tổng đúng 100% mới lưu được.
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving || !valid}>
              {saving ? "Đang lưu…" : "Lưu cấu hình"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
