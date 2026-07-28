import { useState } from "react";
import { Badge, DataTable, Panel, Spinner } from "../../components";
import { useApp } from "../../context/AppContext";
import { useFeedback } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { viRaceStatus, viRegStatus } from "../../utils/viLabels";

type RegFilter = "all" | "Pending" | "Approved" | "Rejected";

const STATUS_TONE: Record<string, string> = {
  Pending:  "warning",
  Approved: "success",
  Rejected: "danger",
};

const RACE_STATUS_TONE: Record<string, string> = {
  Upcoming:  "accent",
  Ready:     "warning",
  Live:      "success",
  Completed: "neutral",
  Cancelled: "danger",
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function OwnerSchedulePage() {
  const { appState, isDataLoading, handleRegisterForRace } = useApp();

  // Registration form
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedRace, setSelectedRace]             = useState("");
  const [selectedHorse, setSelectedHorse]           = useState("");
  const [regLoading, setRegLoading]                 = useState(false);
  const fb = useFeedback();
  const regError: string = ""; const setRegError = fb.error;
  const regSuccess: string = ""; const setRegSuccess = fb.success;

  // List filter
  const [filter, setFilter] = useState<RegFilter>("all");

  const horses      = appState.horses;
  const tournaments = appState.tournaments;
  const regs        = appState.ownerRegistrations;
  const invitations = appState.invitations;

  const racesForTournament = selectedTournament
    ? appState.races.filter((r) => r.tournamentId === selectedTournament && ["Upcoming", "Ready", "Live"].includes(r.liveStatus))
    : [];

  const fitHorses = horses.filter((h) => h.health === "Fit");

  const filtered = filter === "all" ? regs : regs.filter((r) => r.status === filter);

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRace)  { setRegError("Vui lòng chọn một cuộc đua.");  return; }
    if (!selectedHorse) { setRegError("Vui lòng chọn một con ngựa."); return; }
    setRegError("");
    setRegLoading(true);
    try {
      await handleRegisterForRace(selectedRace, selectedHorse);
      setSelectedRace("");
      setSelectedHorse("");
      setSelectedTournament("");
      setRegSuccess("Đã gửi đăng ký! Khi admin duyệt ngựa của bạn, hãy thuê nài ở trang Thuê nài ngựa.");
      setTimeout(() => setRegSuccess(""), 5000);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="page-stack">
      {/* ── Register form ── */}
      <Panel title="Đăng ký cuộc đua" subtitle="Đăng ký ngựa của bạn vào cuộc đua sắp tới">
        {regSuccess && <div className="form-banner form-banner-success">{regSuccess}</div>}
        {regError   && <div className="form-banner form-banner-error">{regError}</div>}
        <form onSubmit={doRegister} className="admin-form">
          <div className="form-grid-2">
            <label className="field">
              <span>Giải đấu</span>
              <select
                value={selectedTournament}
                onChange={(e) => { setSelectedTournament(e.target.value); setSelectedRace(""); }}
                disabled={regLoading}
              >
                <option value="">— Chọn giải đấu —</option>
                {tournaments.filter((t) => t.status === "Registration" || t.status === "Live").map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Cuộc đua <span className="required">*</span></span>
              <select
                value={selectedRace}
                onChange={(e) => setSelectedRace(e.target.value)}
                disabled={!selectedTournament || regLoading}
              >
                <option value="">— Chọn cuộc đua —</option>
                {racesForTournament.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {fmtDate(r.date)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Ngựa <span className="required">*</span></span>
              <select
                value={selectedHorse}
                onChange={(e) => setSelectedHorse(e.target.value)}
                disabled={regLoading}
              >
                <option value="">— Chọn ngựa —</option>
                {fitHorses.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.breed})</option>
                ))}
              </select>
            </label>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 12px" }}>
            Quy trình: đăng ký → admin duyệt ngựa → thuê nài ở trang <strong>Thuê nài ngựa</strong> → nài chấp nhận.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={regLoading}
              onClick={() => { setSelectedTournament(""); setSelectedRace(""); setSelectedHorse(""); setRegError(""); }}
            >
              Xóa
            </button>
            <button type="submit" className="primary-button" disabled={regLoading}>
              {regLoading ? <><Spinner size="sm" onPrimary /> Đang gửi…</> : "Gửi đăng ký"}
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Registration list ── */}
      <Panel
        title="Đăng ký cuộc đua của tôi"
        subtitle={`${filtered.length} / ${regs.length} đăng ký`}
        action={
          <div className="filter-tabs">
            {(["all", "Pending", "Approved", "Rejected"] as RegFilter[]).map((f) => (
              <button key={f} type="button" className={cn("filter-tab", filter === f && "is-active")} onClick={() => setFilter(f)}>
                {f === "all" ? "Tất cả" : viRegStatus(f)}
              </button>
            ))}
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "tournamentName", label: "Giải đấu", render: (row) => <strong>{row.tournamentName}</strong> },
            { key: "raceName",  label: "Cuộc đua" },
            { key: "horseName", label: "Ngựa"     },
            { key: "raceDate",  label: "Ngày",        render: (row) => fmtDate(row.raceDate)    },
            {
              key: "raceStatus",
              label: "Trạng thái đua",
              render: (row) => (
                <Badge tone={RACE_STATUS_TONE[row.raceStatus ?? ""] as any ?? "neutral"}>
                  {row.raceStatus ? viRaceStatus(row.raceStatus) : "—"}
                </Badge>
              ),
            },
            {
              key: "jockeyName",
              label: "Nài ngựa",
              render: (row) => {
                if (row.jockeyName) return row.jockeyName;
                // Same reasoning as the owner "Thuê nài ngựa" page: a registration
                // gains its jockey only on acceptance, so pending/declined invites
                // have to come from the invitation list.
                const invite = invitations.find(
                  (i) => i.raceId === row.raceId && i.horseId === row.horseId,
                );
                if (invite?.status === "Pending") {
                  return <Badge tone="warning">Chờ {invite.jockeyName ?? "nài"} phản hồi</Badge>;
                }
                if (invite?.status === "Declined") {
                  return <Badge tone="danger">{invite.jockeyName ?? "Nài"} đã từ chối</Badge>;
                }
                return <span style={{ color: "var(--text-muted)" }}>Chưa mời nài</span>;
              },
            },
            {
              key: "status",
              label: "Trạng thái",
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status] as any ?? "neutral"}>{viRegStatus(row.status)}</Badge>
              ),
            },
          ]}
          rows={filtered}
          empty="Không tìm thấy đăng ký nào."
          loading={isDataLoading}
        />
      </Panel>
    </div>
  );
}
