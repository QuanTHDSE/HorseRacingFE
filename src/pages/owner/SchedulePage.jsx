import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

export default function OwnerSchedulePage() {
  const { user, appState, handleAction } = useApp();
  const ownedHorses = appState.horses.filter((h) => h.ownerId === user.id);
  const ownerHorseIds = new Set(ownedHorses.map((h) => h.id));
  const ownerRaces = appState.races.filter((r) => r.ownerId === user.id || ownerHorseIds.has(r.horseId));

  return (
    <div className="page-stack">
      <Panel title="Horse race schedule" subtitle="Confirm participation for each race">
        <DataTable
          columns={[
            { key: "name", label: "Race" },
            { key: "date", label: "Date" },
            { key: "track", label: "Track" },
            {
              key: "ownerConfirmed",
              label: "Owner confirm",
              render: (row) => (
                <button
                  className={cn("table-button", row.ownerConfirmed && "is-complete")}
                  type="button"
                  onClick={() => handleAction("ownerConfirmRace", row.id)}
                >
                  {row.ownerConfirmed ? "Confirmed" : "Confirm now"}
                </button>
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
          rows={ownerRaces}
        />
      </Panel>
    </div>
  );
}
