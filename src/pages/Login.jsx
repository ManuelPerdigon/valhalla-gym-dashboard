import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/client", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = (e) => {
    e.preventDefault();
    setErr("");

    const res = login(email.trim(), password);
    if (!res.ok) {
      setErr(res.message || "Error");
      return;
    }
    // useEffect redirige
  };

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      <div className="dashboard">
        <h2>🔐 Iniciar sesión</h2>

        <form onSubmit={onSubmit} className="client-section">
          <div className="row">
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit">Entrar</button>
          </div>

          {err && <small style={{ color: "#ff5555" }}>{err}</small>}

          <div style={{ marginTop: 12 }}>
            <small className="muted">
              Admin demo (se crea automático):{" "}
              <strong>admin@valhalla.com</strong> / <strong>admin123</strong>
              <br />
              Los clientes los creas desde el panel Admin.
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}