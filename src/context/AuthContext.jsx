import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("vh_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("vh_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthed = !!token && !!user;

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // Verifica token al cargar (opcional pero recomendado)
  useEffect(() => {
    const check = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/me`, {
          headers: { ...authHeaders },
        });

        if (!res.ok) throw new Error("Token inválido");
        const data = await res.json();

        // Mantener user sincronizado
        setUser(data.user);
        localStorage.setItem("vh_user", JSON.stringify(data.user));
      } catch {
        // Limpia si token falló
        logout();
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login falló");

      setToken(data.token);
      setUser(data.user);

      localStorage.setItem("vh_token", data.token);
      localStorage.setItem("vh_user", JSON.stringify(data.user));

      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: e.message || "Error" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("vh_token");
    localStorage.removeItem("vh_user");
  };

  const value = {
    API_URL,
    token,
    user,
    isAuthed,
    loading,
    authHeaders,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}