import Dashboard from "./Dashboard";
import TournamentsPage from "./TournamentsPage";
import LivePage from "./LivePage";
import PredictionsPage from "./PredictionsPage";
import RewardsPage from "./RewardsPage";

export default function SpectatorPages({ page }: { page: string }) {
  switch (page) {
    case "tournaments": return <TournamentsPage />;
    case "live":        return <LivePage />;
    case "predictions": return <PredictionsPage />;
    case "rewards":     return <RewardsPage />;
    default:            return <Dashboard />;
  }
}
