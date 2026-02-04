import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(username.trim(), password);

    if (!result.ok) {
      setError(result.error || "Credenciales inválidas");
      return;
    }

    // Rutas por rol
    if (result.user.role === "admin") navigate("/admin", { replace: true });
    else navigate("/cliente", { replace: true });
  };

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      <div className="card">
        <h2>Iniciar sesión</h2>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && <p style={{ color: "#ff5555" }}>{error}</p>}

        <small className="muted">
          Demo: admin/admin123 · cliente1/1234 · cliente2/1234
        </small>
      </div>
    </div>
  );
}