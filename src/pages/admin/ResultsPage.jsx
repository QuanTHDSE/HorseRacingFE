import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

export default function AdminResultsPage() {
  const { appState, handleAction } = useApp();

  return (
    <div className="page-stack">
      <Panel title="Publish results and manage predictions" subtitle="Admin publishes results after referee confirmation">
        <DataTable
          columns={[
            { key: "race", label: "Race" },
            { key: "resultStatus", label: "Result" },
            { key: "predictionStatus", label: "Prediction" },
            {
              key: "publishStatus",
              label: "Publish status",
              render: (row) => (
                <Badge tone={row.publishStatus === "Published" ? "success" : "warning"}>{row.publishStatus}</Badge>
              )
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <button
                  className={cn("table-button", row.publishStatus === "Published" && "is-complete")}
                  type="button"
                  onClick={() => handleAction("publishQueue", row.id)}
                >
                  {row.publishStatus === "Published" ? "Already published" : "Publish now"}
                </button>
              )
            }
          ]}
          rows={appState.publishQueue}
        />
      </Panel>
    </div>
  );
}
