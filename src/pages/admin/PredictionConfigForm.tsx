import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { PredictionConfig } from "../../types";
import { cn } from "../../utils/cn";

interface Props {
  tournamentId: string;
  editable: boolean;
}

const ROLLOVER_OPTIONS: { value: PredictionConfig["rolloverPolicy"]; label: string }[] = [
  { value: "to_organizer",       label: "Transfer to organizer" },
  { value: "rollover_next_race", label: "Roll over to next race" },
  { value: "refund",             label: "Refund players" },
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
  const [ticketPresetText, setTicketPresetText] = useState("");
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
        setTicketPresetText(c ? c.quickRiskMultipliers.join(", ") : "");
      })
      .catch((e: unknown) => alive && setLoadError(e instanceof Error ? e.message : "Could not load prediction configuration."))
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

  if (loading) return <p className="pc-section-sub">Loading prediction configuration...</p>;
  if (loadError) return <div className="form-banner form-banner-error">{loadError}</div>;
  if (!cfg) return <p className="pc-section-sub">No prediction configuration found.</p>;

  const rankRates = parseList(rankText);
  const ticketPresets = uniquePositiveIntegers(parseList(ticketPresetText));
  const poolSum = cfg.organizerFeeRate + cfg.racingRewardRate + cfg.spectatorRewardRate;
  const roleSplitSum = cfg.ownerShareRate + cfg.jockeyShareRate;
  const rankSum = rankRates.reduce((a, b) => a + b, 0);
  const ticketPresetsValid = !cfg.poolEnabled || ticketPresets.length > 0;
  const minTicketCount = ticketPresets[0] ?? cfg.minRiskMultiplier;
  const maxTicketCount = ticketPresets[ticketPresets.length - 1] ?? cfg.maxRiskMultiplier;
  const valid = poolSum === 100 && roleSplitSum === 100 && rankSum === 100 && ticketPresetsValid;

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
        quickRiskMultipliers: ticketPresets,
        minRiskMultiplier: minTicketCount,
        maxRiskMultiplier: maxTicketCount,
      });
      setCfg(updated);
      setRankText(updated.rankRewardRates.join(", "));
      setTicketPresetText(updated.quickRiskMultipliers.join(", "));
      setIsError(false);
      setMsg("Prediction configuration saved.");
    } catch (err: unknown) {
      setIsError(true);
      setMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const dis = !editable || saving;
  const poolOff = !cfg.poolEnabled;

  const distTotal = poolSum || 1;
  const distSegs = [
    { label: "Organizer", val: cfg.organizerFeeRate,   color: "var(--c-warning)" },
    { label: "Racing rewards", val: cfg.racingRewardRate, color: "var(--c-tertiary)" },
    { label: "Spectator prize pool", val: cfg.spectatorRewardRate, color: "var(--c-primary)" },
  ];

  return (
    <form onSubmit={save} className="pc-form">
      {!editable && (
        <div className="form-banner" style={{ background: "var(--c-surf)" }}>
          Prediction settings are editable only while the tournament is in <strong>Draft</strong> or <strong>Registration</strong>. View-only mode is active.
        </div>
      )}
      {msg && <div className={`form-banner ${isError ? "form-banner-error" : "form-banner-success"}`}>{msg}</div>}

      {/* ── 1. Basic prediction settings ── */}
      <Section
        title="Basic Prediction"
        sub="Base scoring and prediction window"
        right={<Switch checked={cfg.isEnabled} disabled={dis} onChange={(v) => set("isEnabled", v)} label="Enable prediction" />}
        off={!cfg.isEnabled}
      >
        <div className="form-grid-2">
          <NumField label="Points per correct prediction" value={cfg.pointsPerCorrect} min={0} disabled={dis || !cfg.isEnabled} onChange={(v) => set("pointsPerCorrect", v)} />
          <NumField label="Top 3 bonus points" value={cfg.bonusPointsTop3} min={0} disabled={dis || !cfg.isEnabled} onChange={(v) => set("bonusPointsTop3", v)} />
          <NumField label="Predictions per race" value={cfg.maxPredictionsPerRace} min={1} max={5} disabled={dis || !cfg.isEnabled} onChange={(v) => set("maxPredictionsPerRace", v)} />
          <NumField label="Minimum score to share prizes" value={cfg.minScoreToShare} min={1} disabled={dis || !cfg.isEnabled} onChange={(v) => set("minScoreToShare", v)} />
          <label className="field">
            <span>Prediction opens at</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionOpenAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionOpenAt", fromLocalInput(e.target.value))} />
          </label>
          <label className="field">
            <span>Prediction closes at</span>
            <input type="datetime-local" value={toLocalInput(cfg.predictionCloseAt)} disabled={dis || !cfg.isEnabled} onChange={(e) => set("predictionCloseAt", fromLocalInput(e.target.value))} />
          </label>
        </div>
      </Section>

      {/* ── 2. Bounty Pool ── */}
      <Section
        title="Bounty Pool"
        sub="Players buy prediction tickets; winners share the pool"
        right={<Switch checked={cfg.poolEnabled} disabled={dis} onChange={(v) => set("poolEnabled", v)} label="Enable pool" />}
      >
        <p className="pc-hint">
          Cost = <strong>ticket price × ticket count</strong>. Correct predictions get their ticket cost back and
          share the spectator prize pool by <strong>ticket count</strong>.
        </p>
        <div className={cn(poolOff && "is-off")} style={poolOff ? { opacity: 0.5, pointerEvents: dis ? "none" : "auto" } : undefined}>
          <div className="form-grid-2">
            <NumField label="Ticket price (points)" value={cfg.ticketPrice} min={0} disabled={dis || poolOff} onChange={(v) => set("ticketPrice", v)} />
            <NumField label="Platform fee" value={cfg.feePercent} min={0} max={30} unit="%" disabled={dis || poolOff} onChange={(v) => set("feePercent", v)} />
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Ticket count presets (positive integers, comma-separated)</span>
              <input value={ticketPresetText} disabled={dis || poolOff} onChange={(e) => { setTicketPresetText(e.target.value); setMsg(""); }} placeholder="1, 2, 3, 6" />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Unclaimed pool policy</span>
              <select value={cfg.rolloverPolicy} disabled={dis || poolOff} onChange={(e) => set("rolloverPolicy", e.target.value as PredictionConfig["rolloverPolicy"])}>
                {ROLLOVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Section>

      {/* ── 3. Pool distribution ── */}
      <Section title="Pool Distribution" sub="The three shares must add up to 100%" right={<SumChip sum={poolSum} />}>
        <div className="form-grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          <NumField label="Organizer fee" value={cfg.organizerFeeRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("organizerFeeRate", v)} />
          <NumField label="Racing rewards" value={cfg.racingRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("racingRewardRate", v)} />
          <NumField label="Spectator prize pool" value={cfg.spectatorRewardRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("spectatorRewardRate", v)} />
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
        title="Owner / Jockey Split"
        sub="Applied to both fixed race prizes and bounty racing rewards"
        right={<SumChip sum={roleSplitSum} />}
      >
        <div className="form-grid-2">
          <NumField label="Horse owner share" value={cfg.ownerShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("ownerShareRate", v)} />
          <NumField label="Jockey share" value={cfg.jockeyShareRate} min={0} max={100} unit="%" disabled={dis} onChange={(v) => set("jockeyShareRate", v)} />
        </div>
      </Section>

      {/* ── 5. Rank reward split ── */}
      <Section
        title="Rank Reward Split"
        sub="Used for racing rewards and displayed as a rank table; the values must add up to 100%"
        right={<SumChip sum={rankSum} />}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Rank share</th>
                <th>Owner share</th>
                <th>Jockey share</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {rankRates.map((rate, idx) => {
                const ownerPreview = Math.floor((rate * cfg.ownerShareRate) / 100);
                const jockeyPreview = rate - ownerPreview;
                return (
                  <tr key={idx}>
                    <td>Rank {idx + 1}</td>
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
                    <td>{ownerPreview}% owner / {jockeyPreview}% jockey</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="form-actions" style={{ marginTop: "12px" }}>
          <button type="button" className="table-button" disabled={dis} onClick={() => setRankRates([...rankRates, 0])}>
            Add rank
          </button>
          <button type="button" className="table-button" disabled={dis || rankRates.length <= 1} onClick={() => setRankRates(rankRates.slice(0, -1))}>
            Remove last rank
          </button>
        </div>
      </Section>

      {editable && (
        <>
          {!valid && (
            <p className="pc-section-sub" style={{ color: "var(--c-danger)", fontWeight: 600 }}>
              Pool distribution, owner/jockey split, and rank reward split must each add up to 100%. Ticket count presets must contain at least one positive integer.
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving || !valid}>
              {saving ? "Saving..." : "Save configuration"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
