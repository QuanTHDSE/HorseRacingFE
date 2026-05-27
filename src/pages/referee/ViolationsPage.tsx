import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function ViolationsPage() {
  const { user, appState } = useApp();
  if (!user) return null;
  const refereeViolations = appState.violations.filter((v) => v.refereeId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Violation log and resolution" subtitle="All incidents during a race are recorded">
        <DataTable
          columns={[
            {
              key: "raceId",
              label: "Race",
              render: (row) => appState.races.find((r) => r.id === row.raceId)?.name ?? row.raceId,
            },
            { key: "minute", label: "Minute"    },
            { key: "title",  label: "Violation" },
            {
              key: "level",
              label: "Level",
              render: (row) => (
                <Badge tone={row.level === "Warning" ? "warning" : "danger"}>{row.level}</Badge>
              ),
            },
            { key: "action", label: "Action" },
          ]}
          rows={refereeViolations}
        />
      </Panel>
    </div>
  );
}
