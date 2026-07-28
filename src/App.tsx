import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import { BootScreen } from "./components";
import Homepage from "./layouts/Homepage";
import AuthScreen from "./layouts/AuthScreen";
import ResetPasswordScreen from "./layouts/ResetPasswordScreen";
import AppShell from "./layouts/AppShell";

// While the stored token is being exchanged for a session, `user` is still null.
// Redirecting on that would bounce a signed-in visitor to /login and back on every
// refresh, so every route holds on the splash until the session is resolved.

function ProtectedRoute() {
  const { user, isBooting } = useApp();
  if (isBooting) return <BootScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function LoginRoute() {
  const { user, isBooting } = useApp();
  if (isBooting) return <BootScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthScreen />;
}

function HomeRoute() {
  const { user, isBooting } = useApp();
  if (isBooting) return <BootScreen />;
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
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route path="/:page"  element={<ProtectedRoute />} />
            <Route path="*"       element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
