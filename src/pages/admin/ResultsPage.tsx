import { useState } from "react";
import { Badge, DataTable, Panel, RaceLeaderboard } from "../../components";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";
import { viPublishStatus } from "../../utils/viLabels";

export default function AdminResultsPage() {
  const { appState, isDataLoading, handleAction } = useApp();
  const [openRaceId, setOpenRaceId] = useState<string | null>(null);

  return (
    <div className="page-stack">
      <Panel title="Công bố kết quả và quản lý dự đoán" subtitle="Quản trị viên công bố kết quả sau khi trọng tài xác nhận">
        <DataTable
          columns={[
            { key: "tournament",        label: "Giải đấu", render: (row) => <strong>{row.tournament}</strong> },
            { key: "race",              label: "Cuộc đua"    },
            { key: "resultStatus",      label: "Kết quả"     },
            {
              key: "publishStatus",
              label: "Trạng thái công bố",
              render: (row) => (
                <Badge tone={row.publishStatus === "Published" ? "success" : "warning"}>{viPublishStatus(row.publishStatus)}</Badge>
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
              label: "Thao tác",
              render: (row) => (
                <button
                  className={cn("table-button", row.publishStatus === "Published" && "is-complete")}
                  type="button"
                  onClick={() => handleAction("publishQueue", row.id)}
                >
                  {row.publishStatus === "Published" ? "Đã công bố" : "Công bố ngay"}
                </button>
              ),
            },
          ]}
          rows={appState.publishQueue}
          loading={isDataLoading}
        />
      </Panel>

      {openRaceId && (
        <Panel title="Bảng xếp hạng cuộc đua" subtitle="Quản trị viên xem được cả bản đã xác nhận (chưa công bố)">
          <RaceLeaderboard raceId={openRaceId} />
        </Panel>
      )}
    </div>
  );
}
