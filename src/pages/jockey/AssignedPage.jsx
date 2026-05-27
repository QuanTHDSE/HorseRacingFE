import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function AssignedPage() {
  const { user, appState } = useApp();
  const assignedRaces = appState.races.filter((r) => r.jockeyId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Assigned race list" subtitle="Horse info, owner, and confirmation status">
        <DataTable
          columns={[
            { key: "name", label: "Race" },
            { key: "date", label: "Date" },
            { key: "track", label: "Track" },
            {
              key: "ownerConfirmed",
              label: "Owner",
              render: (row) => (
                <Badge tone={row.ownerConfirmed ? "success" : "warning"}>
                  {row.ownerConfirmed ? "Confirmed" : "Pending"}
                </Badge>
              )
            },
            {
              key: "jockeyConfirmed",
              label: "Jockey",
              render: (row) => (
                <Badge tone={row.jockeyConfirmed ? "success" : "warning"}>
                  {row.jockeyConfirmed ? "Ready" : "Pending"}
                </Badge>
              )
            }
          ]}
          rows={assignedRaces}
        />
      </Panel>
    </div>
  );
}
