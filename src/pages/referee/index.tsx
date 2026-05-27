import Dashboard from "./Dashboard";
import ChecksPage from "./ChecksPage";
import MonitorPage from "./MonitorPage";
import ViolationsPage from "./ViolationsPage";
import ReportsPage from "./ReportsPage";

export default function RefereePages({ page }: { page: string }) {
  switch (page) {
    case "checks":     return <ChecksPage />;
    case "monitor":    return <MonitorPage />;
    case "violations": return <ViolationsPage />;
    case "reports":    return <ReportsPage />;
    default:           return <Dashboard />;
  }
}
