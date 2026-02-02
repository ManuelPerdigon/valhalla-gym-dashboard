import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const AUTH_KEY = "valhalla_auth_user";
const USERS_KEY = "valhalla_users";

function seedDefaultUsersIfEmpty() {
  const existing = localStorage.getItem(USERS_KEY);
  if (existing) return;

  const defaultUsers = [
    {
      id: Date.now(),
      role: "admin",
      name: "Admin",
      email: "admin@valhalla.com",
      password: "admin123",
      clientId: null,
      createdAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    seedDefaultUsersIfEmpty();

    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    const found = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (!found) return { ok: false, message: "Credenciales incorrectas" };

    // No guardamos password en sesión
    const safeUser = {
      id: found.id,
      role: found.role,
      name: found.name,
      email: found.email,
      clientId: found.clientId ?? null,
    };

    setUser(safeUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getStoredUsers() {
  seedDefaultUsersIfEmpty();
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function setStoredUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}