// src/App.jsx
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";

import AdminApp from "./pages/AdminApp";
import ClientApp from "./pages/ClientApp";

function RouterLike() {
  const { user, isAuthed } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);

    const _push = history.pushState;
    const _replace = history.replaceState;

    history.pushState = function (...args) {
      _push.apply(history, args);
      sync();
    };
    history.replaceState = function (...args) {
      _replace.apply(history, args);
      sync();
    };

    return () => {
      window.removeEventListener("popstate", sync);
      history.pushState = _push;
      history.replaceState = _replace;
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const isAdminPath = path.startsWith("/admin");

  useEffect(() => {
    if (!isAuthed) return;
    if (!isAdmin) return;

    if (!isAdminPath) {
      window.history.replaceState({}, "", "/admin");
      setPath("/admin");
    }
  }, [isAuthed, isAdmin, isAdminPath]);

  useEffect(() => {
    if (!isAuthed) return;
    if (isAdmin) return;

    if (isAdminPath) {
      window.history.replaceState({}, "", "/");
      setPath("/");
    }
  }, [isAuthed, isAdmin, isAdminPath]);

  if (isAuthed && isAdmin) return <AdminApp />;
  if (isAdminPath) return <AdminApp />;
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