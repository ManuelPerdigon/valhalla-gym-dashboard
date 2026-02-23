import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 1) API URL correcto (Vercel necesita env var)
  const envApi = import.meta.env.VITE_API_URL;
  const [API_URL] = useState(() => {
    let url = envApi || "http://localhost:5050";

    // Safety: si estás en dominio https (Vercel) y quedó localhost, corrige
    if (typeof window !== "undefined") {
      const isProdSite = window.location.origin.includes("vercel.app");
      if (isProdSite && url.includes("localhost")) {
        url = "https://valhalla-gym-api.onrender.com";
      }
    }

    return url;
  });

  const [token, setToken] = useState(() => localStorage.getItem("vh_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("vh_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const isAuthed = !!token && !!user;

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // 2) Check token (suave): si falla NO te desloguea automático
  useEffect(() => {
    const check = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/me`, { headers: { ...authHeaders } });

        // si tu API no tiene /me, NO mates la sesión
        if (res.status === 404) return;

        if (!res.ok) return; // tampoco logout automático
        const data = await res.json().catch(() => ({}));

        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("vh_user", JSON.stringify(data.user));
        }
      } catch {
        // no hacer logout automático
      }
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
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