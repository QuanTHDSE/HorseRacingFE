import { Badge, DataTable, Panel } from "../../components";
import { useApp } from "../../context/AppContext";

export default function UsersPage() {
  const { appState } = useApp();

  return (
    <div className="page-stack">
      <Panel title="User account management" subtitle="Manage users, roles, and activity status">
        <DataTable
          columns={[
            { key: "name", label: "User" },
            {
              key: "role",
              label: "Role",
              render: (row) => <Badge tone="neutral">{row.role}</Badge>,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <Badge tone={row.status === "Active" ? "success" : "warning"}>{row.status}</Badge>
              ),
            },
            { key: "lastSeen", label: "Last seen" },
          ]}
          rows={appState.users}
        />
      </Panel>
    </div>
  );
}
