import Dashboard from "./Dashboard";
import UsersPage from "./UsersPage";
import RacetracksPage from "./RacetracksPage";
import RacesPage from "./RacesPage";
import TournamentsPage from "./TournamentsPage";
import ApprovalsPage from "./ApprovalsPage";
import ResultsPage from "./ResultsPage";

export default function AdminPages({ page }: { page: string }) {
  switch (page) {
    case "users":       return <UsersPage />;
    case "racetracks":  return <RacetracksPage />;
    case "races":       return <RacesPage />;
    case "tournaments": return <TournamentsPage />;
    case "approvals":   return <ApprovalsPage />;
    case "results":     return <ResultsPage />;
    default:            return <Dashboard />;
  }
}
