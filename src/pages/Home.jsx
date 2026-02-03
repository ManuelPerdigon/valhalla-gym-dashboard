import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./admin/AdminDashboard";
import ClientDashboard from "./client/ClientDashboard";

export default function Home() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <AdminDashboard />;

  return <ClientDashboard />;
}