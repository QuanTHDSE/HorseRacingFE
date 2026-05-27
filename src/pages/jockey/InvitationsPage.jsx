import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function InvitationsPage() {
  const { user, appState, handleAction } = useApp();
  const jockeyInvites = appState.invitations.filter((inv) => inv.jockeyId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Ride invitations" subtitle="Accept or decline directly from the table">
        <DataTable
          columns={[
            {
              key: "raceId",
              label: "Race",
              render: (row) => appState.races.find((r) => r.id === row.raceId)?.name ?? row.raceId
            },
            {
              key: "horseId",
              label: "Horse",
              render: (row) => appState.horses.find((h) => h.id === row.horseId)?.name ?? row.horseId
            },
            { key: "offer", label: "Offer" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Accepted" ? "success" : row.status === "Declined" ? "danger" : "warning"}>
                  {row.status}
                </Badge>
              )
            },
            {
              key: "actions",
              label: "Action",
              render: (row) => (
                <div className="table-actions">
                  <button
                    className="table-button is-complete"
                    type="button"
                    onClick={() => handleAction("jockeyInvite", row.id, "Accepted")}
                  >
                    Accept
                  </button>
                  <button
                    className="table-button is-danger"
                    type="button"
                    onClick={() => handleAction("jockeyInvite", row.id, "Declined")}
                  >
                    Decline
                  </button>
                </div>
              )
            }
          ]}
          rows={jockeyInvites}
        />
      </Panel>
    </div>
  );
}
