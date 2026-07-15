import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import type { PredictionConfig } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  tournamentId: string;
  editable: boolean;
}

const ROLLOVER_OPTIONS: { value: PredictionConfig["rolloverPolicy"]; label: string }[] = [
  { value: "to_organizer",       label: "Chuyển về ban tổ chức" },
  { value: "rollover_next_race", label: "Chuyển sang cuộc đua kế tiếp" },
  { value: "refund",             label: "Hoàn điểm cho người chơi" },
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
  return text.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
}

function uniquePositiveIntegers(values: number[]): number[] {
  return [...new Set(values.filter((n) => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b);
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
  const [fixedPrizeText, setFixedPrizeText] = useState("");
  const [ticketPresetText, setTicketPresetText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const fb = useFeedback();
  const msg: string = ""; const setMsg = fb.success;
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
        setFixedPrizeText(c ? c.fixedPrizeRankRates.join(", ") : "");
        setTicketPresetText(c ? c.quickRiskMultipliers.join(", ") : "");
      })
      .catch((e: unknown) => alive && setLoadError(e instanceof Error ? e.message : "Không tải được cấu hình dự đoán."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tournamentId, handleGetPredictionConfig]);

  function set<K extends keyof PredictionConfig>(key: K, value: PredictionConfig[K]) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
    setMsg("");
  }

  function setRankRates(next: number[]) {
    setRankText(next.join(", "));
    setMsg("");
  }

  function setFixedPrizeRates(next: number[]) {
    setFixedPrizeText(next.join(", "));
    setMsg("");
  }

  if (loading) return <p className="pc-section-sub">Đang tải cấu hình dự đoán...</p>;
  if (loadError) return <div className="form-banner form-banner-error">{loadError}</div>;
  if (!cfg) return <p className="pc-section-sub">Chưa có cấu hình dự đoán.</p>;

  const rankRates = parseList(rankText);
  const fixedPrizeRates = parseList(fixedPrizeText);
  const ticketPresets = uniquePositiveIntegers(parseList(ticketPresetText));
  const poolSum = cfg.organizerFeeRate + cfg.racingRewardRate + cfg.spectatorRewardRate;
  const roleSplitSum = cfg.ownerShareRate + cfg.jockeyShareRate;
  const rankSum = rankRates.reduce((a, b) => a + b, 0);
  const fixedPrizeSum = fixedPrizeRates.reduce((a, b) => a + b, 0);
  const fixedPrizeValid = fixedPrizeRates.length === cfg.fixedPrizeTopCount && fixedPrizeSum === 100;
  const ticketPresetsValid = !cfg.poolEnabled || ticketPresets.length > 0;
  const minTicketCount = ticketPresets[0] ?? cfg.minRiskMultiplier;
  const maxTicketCount = ticketPresets[ticketPresets.length - 1] ?? cfg.maxRiskMultiplier;
  const valid = poolSum === 100 && roleSplitSum === 100 && rankSum === 100 && fixedPrizeValid && ticketPresetsValid;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    setMsg("");
    try {
      const updated = await handleUpdatePredictionConfig(tournamentId, {
        ...cfg,
        entryFee: cfg.ticketPrice,
        rankRewardRates: rankRates,
        fixedPrizeRankRates: fixedPrizeRates,
        quickRiskMultipliers: ticketPresets,
        minRiskMultiplier: minTicketCount,
        maxRiskMultiplier: maxTicketCount,
      });
      setCfg(updated);
      setRankText(updated.rankRewardRates.join(", "));
      setFixedPrizeText(updated.fixedPrizeRankRates.join(", "));
      setTicketPresetText(updated.quickRiskMultipliers.join(", "));
      setIsError(false);
      setMsg("Đã lưu cấu hình dự đoán.");
    } catch (err: unknown) {
      setIsError(true);
      setMsg(err instanceof Error ? err.message : "Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const dis = !editable || saving;
  const poolOff = !cfg.poolEnabled;

  const distTotal = poolSum || 1;
  const distSegs = [
    { label: "Ban tổ chức", val: cfg.organizerFeeRate,   color: "var(--c-warning)" },
    { label: "Thưởng cuộc đua", val: cfg.racingRewardRate, color: "var(--c-tertiary)" },
    { label: "Quỹ thưởng khán giả", val: cfg.spectatorRewardRate, color: "var(--c-primary)" },
  ];

  return (
    <form onSubmit={save} className="pc-form">
      {!editable && (
        <div className="form-banner" style={{ background: "var(--c-surf)" }}>
          Chỉ có thể chỉnh cấu hình dự đoán khi giải đấu ở trạng thái <strong>Nháp</strong> hoặc <strong>Đang mở đăng ký</strong>. Hiện đang ở chế độ chỉ xem.
        </div>
      )}
      {msg && <div className={`form-banner ${isError ? "form-banner-error" : "form-banner-success"}`}>{msg}</div>}

      {/* ── 1. Prediction availability ── */}
      <Section
        title="Trạng thái dự đoán"
        sub="Mở hoặc đóng tính năng dự đoán cho giải đấu này"
        right={<Switch checked={cfg.isEnabled} disabled={dis} onChange={(v) => set("isEnabled", v)} label="Bật dự đoán" />}
        off={!cfg.isEnabled}
      >
        <div className="form-grid-2">
          <NumField label="Số lượt dự đoán mỗi cuộc đua" value={cfg.maxPredictionsPerRace} min={1} max={5} disabled={dis || !cfg.isEnabled} onChange={(v) => set("maxPredictionsPerRace", v)} />
          <label className="field">
            <span>Thời điểm mở dự đoán</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionOpenAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionOpenAt", fromLocalInput(e.target.value))} />
          </label>
          <label className="field">
            <span>Thời điểm đóng dự đoán</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionCloseAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionCloseAt", fromLocalInput(e.target.value))} />
          </label>
        </div>
      </Section>

      {/* ── 2. Bounty Pool ── */}
      <Section
        title="Quỹ thưởng dự đoán"
        sub="Người chơi mua vé dự đoán; người thắng chia quỹ thưởng"
        right={<Switch checked={cfg.poolEnabled} disabled={dis} onChange={(v) => set("poolEnabled", v)} label="Bật quỹ thưởng" />}
      >
        <p className="pc-hint">
          Chi phí = <strong>giá vé × số vé</strong>. Dự đoán đúng được hoàn chi phí vé và
          chia quỹ thưởng khán giả theo <strong>số vé</strong>.
        </p>
        <div className={cn(poolOff && "is-off")} style={poolOff ? { opacity: 0.5, pointerEvents: dis ? "none" : "auto" } : undefined}>
          <div className="form-grid-2">
            <NumField label="Giá vé dự đoán (điểm)" value={cfg.ticketPrice} min={0} disabled={dis || poolOff} onChange={(v) => set("ticketPrice", v)} />
            <NumField label="Số vé thắng tối thiểu để chia quỹ" value={cfg.minScoreToShare} min={1} disabled={dis || poolOff} onChange={(v) => set("minScoreToShare", v)} />
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Các mức số vé gợi ý (số nguyên dương, cách nhau bằng dấu phẩy)</span>
              <input value={ticketPresetText} disabled={dis || poolOff} onChange={(e) => { setTicketPresetText(e.target.value); setMsg(""); }} placeholder="1, 2, 3, 6" />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Cách xử lý quỹ chưa có người nhận</span>
              <select value={cfg.rolloverPolicy} disabled={dis || poolOff} onChange={(e) => set("rolloverPolicy", e.target.value as PredictionConfig["rolloverPolicy"])}>
                {ROLLOVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Section>

      {/* ── 3. Pool distribution ── */}
      <Section title="Phân bổ quỹ" sub="Ba tỷ lệ phải có tổng bằng 100%" right={<SumChip sum={poolSum} />}>
        <div className="form-grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          <NumField label="Phí ban tổ chức" value={cfg.organizerFeeRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("organizerFeeRate", v)} />
          <NumField label="Thưởng cuộc đua" value={cfg.racingRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("racingRewardRate", v)} />
          <NumField label="Quỹ thưởng khán giả" value={cfg.spectatorRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("spectatorRewardRate", v)} />
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

      {/* ── 4. Owner/Jockey split ── */}
      <Section
        title="Giải thưởng cố định của cuộc đua"
        sub="Tổng thưởng giải đấu chỉ trả cho top 4 hoặc top 5 ngựa hợp lệ; ngựa bị loại không nhận thưởng"
        right={<SumChip sum={fixedPrizeSum} />}
      >
        <div className="form-grid-2">
          <label className="field">
            <span>Hạng được nhận thưởng</span>
            <select
              value={cfg.fixedPrizeTopCount}
              disabled={dis}
              onChange={(e) => {
                const topCount = Number(e.target.value) as 4 | 5;
                set("fixedPrizeTopCount", topCount);
                setFixedPrizeRates(topCount === 4 ? [55, 25, 12, 8] : [50, 25, 12, 8, 5]);
              }}
            >
              <option value={4}>Top 4</option>
              <option value={5}>Top 5</option>
            </select>
          </label>
          <label className="field">
            <span>Tỷ lệ thưởng cố định</span>
            <input
              value={fixedPrizeText}
              disabled={dis}
              onChange={(e) => { setFixedPrizeText(e.target.value); setMsg(""); }}
              placeholder={cfg.fixedPrizeTopCount === 4 ? "55, 25, 12, 8" : "50, 25, 12, 8, 5"}
            />
          </label>
        </div>
        <div style={{ overflowX: "auto", marginTop: "12px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Tỷ lệ thưởng</th>
                <th>Dự kiến cho chủ ngựa</th>
                <th>Dự kiến cho nài ngựa</th>
              </tr>
            </thead>
            <tbody>
              {fixedPrizeRates.map((rate, idx) => {
                const ownerPreview = Math.floor((rate * cfg.ownerShareRate) / 100);
                const jockeyPreview = rate - ownerPreview;
                return (
                  <tr key={idx}>
                    <td>Hạng {idx + 1}</td>
                    <td>{rate}%</td>
                    <td>{ownerPreview}%</td>
                    <td>{jockeyPreview}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 5. Owner/Jockey split ── */}
      <Section
        title="Tỷ lệ chia cho chủ ngựa / nài ngựa"
        sub="Áp dụng cho cả giải thưởng cố định và quỹ thưởng cuộc đua"
        right={<SumChip sum={roleSplitSum} />}
      >
        <div className="form-grid-2">
          <NumField label="Phần của chủ ngựa" value={cfg.ownerShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("ownerShareRate", v)} />
          <NumField label="Phần của nài ngựa" value={cfg.jockeyShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("jockeyShareRate", v)} />
        </div>
      </Section>

      {/* ── 6. Rank reward split ── */}
      <Section
        title="Tỷ lệ thưởng theo hạng"
        sub="Dùng cho quỹ thưởng cuộc đua và hiển thị theo bảng xếp hạng; tổng tỷ lệ phải bằng 100%"
        right={<SumChip sum={rankSum} />}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Tỷ lệ theo hạng</th>
                <th>Phần chủ ngựa</th>
                <th>Phần nài ngựa</th>
                <th>Dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {rankRates.map((rate, idx) => {
                const ownerPreview = Math.floor((rate * cfg.ownerShareRate) / 100);
                const jockeyPreview = rate - ownerPreview;
                return (
                  <tr key={idx}>
                    <td>Hạng {idx + 1}</td>
                    <td>
                      <span className="pc-unit" data-unit="%">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rate}
                          disabled={dis}
                          onChange={(e) => {
                            const next = rankRates.slice();
                            next[idx] = Number(e.target.value);
                            setRankRates(next);
                          }}
                        />
                      </span>
                    </td>
                    <td>{cfg.ownerShareRate}%</td>
                    <td>{cfg.jockeyShareRate}%</td>
                    <td>{ownerPreview}% chủ ngựa / {jockeyPreview}% nài ngựa</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="form-actions" style={{ marginTop: "12px" }}>
          <button type="button" className="table-button" disabled={dis} onClick={() => setRankRates([...rankRates, 0])}>
            Thêm hạng
          </button>
          <button type="button" className="table-button" disabled={dis || rankRates.length <= 1} onClick={() => setRankRates(rankRates.slice(0, -1))}>
            Xóa hạng cuối
          </button>
        </div>
      </Section>

      {editable && (
        <>
          {!valid && (
            <p className="pc-section-sub" style={{ color: "var(--c-danger)", fontWeight: 600 }}>
              Phân bổ quỹ, tỷ lệ thưởng cố định, tỷ lệ chủ ngựa/nài ngựa và tỷ lệ thưởng theo hạng đều phải có tổng bằng 100%. Các mức số vé gợi ý phải có ít nhất một số nguyên dương.
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving || !valid}>
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
