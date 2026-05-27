import Dashboard from "./Dashboard";
import HorsesPage from "./HorsesPage";
import JockeysPage from "./JockeysPage";
import SchedulePage from "./SchedulePage";
import ResultsPage from "./ResultsPage";

export default function OwnerPages({ page }) {
  switch (page) {
    case "horses":   return <HorsesPage />;
    case "jockeys":  return <JockeysPage />;
    case "schedule": return <SchedulePage />;
    case "results":  return <ResultsPage />;
    default:         return <Dashboard />;
  }
}
