// src/App.jsx
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";

import AdminApp from "./pages/AdminApp";
import ClientApp from "./pages/ClientApp";

import "./App.css"; // ✅ importante (estilos)

function RouterLike() {
  const { user, isAuthed } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isAdminPath = path.startsWith("/admin");

  // ✅ Si está en /admin pero no está logeado, lo mandamos al login normal ("/")
  useEffect(() => {
    if (!isAdminPath) return;

    if (!isAuthed) {
      window.history.replaceState({}, "", "/");
      setPath("/");
      return;
    }

    if (user?.role !== "admin") {
      window.history.replaceState({}, "", "/");
      setPath("/");
    }
  }, [isAdminPath, isAuthed, user?.role]);

  // Render
  if (isAdminPath && isAuthed && user?.role === "admin") return <AdminApp />;
  return <ClientApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterLike />
      </ToastProvider>
    </AuthProvider>
  );
}