import Dashboard from "./Dashboard";
import ChecksPage from "./ChecksPage";
import ResultsPage from "./ResultsPage";

export default function RefereePages({ page }: { page: string }) {
  switch (page) {
    case "checks":  return <ChecksPage />;
    case "results": return <ResultsPage />;
    default:        return <Dashboard />;
  }
}
