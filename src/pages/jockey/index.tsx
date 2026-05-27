import Dashboard from "./Dashboard";
import InvitationsPage from "./InvitationsPage";
import AssignedPage from "./AssignedPage";
import SchedulePage from "./SchedulePage";
import PerformancePage from "./PerformancePage";

export default function JockeyPages({ page }: { page: string }) {
  switch (page) {
    case "invitations": return <InvitationsPage />;
    case "assigned":    return <AssignedPage />;
    case "schedule":    return <SchedulePage />;
    case "performance": return <PerformancePage />;
    default:            return <Dashboard />;
  }
}
