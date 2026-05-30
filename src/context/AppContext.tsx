import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { initialAppState } from "../data/mockData";
import * as authApi from "../api/auth.api";
import { syncAppState } from "../api/dataSync";
import { adminApi } from "../api/admin.api";
import { jockeyApi } from "../api/jockey.api";
import { refereeApi } from "../api/referee.api";
import { spectatorApi } from "../api/spectator.api";
import { setToken } from "../api/client";
import { loadJson, saveJson, SESSION_KEY, STATE_KEY, TOKEN_KEY } from "../utils/storage";
import { backendRoleToFe, roleBadge } from "../utils/roleMap";
import type {
  Account,
  AppContextValue,
  AppState,
  AuthMode,
  LoginForm,
  RegisterForm,
  Role,
} from "../types";

const AppContext = createContext<AppContextValue | null>(null);

interface Session {
  userId: string;
}

export const DEMO_ACCOUNTS: Omit<Account, "password">[] = [
  { id: "demo-spectator", role: "spectator", name: "Demo Spectator", organization: "Race Fan Club", email: "spectator@demo.local", badge: "SP" },
  { id: "demo-jockey", role: "jockey", name: "Demo Jockey", organization: "Elite Rider Squad", email: "jockey1@demo.local", badge: "JK" },
  { id: "demo-owner", role: "owner", name: "Demo Owner", organization: "Royal Stables", email: "owner@demo.local", badge: "HO" },
  { id: "demo-referee", role: "referee", name: "Demo Referee", organization: "Central Track Officials", email: "referee@demo.local", badge: "RF" },
  { id: "demo-admin", role: "admin", name: "Demo Admin", organization: "HorseRacing System Admin", email: "admin@demo.local", badge: "AD" },
];

const DEMO_PASSWORD = "Demo@123";

const orgMap: Record<string, string> = {
  owner: "Royal Stables",
  jockey: "Elite Rider Squad",
  spectator: "Race Fan Club",
  referee: "Central Track Officials",
  admin: "HorseRacing System Admin",
};

function authUserToAccount(user: { id: string; email: string; role: string; fullName: string }): Account {
  const role = backendRoleToFe(user.role as Parameters<typeof backendRoleToFe>[0]);
  return {
    id: user.id,
    role,
    name: user.fullName,
    organization: orgMap[role] ?? "HorseRacing",
    email: user.email,
    password: "",
    badge: roleBadge(role),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(() => loadJson<AppState>(STATE_KEY, initialAppState));
  const [session, setSession] = useState<Session | null>(() => loadJson<Session | null>(SESSION_KEY, null));
  const [user, setUser] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "owner@demo.local", password: DEMO_PASSWORD });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({ name: "", email: "", password: "", role: "spectator" });

  const refreshAppData = useCallback(async (account: Account) => {
    const synced = await syncAppState(account);
    setAppState(synced);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }
    setToken(token);
    authApi
      .getMe()
      .then(async ({ user: me }) => {
        const account = authUserToAccount(me);
        setUser(account);
        setSession({ userId: account.id });
        await refreshAppData(account);
      })
      .catch(() => {
        authApi.logout();
        setUser(null);
        setSession(null);
      })
      .finally(() => setAuthLoading(false));
  }, [refreshAppData]);

  useEffect(() => { saveJson(STATE_KEY, appState); }, [appState]);
  useEffect(() => { saveJson(SESSION_KEY, session); }, [session]);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    try {
      const { user: me } = await authApi.login(loginForm.email.trim(), loginForm.password);
      const account = authUserToAccount(me);
      setUser(account);
      setSession({ userId: account.id });
      await refreshAppData(account);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registerForm.role !== "spectator") {
      setAuthError("Only spectator registration is available. Other roles: use demo accounts (password Demo@123).");
      return;
    }
    if (!registerForm.name || !registerForm.email || registerForm.password.length < 8) {
      setAuthError("Please fill in all fields and use a password of at least 8 characters.");
      return;
    }
    setAuthError("");
    try {
      const { user: me } = await authApi.registerSpectator(
        registerForm.email.trim(),
        registerForm.password,
        registerForm.name.trim(),
      );
      const account = authUserToAccount(me);
      setUser(account);
      setSession({ userId: account.id });
      await refreshAppData(account);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  async function handleAction(type: string, id: string, value?: string) {
    if (!user) return;

    try {
      if (type === "jockeyInvite") {
        const action = value === "Accepted" ? "accept" : "decline";
        await jockeyApi.respondInvitation(id, action);
        await refreshAppData(user);
        return;
      }

      if (type === "approval") {
        const status = value === "Approved" ? "approved" : "rejected";
        await adminApi.updateRegistration(id, status);
        await refreshAppData(user);
        return;
      }

      if (type === "publishQueue") {
        await adminApi.publishResult(id);
        await refreshAppData(user);
        return;
      }

      if (type === "refereeCheck" && value) {
        const [raceId, horseId] = id.split(":");
        if (raceId && horseId) {
          const field = value === "horseCheck" ? "vetApprovedAt" : value === "jockeyCheck" ? "confirmedAt" : null;
          if (field) {
            await refereeApi.toggleCheck(raceId, horseId, field);
            await refreshAppData(user);
            return;
          }
        }
        setAppState((prev) => ({
          ...prev,
          refereeChecks: prev.refereeChecks.map((c) =>
            c.id === id && value === "trackCheck" ? { ...c, trackCheck: !c.trackCheck } : c,
          ),
        }));
        return;
      }

      if (type === "makePrediction") {
        const raceId = appState.liveBoard.raceId;
        const race = (await spectatorApi.listRaces()).races.find((r) => r.id === raceId);
        const horse = race?.participants.find((p) => p.name === id);
        if (horse) {
          await spectatorApi.createPrediction(raceId, [{ rank: 1, horseId: horse.id }]);
          await refreshAppData(user);
        }
        return;
      }

      setAppState((prev) => {
        if (type === "ownerConfirmRace") {
          return { ...prev, races: prev.races.map((r) => (r.id === id ? { ...r, ownerConfirmed: !r.ownerConfirmed } : r)) };
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
    }
  }

  function handleLogout() {
    authApi.logout();
    setUser(null);
    setSession(null);
    setAuthMode("login");
    setAppState(initialAppState);
  }

  function handleSelectAccount(account: Omit<Account, "password">) {
    setAuthMode("login");
    setAuthError("");
    setLoginForm({ email: account.email, password: DEMO_PASSWORD });
  }

  function handleModeChange(mode: AuthMode) {
    setAuthError("");
    setAuthMode(mode);
  }

  const demoAccounts = useMemo(
    () => DEMO_ACCOUNTS.map((a) => ({ ...a, password: DEMO_PASSWORD })),
    [],
  );

  const value: AppContextValue = {
    user: authLoading ? null : user,
    accounts: demoAccounts,
    appState,
    authMode,
    authError,
    authLoading,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleAction,
    handleLogout,
    handleSelectAccount,
    handleModeChange,
    refreshAppData: () => (user ? refreshAppData(user) : Promise.resolve()),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
