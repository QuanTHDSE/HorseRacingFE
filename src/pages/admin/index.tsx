import Dashboard from "./Dashboard";
import UsersPage from "./UsersPage";
import RacetracksPage from "./RacetracksPage";
import RacesPage from "./RacesPage";
import TournamentsPage from "./TournamentsPage";
import ApprovalsPage from "./ApprovalsPage";
import ResultsPage from "./ResultsPage";
import ViolationRulesPage from "./ViolationRulesPage";
import JockeyApprovalsPage from "./JockeyApprovalsPage";
import OwnerApprovalsPage from "./OwnerApprovalsPage";

export default function AdminPages({ page }: { page: string }) {
  switch (page) {
    case "users":       return <UsersPage />;
    case "racetracks":  return <RacetracksPage />;
    case "races":       return <RacesPage />;
    case "tournaments": return <TournamentsPage />;
    case "approvals":   return <ApprovalsPage />;
    case "jockey-approvals": return <JockeyApprovalsPage />;
    case "owner-approvals": return <OwnerApprovalsPage />;
    case "results":     return <ResultsPage />;
    case "violation-rules": return <ViolationRulesPage />;
    default:            return <Dashboard />;
  }
}
