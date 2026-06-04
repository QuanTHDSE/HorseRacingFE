import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function ApprovalsPage() {
  const { appState, handleAction } = useApp();
  const jockeyApplications = appState.jockeyApplications ?? [];

  const pendingRegistrations = appState.approvals.filter((a) => a.status === "Pending").length;
  const pendingApplications  = jockeyApplications.filter((a) => a.status === "Pending").length;

  return (
    <div className="page-stack">

      {/* ── Summary chips ── */}
      <div className="approvals-summary">
        <div className="summary-chip">
          <span className="summary-chip-label">Registration approvals pending</span>
          <Badge tone={pendingRegistrations > 0 ? "warning" : "success"}>
            {pendingRegistrations}
          </Badge>
        </div>
        <div className="summary-chip">
          <span className="summary-chip-label">Jockey applications pending</span>
          <Badge tone={pendingApplications > 0 ? "warning" : "success"}>
            {pendingApplications}
          </Badge>
        </div>
      </div>

      {/* ── Registration approvals ── */}
      <Panel
        title="Registration approvals"
        subtitle="Owner, horse, jockey, and tournament registrations"
      >
        <DataTable
          columns={[
            { key: "type",          label: "Type"         },
            { key: "applicant",     label: "Submitted by" },
            { key: "requestedRole", label: "Role"         },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge
                  tone={
                    row.status === "Approved" ? "success" :
                    row.status === "Rejected" ? "danger"  : "warning"
                  }
                >
                  {row.status}
                </Badge>
              ),
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <div className="table-actions">
                  <button
                    className="table-button is-complete"
                    type="button"
                    disabled={row.status !== "Pending" && row.status !== "Needs review"}
                    onClick={() => handleAction("approval", row.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="table-button is-danger"
                    type="button"
                    disabled={row.status !== "Pending" && row.status !== "Needs review"}
                    onClick={() => handleAction("approval", row.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              ),
            },
          ]}
          rows={appState.approvals}
        />
      </Panel>

      {/* ── Jockey race applications ── */}
      <Panel
        title="Jockey race applications"
        subtitle="Jockeys applying to participate in specific races — review and approve each request"
      >
        <DataTable
          columns={[
            { key: "jockeyName", label: "Jockey"      },
            { key: "raceName",   label: "Race"         },
            { key: "horseName",  label: "Horse"        },
            { key: "appliedAt",  label: "Applied on"   },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge
                  tone={
                    row.status === "Approved" ? "success" :
                    row.status === "Rejected" ? "danger"  : "warning"
                  }
                >
                  {row.status}
                </Badge>
              ),
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <div className="table-actions">
                  <button
                    className="table-button is-complete"
                    type="button"
                    disabled={row.status !== "Pending"}
                    onClick={() => handleAction("jockeyApplication", row.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="table-button is-danger"
                    type="button"
                    disabled={row.status !== "Pending"}
                    onClick={() => handleAction("jockeyApplication", row.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              ),
            },
          ]}
          rows={jockeyApplications}
          empty="No jockey applications at this time."
        />
      </Panel>

    </div>
  );
}
