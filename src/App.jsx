import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import AuthScreen from "./layouts/AuthScreen";
import AppShell from "./layouts/AppShell";

function ProtectedRoute() {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function LoginRoute() {
  const { user } = useApp();
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthScreen />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/:page" element={<ProtectedRoute />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
