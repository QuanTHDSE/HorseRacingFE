import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function ReportsPage() {
  const { user, appState } = useApp();
  const refereeReports = appState.reports.filter((r) => r.refereeId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Race reports and result confirmation" subtitle="Grouped by assigned race">
        <DataTable
          columns={[
            { key: "title", label: "Report" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Submitted" ? "success" : "warning"}>{row.status}</Badge>
              )
            }
          ]}
          rows={refereeReports}
        />
      </Panel>
    </div>
  );
}
