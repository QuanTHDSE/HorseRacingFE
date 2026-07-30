import { useEffect, useMemo, useState } from "react";
import { Badge, DataTable, MetricCard, Panel, Spinner } from "../../components";
import { useFeedback } from "../../context/ToastContext";
import {
  api,
  type ApiAdminViolationRule,
  type ApiLegacyViolationPenalty,
  type ApiViolationCategory,
  type ApiViolationPenalty,
  type ApiViolationRuleInput,
  type ApiViolationSeverity,
} from "../../services/api";

type RuleRow = Omit<ApiAdminViolationRule, "_id" | "id" | "requiresBanDuration"> & {
  id: string;
  requiresBanDuration: boolean;
};

const CATEGORY_LABEL: Record<ApiViolationCategory, string> = {
  race_conduct: "Hành vi thi đấu",
  medical: "Y tế",
  equipment: "Trang bị",
  administrative: "Hành chính",
};

const SEVERITY_LABEL: Record<ApiViolationSeverity, string> = {
  low: "Nhẹ",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

const PENALTY_BY_SEVERITY: Record<ApiViolationSeverity, ApiViolationPenalty> = {
  low: "warning",
  medium: "result_void",
  high: "time_ban",
  critical: "permanent_ban",
};

const SEVERITY_BY_PENALTY: Record<ApiViolationPenalty, ApiViolationSeverity> = {
  warning: "low",
  result_void: "medium",
  time_ban: "high",
  permanent_ban: "critical",
};

const TARGET_LABEL = {
  horse: "Ngựa",
  jockey: "Nài ngựa",
  both: "Cả hai",
} as const;

const TARGET_OPTIONS = [
  { value: "horse", label: TARGET_LABEL.horse },
  { value: "jockey", label: TARGET_LABEL.jockey },
] as const;

const PENALTY_LABEL: Record<ApiViolationPenalty, string> = {
  warning: "Cảnh cáo",
  result_void: "Hủy kết quả",
  time_ban: "Cấm có thời hạn",
  permanent_ban: "Cấm vô thời hạn",
};

const LEGACY_PENALTY_LABEL: Record<ApiLegacyViolationPenalty, string> = {
  demote: "Hạ bậc",
  disqualify: "Tước quyền thi đấu",
  disqualification: "Tước quyền thi đấu",
  restart: "Cho xuất phát lại",
};

const PENALTY_DISPLAY_LABEL: Record<string, string> = {
  ...PENALTY_LABEL,
  ...LEGACY_PENALTY_LABEL,
};

function removeDuplicateEnglishSuffix(value: string): string {
  return value
    .replace(/\s*\(([^()]*)\)\s*$/, (suffix, content: string) => {
      const hasLatinLetters = /[A-Za-z]/.test(content);
      const hasVietnameseLetters = /[À-ỹĐđ]/u.test(content);
      return hasLatinLetters && !hasVietnameseLetters ? "" : suffix;
    })
    .trim();
}

const EMPTY_FORM: ApiViolationRuleInput = {
  code: "",
  name: "",
  description: "",
  category: "race_conduct",
  severity: "medium",
  appliesTo: "horse",
  penaltyApplied: "result_void",
  requiresBanDuration: false,
  banDurationDays: 0,
  isActive: true,
};

function normalizeRule(rule: ApiAdminViolationRule): RuleRow {
  return {
    ...rule,
    id: rule.id ?? rule._id,
    name: removeDuplicateEnglishSuffix(rule.name),
    requiresBanDuration:
      rule.requiresBanDuration ?? rule.penaltyApplied === "time_ban",
  };
}

function severityTone(
  severity: ApiViolationSeverity,
): "neutral" | "warning" | "danger" | "accent" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "accent";
  return "neutral";
}

