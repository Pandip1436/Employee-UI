import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import type { User } from "../types";

// Helper: read from whichever storage has the data
function getStored(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function getStorage(): Storage {
  return localStorage.getItem("stayLoggedIn") === "true" ? localStorage : sessionStorage;
}

function clearAll() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("stayLoggedIn");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userId: string, password: string, stayLoggedIn?: boolean) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = getStored("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => getStored("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then((res) => {
          setUser(res.data.data!);
          getStorage().setItem("user", JSON.stringify(res.data.data));
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (userId: string, password: string, stayLoggedIn = false) => {
    const res = await authApi.login({ userId, password });
    const { user: u, token: t } = res.data.data!;
    setUser(u);
    setToken(t);

    // Clear both first
    clearAll();

    // Store in the right place
    const storage = stayLoggedIn ? localStorage : sessionStorage;
    storage.setItem("token", t);
    storage.setItem("user", JSON.stringify(u));
    if (stayLoggedIn) {
      localStorage.setItem("stayLoggedIn", "true");
    }
  };

  const logout = () => {
    // Call backend to invalidate the active token
    authApi.logout().catch(() => {});
    setUser(null);
    setToken(null);
    clearAll();
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      isAdmin: user?.role === "admin",
      isManager: user?.role === "manager",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
