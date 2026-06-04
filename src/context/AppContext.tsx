import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { initialAccounts, initialAppState } from "../data/mockData";
import { loadJson, saveJson, SESSION_KEY, STATE_KEY, ACCOUNTS_KEY } from "../utils/storage";
import type {
  Account,
  AppContextValue,
  AppState,
  AuthMode,
  LoginForm,
  NewRaceInput,
  Racetrack,
  RegisterForm,
  Role,
} from "../types";

const AppContext = createContext<AppContextValue | null>(null);

interface Session {
  userId: string;
}

const badgeMap: Record<string, string> = { owner: "HO", jockey: "JK", spectator: "SP" };
const orgMap:   Record<string, string> = { owner: "New Stable", jockey: "Independent Rider", spectator: "New Fan" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => loadJson<Account[]>(ACCOUNTS_KEY, initialAccounts));
  // Merge stored state with initialAppState so new fields are always present
  const [appState, setAppState] = useState<AppState>(() => {
    const stored = loadJson<Partial<AppState>>(STATE_KEY, {});
    return { ...initialAppState, ...stored };
  });
  const [session,      setSession]      = useState<Session | null>(() => loadJson<Session | null>(SESSION_KEY, null));
  const [authMode,     setAuthMode]     = useState<AuthMode>("login");
  const [authError,    setAuthError]    = useState("");
  const [loginForm,    setLoginForm]    = useState<LoginForm>   ({ email: "owner@royalstables.vn", password: "owner123" });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({ name: "", email: "", password: "", role: "owner" });

  const user = useMemo<Account | null>(
    () => accounts.find((a) => a.id === session?.userId) ?? null,
    [accounts, session],
  );

  useEffect(() => { saveJson(ACCOUNTS_KEY, accounts); }, [accounts]);
  useEffect(() => { saveJson(STATE_KEY,    appState);  }, [appState]);
  useEffect(() => { saveJson(SESSION_KEY,  session);   }, [session]);

  function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = accounts.find(
      (a) =>
        a.email.toLowerCase() === loginForm.email.trim().toLowerCase() &&
        a.password === loginForm.password,
    );
    if (!account) {
      setAuthError("Incorrect email or password. Please try again or select a system account on the left.");
      return;
    }
    setAuthError("");
    setSession({ userId: account.id });
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registerForm.name || !registerForm.email || registerForm.password.length < 6) {
      setAuthError("Please fill in all fields and use a password of at least 6 characters.");
      return;
    }
    if (accounts.some((a) => a.email.toLowerCase() === registerForm.email.trim().toLowerCase())) {
      setAuthError("This email address is already registered in the system.");
      return;
    }
    const newAccount: Account = {
      id:           `${registerForm.role}-${Date.now()}`,
      role:         registerForm.role as Role,
      name:         registerForm.name.trim(),
      organization: orgMap[registerForm.role] ?? "Unknown",
      email:        registerForm.email.trim(),
      password:     registerForm.password,
      badge:        badgeMap[registerForm.role] ?? "?",
    };
    setAccounts((prev) => [...prev, newAccount]);
    setAppState((prev) => ({
      ...prev,
      users: [
        ...prev.users,
        { id: `user-${Date.now()}`, name: newAccount.name, role: newAccount.role, status: "Active", lastSeen: "Just created" },
      ],
      notifications: [
        ...prev.notifications,
        {
          id:     `noti-${Date.now()}`,
          userId: newAccount.id,
          tone:   "info" as const,
          title:  "Account created successfully",
          detail: "You can now sign in to access your role-based dashboard.",
        },
      ],
    }));
    setAuthError("");
    setAuthMode("login");
    setLoginForm({ email: newAccount.email, password: newAccount.password });
    setRegisterForm({ name: "", email: "", password: "", role: "owner" });
  }

  function handleAction(type: string, id: string, value?: string) {
    setAppState((prev) => {
      if (type === "ownerConfirmRace") {
        return { ...prev, races: prev.races.map((r) => (r.id === id ? { ...r, ownerConfirmed: !r.ownerConfirmed } : r)) };
      }
      if (type === "jockeyInvite") {
        return {
          ...prev,
          invitations: prev.invitations.map((inv) => (inv.id === id ? { ...inv, status: value ?? inv.status } : inv)),
          races: prev.races.map((race) => {
            const inv = prev.invitations.find((i) => i.id === id);
            if (!inv || race.id !== inv.raceId) return race;
            return { ...race, jockeyConfirmed: value === "Accepted" };
          }),
        };
      }
      if (type === "refereeCheck") {
        return {
          ...prev,
          refereeChecks: prev.refereeChecks.map((c) =>
            c.id === id && value ? { ...c, [value]: !c[value as keyof typeof c] } : c,
          ),
        };
      }
      if (type === "approval") {
        return { ...prev, approvals: prev.approvals.map((a) => (a.id === id ? { ...a, status: value ?? a.status } : a)) };
      }
      if (type === "jockeyApplication") {
        return {
          ...prev,
          jockeyApplications: prev.jockeyApplications.map((a) =>
            a.id === id ? { ...a, status: value ?? a.status } : a,
          ),
        };
      }
      if (type === "publishQueue") {
        return {
          ...prev,
          publishQueue: prev.publishQueue.map((item) =>
            item.id === id ? { ...item, publishStatus: "Published" } : item,
          ),
        };
      }
      if (type === "makePrediction" && user) {
        return {
          ...prev,
          predictions: [
            {
              id:          `pred-${Date.now()}`,
              spectatorId: user.id,
              raceId:      prev.liveBoard.raceId,
              horse:       id,
              odds:        "2.7",
              status:      "Open",
              reward:      "-",
            },
            ...prev.predictions,
          ],
        };
      }
      return prev;
    });
  }

  function handleCreateRacetrack(data: Omit<Racetrack, "id">) {
    setAppState((prev) => ({
      ...prev,
      racetracks: [
        ...prev.racetracks,
        { ...data, id: `track-${Date.now()}` },
      ],
    }));
  }

  function handleCreateRace(data: NewRaceInput) {
    const track = appState.racetracks.find((t) => t.id === data.racetrackId);
    setAppState((prev) => ({
      ...prev,
      races: [
        ...prev.races,
        {
          id:             `race-${Date.now()}`,
          ownerId:        "",
          horseId:        "",
          jockeyId:       null,
          refereeId:      "",
          tournamentId:   data.tournamentId,
          name:           data.name,
          round:          data.round,
          date:           data.date,
          track:          track?.name ?? data.racetrackId,
          distance:       data.distance,
          ownerConfirmed:  false,
          jockeyConfirmed: false,
          refereeStatus:  "Not assigned",
          liveStatus:     "Draft",
        },
      ],
    }));
  }

  function handleLogout() {
    setSession(null);
    setAuthMode("login");
  }

  function handleSelectAccount(account: Account) {
    setAuthMode("login");
    setAuthError("");
    setLoginForm({ email: account.email, password: account.password });
  }

  function handleModeChange(mode: AuthMode) {
    setAuthError("");
    setAuthMode(mode);
  }

  const value: AppContextValue = {
    user,
    accounts,
    appState,
    authMode,
    authError,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleAction,
    handleCreateRacetrack,
    handleCreateRace,
    handleLogout,
    handleSelectAccount,
    handleModeChange,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
