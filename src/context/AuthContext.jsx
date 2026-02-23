// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "vh_token";

export function AuthProvider({ children }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAuthed = !!token && !!user;

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  // ✅ ESTE ES EL FIX CLAVE:
  // Siempre que cambie el token, valida /me.
  useEffect(() => {
    let cancelled = false;

    async function checkMe() {
      if (!token) {
        setUser(null);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/me`, {
          method: "GET",
          headers: { ...authHeaders },
        });

        const data = await safeJson(res);

        if (cancelled) return;

        if (!res.ok) {
          // token inválido / expirado
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
          return;
        }

        setUser(data.user || null);
      } catch {
        if (!cancelled) {
          // si falla red / API, no mates token; solo marca user null temporalmente
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkMe();

    return () => {
      cancelled = true;
    };
  }, [API_URL, token, authHeaders]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        return { ok: false, error: data?.error || `Error ${res.status}` };
      }

      const nextToken = data?.token || "";
      const nextUser = data?.user || null;

      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(nextUser);

      return { ok: true, user: nextUser };
    } catch {
      return { ok: false, error: "No se pudo conectar con el servidor" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  const value = {
    API_URL,
    token,
    user,
    isAuthed,
    authHeaders,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}