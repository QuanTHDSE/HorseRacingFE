import { DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

export default function ChecksPage() {
  const { user, appState, handleAction } = useApp();
  const refereeChecks = appState.refereeChecks.filter((c) => c.refereeId === user.id);

  return (
    <div className="page-stack">
      <Panel title="Pre-race inspection" subtitle="Horse, jockey, and track condition checklist">
        <DataTable
          columns={[
            {
              key: "raceId",
              label: "Race",
              render: (row) => appState.races.find((r) => r.id === row.raceId)?.name ?? row.raceId
            },
            {
              key: "horseCheck",
              label: "Horse",
              render: (row) => (
                <button
                  className={cn("table-button", row.horseCheck && "is-complete")}
                  type="button"
                  onClick={() => handleAction("refereeCheck", row.id, "horseCheck")}
                >
                  {row.horseCheck ? "Done" : "Check"}
                </button>
              )
            },
            {
              key: "jockeyCheck",
              label: "Jockey",
              render: (row) => (
                <button
                  className={cn("table-button", row.jockeyCheck && "is-complete")}
                  type="button"
                  onClick={() => handleAction("refereeCheck", row.id, "jockeyCheck")}
                >
                  {row.jockeyCheck ? "Done" : "Check"}
                </button>
              )
            },
            {
              key: "trackCheck",
              label: "Track",
              render: (row) => (
                <button
                  className={cn("table-button", row.trackCheck && "is-complete")}
                  type="button"
                  onClick={() => handleAction("refereeCheck", row.id, "trackCheck")}
                >
                  {row.trackCheck ? "Done" : "Check"}
                </button>
              )
            },
            { key: "note", label: "Note" }
          ]}
          rows={refereeChecks}
        />
      </Panel>
    </div>
  );
}
