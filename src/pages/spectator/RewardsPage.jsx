import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function RewardsPage() {
  const { user, appState } = useApp();
  const myRewards = appState.rewards.filter((r) => r.spectatorId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Prediction rewards" subtitle="Track your reward status and claims">
        <DataTable
          columns={[
            { key: "title", label: "Reward" },
            { key: "amount", label: "Amount" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Claimed" ? "neutral" : "success"}>{row.status}</Badge>
              )
            }
          ]}
          rows={myRewards}
        />
      </Panel>
    </div>
  );
}
