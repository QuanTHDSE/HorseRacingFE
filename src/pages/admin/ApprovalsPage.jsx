import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function ApprovalsPage() {
  const { appState, handleAction } = useApp();

  return (
    <div className="page-stack">
      <Panel title="Registration approvals" subtitle="Owner, horse, jockey, and tournament registrations">
        <DataTable
          columns={[
            { key: "type", label: "Type" },
            { key: "applicant", label: "Submitted by" },
            { key: "requestedRole", label: "Role" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Approved" ? "success" : row.status === "Rejected" ? "danger" : "warning"}>
                  {row.status}
                </Badge>
              )
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <div className="table-actions">
                  <button
                    className="table-button is-complete"
                    type="button"
                    onClick={() => handleAction("approval", row.id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="table-button is-danger"
                    type="button"
                    onClick={() => handleAction("approval", row.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              )
            }
          ]}
          rows={appState.approvals}
        />
      </Panel>
    </div>
  );
}
