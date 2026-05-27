import { Badge, DataTable, MetricCard, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function HorsesPage() {
  const { user, appState } = useApp();
  if (!user) return null;
  const ownedHorses = appState.horses.filter((h) => h.ownerId === user.id);

  return (
    <div className="page-stack">
      <div className="metric-grid three">
        {ownedHorses.map((horse) => (
          <MetricCard
            key={horse.id}
            label={horse.name}
            value={horse.ranking}
            note={`${horse.breed} • ${horse.health} • Earned ${horse.earnings}`}
            tone={horse.status === "Approved" ? "success" : "warning"}
          />
        ))}
      </div>
      <Panel title="Horse profile management" subtitle="Profile, health, approval status, and current jockey">
        <DataTable
          columns={[
            { key: "name",     label: "Horse"    },
            { key: "breed",    label: "Breed"    },
            { key: "health",   label: "Health"   },
            {
              key: "status",
              label: "Approval",
              render: (row) => (
                <Badge tone={row.status === "Approved" ? "success" : "warning"}>{row.status}</Badge>
              ),
            },
            { key: "earnings", label: "Earnings" },
          ]}
          rows={ownedHorses}
        />
      </Panel>
    </div>
  );
}
