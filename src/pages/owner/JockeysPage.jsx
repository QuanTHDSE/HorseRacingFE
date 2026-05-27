import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function JockeysPage() {
  const { user, appState } = useApp();
  const ownerInvitations = appState.invitations.filter((inv) => inv.ownerId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Available jockeys" subtitle="Send invitations or check participation status">
        <DataTable
          columns={[
            { key: "name", label: "Jockey" },
            { key: "winRate", label: "Win rate" },
            { key: "seasonWins", label: "Season wins" },
            { key: "availability", label: "Availability" },
            { key: "fee", label: "Fee" }
          ]}
          rows={appState.jockeys}
        />
      </Panel>
      <Panel title="Sent invitations" subtitle="Owner tracks jockey confirmations per race">
        <DataTable
          columns={[
            {
              key: "raceId",
              label: "Race",
              render: (row) => appState.races.find((r) => r.id === row.raceId)?.name ?? row.raceId
            },
            {
              key: "jockeyId",
              label: "Jockey",
              render: (row) => appState.jockeys.find((j) => j.id === row.jockeyId)?.name ?? row.jockeyId
            },
            { key: "offer", label: "Offer" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Accepted" ? "success" : "warning"}>{row.status}</Badge>
              )
            }
          ]}
          rows={ownerInvitations}
        />
      </Panel>
    </div>
  );
}
