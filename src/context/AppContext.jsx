import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialAccounts, initialAppState } from "../data/mockData";
import { loadJson, saveJson, SESSION_KEY, STATE_KEY, ACCOUNTS_KEY } from "../utils/storage";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [accounts, setAccounts] = useState(() => loadJson(ACCOUNTS_KEY, initialAccounts));
  const [appState, setAppState] = useState(() => loadJson(STATE_KEY, initialAppState));
  const [session, setSession] = useState(() => loadJson(SESSION_KEY, null));
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "owner@royalstables.vn", password: "owner123" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", role: "owner" });

  const user = useMemo(
    () => accounts.find((account) => account.id === session?.userId) ?? null,
    [accounts, session]
  );

  useEffect(() => { saveJson(ACCOUNTS_KEY, accounts); }, [accounts]);
  useEffect(() => { saveJson(STATE_KEY, appState); }, [appState]);
  useEffect(() => { saveJson(SESSION_KEY, session); }, [session]);

  function handleLoginSubmit(event) {
    event.preventDefault();
    const account = accounts.find(
      (item) =>
        item.email.toLowerCase() === loginForm.email.trim().toLowerCase() &&
        item.password === loginForm.password
    );
    if (!account) {
      setAuthError("Incorrect email or password. Please try again or select a system account on the left.");
      return;
    }
    setAuthError("");
    setSession({ userId: account.id });
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    if (!registerForm.name || !registerForm.email || registerForm.password.length < 6) {
      setAuthError("Please fill in all fields and use a password of at least 6 characters.");
      return;
    }
    if (accounts.some((a) => a.email.toLowerCase() === registerForm.email.trim().toLowerCase())) {
      setAuthError("This email address is already registered in the system.");
      return;
    }
    const badgeMap = { owner: "HO", jockey: "JK", spectator: "SP" };
    const orgMap = { owner: "New Stable", jockey: "Independent Rider", spectator: "New Fan" };
    const newAccount = {
      id: `${registerForm.role}-${Date.now()}`,
      role: registerForm.role,
      name: registerForm.name.trim(),
      organization: orgMap[registerForm.role],
      email: registerForm.email.trim(),
      password: registerForm.password,
      badge: badgeMap[registerForm.role]
    };
    setAccounts((prev) => [...prev, newAccount]);
    setAppState((prev) => ({
      ...prev,
      users: [
        ...prev.users,
        { id: `user-${Date.now()}`, name: newAccount.name, role: newAccount.role, status: "Active", lastSeen: "Just created" }
      ],
      notifications: [
        ...prev.notifications,
        {
          id: `noti-${Date.now()}`,
          userId: newAccount.id,
          tone: "info",
          title: "Account created successfully",
          detail: "You can now sign in to access your role-based dashboard."
        }
      ]
    }));
    setAuthError("");
    setAuthMode("login");
    setLoginForm({ email: newAccount.email, password: newAccount.password });
    setRegisterForm({ name: "", email: "", password: "", role: "owner" });
  }

  function handleAction(type, id, value) {
    setAppState((prev) => {
      if (type === "ownerConfirmRace") {
        return { ...prev, races: prev.races.map((r) => (r.id === id ? { ...r, ownerConfirmed: !r.ownerConfirmed } : r)) };
      }
      if (type === "jockeyInvite") {
        return {
          ...prev,
          invitations: prev.invitations.map((inv) => (inv.id === id ? { ...inv, status: value } : inv)),
          races: prev.races.map((race) => {
            const inv = prev.invitations.find((i) => i.id === id);
            if (!inv || race.id !== inv.raceId) return race;
            return { ...race, jockeyConfirmed: value === "Accepted" };
          })
        };
      }
      if (type === "refereeCheck") {
        return {
          ...prev,
          refereeChecks: prev.refereeChecks.map((c) => (c.id === id ? { ...c, [value]: !c[value] } : c))
        };
      }
      if (type === "approval") {
        return { ...prev, approvals: prev.approvals.map((a) => (a.id === id ? { ...a, status: value } : a)) };
      }
      if (type === "publishQueue") {
        return {
          ...prev,
          publishQueue: prev.publishQueue.map((item) =>
            item.id === id ? { ...item, publishStatus: "Published" } : item
          )
        };
      }
      if (type === "makePrediction" && user) {
        return {
          ...prev,
          predictions: [
            {
              id: `pred-${Date.now()}`,
              spectatorId: user.id,
              raceId: prev.liveBoard.raceId,
              horse: id,
              odds: "2.7",
              status: "Open",
              reward: "-"
            },
            ...prev.predictions
          ]
        };
      }
      return prev;
    });
  }

  function handleLogout() {
    setSession(null);
    setAuthMode("login");
  }

  function handleSelectAccount(account) {
    setAuthMode("login");
    setAuthError("");
    setLoginForm({ email: account.email, password: account.password });
  }

  function handleModeChange(mode) {
    setAuthError("");
    setAuthMode(mode);
  }

  const value = {
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
    handleLogout,
    handleSelectAccount,
    handleModeChange
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
