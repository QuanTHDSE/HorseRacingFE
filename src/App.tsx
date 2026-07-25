import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import Homepage from "./layouts/Homepage";
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

function HomeRoute() {
  const { user } = useApp();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Homepage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <Routes>
            <Route path="/"       element={<HomeRoute />}      />
            <Route path="/login"  element={<LoginRoute />}     />
            <Route path="/:page"  element={<ProtectedRoute />} />
            <Route path="*"       element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
