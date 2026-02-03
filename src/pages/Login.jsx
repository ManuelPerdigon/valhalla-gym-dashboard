import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const handleLogin = () => {
    setErr("");
    const res = login(username.trim(), password);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    // redirige según rol
    navigate("/", { replace: true });
  };

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>
      <div className="dashboard">
        <h2>Iniciar sesión</h2>

        <div className="row">
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={handleLogin}>
            Entrar
          </button>
        </div>

        {err && <small style={{ color: "#ff5555" }}>{err}</small>}

        <small className="muted" style={{ marginTop: 10 }}>
          Demo: admin / admin123 — cliente1 / 1234
        </small>
      </div>
    </div>
  );
}