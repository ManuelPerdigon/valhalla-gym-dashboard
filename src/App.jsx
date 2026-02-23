import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";

// ✅ Ajusta estos imports a tus archivos reales:
import AdminApp from "./pages/AdminApp";
import ClientApp from "./pages/ClientApp"; // <-- CAMBIA si tu app normal se llama distinto

function RouterLike() {
  const { user, isAuthed } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isAdminPath = path.startsWith("/admin");

  // ✅ Si intentan entrar a /admin sin ser admin, los mandamos a /
  useEffect(() => {
    if (!isAdminPath) return;
    if (!isAuthed) return; // aún no logea

    if (user?.role !== "admin") {
      window.history.pushState({}, "", "/");
      setPath("/");
    }
  }, [isAdminPath, isAuthed, user?.role]);

  // ✅ Render correcto según URL
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