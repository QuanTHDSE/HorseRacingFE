import { useState } from "react";
import { Badge, DataTable, Panel, RaceLeaderboard } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";

export default function AdminResultsPage() {
  const { appState, handleAction } = useApp();
  const [openRaceId, setOpenRaceId] = useState<string | null>(null);

  return (
    <div className="page-stack">
      <Panel title="Publish results and manage predictions" subtitle="Admin publishes results after referee confirmation">
        <DataTable
          columns={[
            { key: "race",              label: "Race"          },
            { key: "resultStatus",      label: "Result"        },
            { key: "predictionStatus",  label: "Prediction"    },
            {
              key: "publishStatus",
              label: "Publish status",
              render: (row) => (
                <Badge tone={row.publishStatus === "Published" ? "success" : "warning"}>{row.publishStatus}</Badge>
              ),
            },
            {
              key: "view",
              label: "Bảng xếp hạng",
              render: (row) => (
                <button
                  className="table-button"
                  type="button"
                  onClick={() => setOpenRaceId((cur) => (cur === row.id ? null : row.id))}
                >
                  {openRaceId === row.id ? "Ẩn" : "Xem"}
                </button>
              ),
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
              ),
            },
          ]}
          rows={appState.publishQueue}
        />
      </Panel>

      {openRaceId && (
        <Panel title="Bảng xếp hạng cuộc đua" subtitle="Admin xem được cả bản đã xác nhận (chưa công bố)">
          <RaceLeaderboard raceId={openRaceId} />
        </Panel>
      )}
    </div>
  );
}