export default function ViolationRulesPage() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [form, setForm] = useState<ApiViolationRuleInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ApiViolationCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const feedback = useFeedback();

  async function loadRules() {
    setLoading(true);
    try {
      const response = await api.adminViolationRules.list();
      setRules(response.data.map(normalizeRule));
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không tải được danh sách luật.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRules();
  }, []);

  const filteredRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          (categoryFilter === "all" || rule.category === categoryFilter) &&
          (statusFilter === "all" ||
            (statusFilter === "active" ? rule.isActive : !rule.isActive)),
      ),
    [rules, categoryFilter, statusFilter],
  );

  function setField<K extends keyof ApiViolationRuleInput>(
    key: K,
    value: ApiViolationRuleInput[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "severity") {
        next.penaltyApplied = PENALTY_BY_SEVERITY[value as ApiViolationSeverity];
      }
      if (key === "penaltyApplied") {
        next.severity = SEVERITY_BY_PENALTY[value as ApiViolationPenalty];
      }
      next.requiresBanDuration = next.penaltyApplied === "time_ban";
      if (next.requiresBanDuration && next.banDurationDays <= 0) {
        next.banDurationDays = 14;
      }
      if (!next.requiresBanDuration) {
        next.banDurationDays = 0;
      }
      return next;
    });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editRule(rule: RuleRow) {
    if (!(rule.penaltyApplied in PENALTY_LABEL)) {
      feedback.error(
        `Luật ${rule.code} đang dùng hình phạt của dữ liệu cũ “${PENALTY_DISPLAY_LABEL[rule.penaltyApplied] ?? rule.penaltyApplied}”. Cần chuyển đổi luật sang chuẩn mới trước khi chỉnh sửa.`,
      );
      return;
    }

    setEditingId(rule.id);
    setForm({
      code: rule.code,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      severity: rule.severity,
      appliesTo: rule.appliesTo === "both" ? "horse" : rule.appliesTo,
      penaltyApplied: rule.penaltyApplied as ApiViolationPenalty,
      requiresBanDuration: rule.requiresBanDuration,
      banDurationDays: rule.banDurationDays,
      isActive: rule.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.description.trim()) {
      feedback.error("Vui lòng nhập đầy đủ mã luật, tên luật và mô tả.");
      return;
    }
    if (form.penaltyApplied === "time_ban" && form.banDurationDays <= 0) {
      feedback.error("Luật cấm có thời hạn phải có số ngày cấm lớn hơn 0.");
      return;
    }
    if (form.penaltyApplied !== PENALTY_BY_SEVERITY[form.severity]) {
      feedback.error("Mức độ và hình thức xử phạt chưa khớp quy định.");
      return;
    }

    setBusy("save");
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingId) {
        const { code: _code, ...updatePayload } = payload;
        await api.adminViolationRules.update(editingId, updatePayload);
        feedback.success("Đã cập nhật luật vi phạm.");
      } else {
        await api.adminViolationRules.create(payload);
        feedback.success("Đã tạo luật vi phạm. Trọng tài có thể sử dụng ngay khi luật đang hoạt động.");
      }
      resetForm();
      await loadRules();
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không lưu được luật vi phạm.");
    } finally {
      setBusy("");
    }
  }

  async function toggleStatus(rule: RuleRow) {
    setBusy(rule.id);
    try {
      const response = await api.adminViolationRules.toggleStatus(rule.id);
      setRules((current) =>
        current.map((item) =>
          item.id === rule.id ? normalizeRule(response.data) : item,
        ),
      );
      feedback.success(response.message);
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Không đổi được trạng thái luật.");
    } finally {
      setBusy("");
    }
  }

  const activeRules = rules.filter((rule) => rule.isActive).length;
  const horseRules = rules.filter(
    (rule) => rule.appliesTo === "horse" || rule.appliesTo === "both",
  ).length;
  const jockeyRules = rules.filter(
    (rule) => rule.appliesTo === "jockey" || rule.appliesTo === "both",
  ).length;

  return (
    <div className="page-stack">
      <div className="metric-grid four">
        <MetricCard label="Tổng số luật" value={String(rules.length)} note="Trong bộ luật hệ thống" loading={loading} />
        <MetricCard label="Đang áp dụng" value={String(activeRules)} note="Trọng tài có thể chọn" tone="success" loading={loading} />
        <MetricCard label="Luật cho ngựa" value={String(horseRules)} note="Gồm luật áp dụng chung" tone="accent" loading={loading} />
        <MetricCard label="Luật cho nài" value={String(jockeyRules)} note="Gồm luật áp dụng chung" tone="warning" loading={loading} />
      </div>

      <Panel
        title={editingId ? "Chỉnh sửa luật vi phạm" : "Tạo luật vi phạm"}
        subtitle="Luật đang hoạt động sẽ xuất hiện trong màn hình lập biên bản của trọng tài"
      >
        <form className="admin-form" onSubmit={submit}>
          <div className="form-grid-2">
            <label className="field">
              <span>Mã luật <span className="required">*</span></span>
              <input
                value={form.code}
                onChange={(event) => setField("code", event.target.value.toUpperCase())}
                placeholder="Ví dụ: JCK-08"
                disabled={busy === "save" || editingId !== null}
                required
              />
              {editingId && <small>Mã luật không thể thay đổi sau khi tạo.</small>}
            </label>
            <label className="field">
              <span>Tên luật <span className="required">*</span></span>
              <input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Tên hành vi vi phạm"
                disabled={busy === "save"}
                required
              />
            </label>
            <label className="field">
              <span>Nhóm luật</span>
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value as ApiViolationCategory)}
                disabled={busy === "save"}
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Mức độ</span>
              <select
                value={form.severity}
                onChange={(event) => setField("severity", event.target.value as ApiViolationSeverity)}
                disabled={busy === "save"}
              >
                {Object.entries(SEVERITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Đối tượng áp dụng</span>
              <select
                value={form.appliesTo}
                onChange={(event) => setField("appliesTo", event.target.value as ApiViolationRuleInput["appliesTo"])}
                disabled={busy === "save"}
              >
                {TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Hình thức xử phạt</span>
              <select
                value={form.penaltyApplied}
                onChange={(event) => setField("penaltyApplied", event.target.value as ApiViolationPenalty)}
                disabled={busy === "save"}
              >
                {Object.entries(PENALTY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Yêu cầu ngày</span>
              <input value={form.requiresBanDuration ? "Có" : "Không"} disabled readOnly />
            </label>
            {form.requiresBanDuration && (
              <label className="field">
                <span>Số ngày cấm <span className="required">*</span></span>
                <input
                  type="number"
                  min={1}
                  value={form.banDurationDays}
                  onChange={(event) => setField("banDurationDays", Number(event.target.value))}
                  disabled={busy === "save"}
                  required
                />
              </label>
            )}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Mô tả <span className="required">*</span></span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                placeholder="Mô tả dấu hiệu vi phạm và cách áp dụng luật…"
                disabled={busy === "save"}
                required
              />
            </label>
            <label className="pc-switch" style={{ gridColumn: "1 / -1" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                disabled={busy === "save"}
              />
              <span className="pc-track" />
              <span className="pc-switch-text">Áp dụng luật ngay sau khi lưu</span>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={resetForm} disabled={busy === "save"}>
              {editingId ? "Hủy chỉnh sửa" : "Đặt lại"}
            </button>
            <button type="submit" className="primary-button" disabled={busy === "save"}>
              {busy === "save" ? <><Spinner size="sm" onPrimary /> Đang lưu…</> : editingId ? "Lưu thay đổi" : "Tạo luật"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Bộ luật dành cho trọng tài" subtitle="Quản lý luật và trạng thái áp dụng">
        <div className="form-grid-2" style={{ marginBottom: 16 }}>
          <label className="field">
            <span>Lọc theo nhóm</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
            >
              <option value="all">Tất cả nhóm luật</option>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Lọc theo trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang áp dụng</option>
              <option value="inactive">Đã vô hiệu hóa</option>
            </select>
          </label>
        </div>
        <DataTable
          columns={[
            {
              key: "code",
              label: "Luật",
              render: (rule) => (
                <div>
                  <strong>{rule.code}</strong>
                  <span style={{ display: "block", color: "var(--c-muted)", fontSize: "0.76rem" }}>
                    {rule.name}
                  </span>
                </div>
              ),
            },
            { key: "category", label: "Nhóm", render: (rule) => CATEGORY_LABEL[rule.category] },
            {
              key: "severity",
              label: "Mức độ",
              render: (rule) => <Badge tone={severityTone(rule.severity)}>{SEVERITY_LABEL[rule.severity]}</Badge>,
            },
            { key: "appliesTo", label: "Áp dụng", render: (rule) => TARGET_LABEL[rule.appliesTo] },
            {
              key: "requiresBanDuration",
              label: "Yêu cầu ngày",
              render: (rule) => rule.requiresBanDuration ? "Có" : "Không",
            },
            {
              key: "penaltyApplied",
              label: "Hình phạt",
              render: (rule) => (
                <span>
                  {PENALTY_DISPLAY_LABEL[rule.penaltyApplied] ?? "Hình phạt chưa xác định"}
                  {rule.requiresBanDuration && ` (${rule.banDurationDays} ngày)`}
                </span>
              ),
            },
            {
              key: "isActive",
              label: "Trạng thái",
              render: (rule) => (
                <Badge tone={rule.isActive ? "success" : "neutral"}>
                  {rule.isActive ? "Đang áp dụng" : "Đã tắt"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "Thao tác",
              render: (rule) => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" className="table-button" onClick={() => editRule(rule)} disabled={!!busy}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className={rule.isActive ? "table-button is-danger" : "table-button"}
                    onClick={() => void toggleStatus(rule)}
                    disabled={!!busy}
                  >
                    {busy === rule.id ? "Đang xử lý…" : rule.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                  </button>
                </div>
              ),
            },
          ]}
          rows={filteredRules}
          empty="Không có luật phù hợp bộ lọc."
          loading={loading}
        />
      </Panel>
    </div>
  );
}
