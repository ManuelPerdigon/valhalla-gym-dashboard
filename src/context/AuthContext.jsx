import { createContext, useContext, useEffect, useState } from "react";
import { users } from "../data/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // sesión persistente
  useEffect(() => {
    const stored = localStorage.getItem("valhalla_session");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (username, password) => {
    const found = users.find(
      (u) => u.username === username && u.password === password
    );
    if (!found) return { ok: false, message: "Usuario o contraseña incorrectos." };

    const session = { id: found.id, username: found.username, role: found.role };
    setUser(session);
    localStorage.setItem("valhalla_session", JSON.stringify(session));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("valhalla_session");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}