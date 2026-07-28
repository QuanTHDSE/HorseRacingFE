import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, DataTable, Panel, Spinner } from "../../components";
import { useFeedback } from "../../context/ToastContext";
import { api } from "../../services/api";
import type { ApiJockeyApplication } from "../../services/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: ApiJockeyApplication["status"]) {
  if (status === "approved") return <Badge tone="success">Đã duyệt</Badge>;
  if (status === "rejected") return <Badge tone="danger">Đã từ chối</Badge>;
  return <Badge tone="warning">Chờ duyệt</Badge>;
}

export default function JockeyApprovalsPage() {
  const { success: showSuccess, error: showError } = useFeedback();
  const [applications, setApplications] = useState<ApiJockeyApplication[]>([]);
  const [selected, setSelected] = useState<ApiJockeyApplication | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.admin.listJockeyApplications();
      setApplications(response.applications);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Không thể tải hồ sơ Jockey.");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const pending = useMemo(
    () => applications.filter((application) => application.status === "pending"),
    [applications],
  );
  const reviewed = useMemo(
    () => applications.filter((application) => application.status !== "pending"),
    [applications],
  );

  function openReview(application: ApiJockeyApplication) {
    setSelected(application);
    setAdminNote(application.adminNote ?? "");
  }

  async function review(status: "approved" | "rejected") {
    if (!selected) return;
    setReviewing(true);
    try {
      const response = await api.admin.reviewJockeyApplication(
        selected.id,
        status,
        adminNote.trim() || undefined,
      );
      setApplications((current) => current.map((item) => (
        item.id === response.application.id ? response.application : item
      )));
      setSelected(null);
      setAdminNote("");
      showSuccess(status === "approved"
        ? "Đã duyệt và kích hoạt tài khoản Jockey."
        : "Đã từ chối hồ sơ Jockey.");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Không thể xử lý hồ sơ Jockey.");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="approvals-summary">
        <div className="summary-chip">
          <span className="summary-chip-label">Chờ duyệt</span>
          <Badge tone={pending.length ? "warning" : "neutral"}>{pending.length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">Đã duyệt</span>
          <Badge tone="success">{applications.filter((item) => item.status === "approved").length}</Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">Đã từ chối</span>
          <Badge tone="danger">{applications.filter((item) => item.status === "rejected").length}</Badge>
        </div>
      </div>

      <Panel
        title="Hồ sơ Jockey chờ duyệt"
        subtitle="Kiểm tra hồ sơ PDF trước khi kích hoạt tài khoản Jockey"
        action={(
          <button className="secondary-button btn-xs" type="button" onClick={() => void loadApplications()} disabled={loading}>
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
        )}
      >
        <DataTable
          rows={pending}
          loading={loading}
          empty="Không có hồ sơ Jockey nào đang chờ duyệt."
          columns={[
            { key: "fullName", label: "Họ và tên" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Số điện thoại", render: (row) => row.phone || "—" },
            { key: "appliedAt", label: "Ngày gửi", render: (row) => formatDate(row.appliedAt) },
            {
              key: "applicationPdfUrl",
              label: "Hồ sơ PDF",
              render: (row) => (
                <a className="secondary-button btn-xs" href={row.applicationPdfUrl} target="_blank" rel="noreferrer">
                  Xem PDF
                </a>
              ),
            },
            {
              key: "id",
              label: "Thao tác",
              render: (row) => (
                <button className="primary-button btn-xs" type="button" onClick={() => openReview(row)}>
                  Xét duyệt
                </button>
              ),
            },
          ]}
        />
      </Panel>

      {selected ? (
        <Panel
          title={`Xét duyệt Jockey — ${selected.fullName}`}
          subtitle="Quyết định duyệt sẽ kích hoạt tài khoản và cho phép Jockey đăng nhập"
          action={(
            <button className="secondary-button btn-xs" type="button" onClick={() => setSelected(null)} disabled={reviewing}>
              Đóng
            </button>
          )}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Họ và tên</span>
              <strong>{selected.fullName}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <strong>{selected.email}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <strong>{selected.phone || "—"}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ngày gửi</span>
              <strong>{formatDate(selected.appliedAt)}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <span>{statusBadge(selected.status)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Hồ sơ PDF</span>
              <a className="secondary-button btn-xs" href={selected.applicationPdfUrl} target="_blank" rel="noreferrer">
                {selected.applicationPdfName || "Xem PDF"}
              </a>
            </div>
          </div>

          <label className="field" style={{ marginTop: 18 }}>
            <span>Ghi chú của quản trị viên (không bắt buộc)</span>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Nhập lý do duyệt hoặc từ chối…"
              disabled={reviewing}
            />
          </label>
          <div className="form-actions">
            <button className="danger-button" type="button" onClick={() => void review("rejected")} disabled={reviewing}>
              Từ chối
            </button>
            <button className="primary-button" type="button" onClick={() => void review("approved")} disabled={reviewing}>
              {reviewing ? <><Spinner size="sm" onPrimary /> Đang xử lý…</> : "Duyệt Jockey"}
            </button>
          </div>
        </Panel>
      ) : null}

      <Panel title="Lịch sử xét duyệt" subtitle="Các hồ sơ Jockey đã được xử lý">
        <DataTable
          rows={reviewed}
          loading={loading}
          empty="Chưa có hồ sơ Jockey nào được xử lý."
          columns={[
            { key: "fullName", label: "Họ và tên" },
            { key: "email", label: "Email" },
            { key: "status", label: "Trạng thái", render: (row) => statusBadge(row.status) },
            { key: "reviewedAt", label: "Ngày xử lý", render: (row) => formatDate(row.reviewedAt) },
            { key: "adminNote", label: "Ghi chú", render: (row) => row.adminNote || "—" },
            {
              key: "applicationPdfUrl",
              label: "PDF",
              render: (row) => (
                <a className="secondary-button btn-xs" href={row.applicationPdfUrl} target="_blank" rel="noreferrer">
                  Xem
                </a>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
