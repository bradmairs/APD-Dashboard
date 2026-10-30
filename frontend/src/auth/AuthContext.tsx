import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getMe,
  login as apiLogin,
  loginWithTwoFactor as apiLoginWithTwoFactor,
  logout as apiLogout,
} from "../api";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isViewer: boolean;
  // Resolves with the challenge token when the account has two-factor auth on;
  // the caller then collects a code and calls completeTwoFactor.
  login: (email: string, password: string) => Promise<{ challengeToken: string } | null>;
  completeTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Applies a change already saved on the server to the cached user, e.g. a
  // preference, without re-fetching it.
  patchUser: (changes: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    if (result.twoFactorRequired) return { challengeToken: result.challengeToken };
    setUser(result.user);
    return null;
  }

  async function completeTwoFactor(challengeToken: string, code: string) {
    setUser(await apiLoginWithTwoFactor(challengeToken, code));
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  async function refreshUser() {
    setUser(await getMe());
  }

  function patchUser(changes: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  const isViewer = user?.role === "VIEWER";

  return (
    <AuthContext.Provider value={{
        user,
        loading,
        isViewer,
        login,
        completeTwoFactor,
        logout,
        refreshUser,
        patchUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
