import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allow = [], children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (allow.length && !allow.includes(user.role)) {
    // Si intenta entrar a un lugar que no le corresponde:
    return <Navigate to={user.role === "admin" ? "/admin" : "/client"} replace />;
  }

  return children;
}