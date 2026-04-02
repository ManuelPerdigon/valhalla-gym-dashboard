// src/pages/ClientApp.jsx
import { useEffect, useMemo, useState } from "react";
import Dashboard from "../components/Dashboard";
import { useAuth } from "../context/AuthContext";

function parseJSONSafe(v, fallback) {
  try {
    if (v == null) return fallback;
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return fallback;
  }
}

function normalizeClient(raw) {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    nutrition: parseJSONSafe(raw.nutrition, { adherence: [] }),
    progress: parseJSONSafe(raw.progress, []),
  };
}

export default function ClientApp() {
  const { API_URL, authHeaders, user, isAuthed, login, logout, loading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [client, setClient] = useState(null);
  const [clientsRaw, setClientsRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState("");

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  const loadAssignedClient = async () => {
    if (!isAuthed || !user?.id) return;

    setLoading(true);
    setErr("");

    const res = await apiFetch("/clients", { method: "GET" });
    setLoading(false);

    if (!res.ok) {
      setErr(res.data?.error || `No se pudo cargar /clients (status ${res.status})`);
      setClientsRaw([]);
      setClient(null);
      return;
    }

    const list = Array.isArray(res.data) ? res.data.map(normalizeClient) : [];
    setClientsRaw(list);

    const mine = list.find((c) => String(c.assignedUserId || "") === String(user.id));
    setClient(mine || null);
  };

  useEffect(() => {
    if (!isAuthed) return;
    loadAssignedClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, user?.id, API_URL]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setErr("Escribe usuario y contraseña.");
      return;
    }

    const r = await login(u, p);
    if (!r.ok) {
      setErr(r.error || "Login falló");
      return;
    }

    setTimeout(() => {
      loadAssignedClient();
    }, 0);
  };

  const handleLogout = () => {
    logout();
    setClient(null);
    setClientsRaw([]);
    setUsername("");
    setPassword("");
    setErr("");
  };

  const patchClient = async (patch) => {
    if (!client?.id) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${client.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setBusy(false);

    if (!res.ok) {
      setErr(res.data?.error || `No se pudo guardar (status ${res.status})`);
      return null;
    }

    const updated = normalizeClient(res.data);
    setClient(updated);

    setClientsRaw((prev) =>
      prev.map((c) => (String(c.id) === String(updated.id) ? updated : c))
    );

    return updated;
  };

  const addProgress = async (newProgressArray) => {
    await patchClient({ progress: newProgressArray });
  };

  const isAdmin = user?.role === "admin";
  const title = useMemo(() => {
    if (!isAuthed) return "Valhalla Gym";
    if (isAdmin) return "Valhalla Gym · Admin (usa /admin)";
    return "Valhalla Gym · Cliente";
  }, [isAuthed, isAdmin]);

  if (!isAuthed) {
    return (
      <div className="app">
        <h1>{title}</h1>

        <div className="login-shell">
          <div className="login-panel">
            <div className="login-copy">
              <small className="client-eyebrow">Valhalla Access</small>
              <h2 className="login-title">Fuerza. Disciplina. Progreso.</h2>
              <p className="login-subtitle">
                Accede a tu panel para revisar tu rutina, consultar tu nutrición y registrar tu avance diario.
              </p>

              <div className="login-features">
                <div className="login-feature-card">
                  <strong>Rutina</strong>
                  <small className="muted">Consulta tu plan asignado</small>
                </div>
                <div className="login-feature-card">
                  <strong>Nutrición</strong>
                  <small className="muted">Visualiza tu guía alimenticia</small>
                </div>
                <div className="login-feature-card">
                  <strong>Progreso</strong>
                  <small className="muted">Registra tu evolución</small>
                </div>
              </div>
            </div>

            <div className="login-form-card">
              <small className="client-eyebrow">Iniciar sesión</small>
              <h3 className="login-form-title">Bienvenido</h3>

              <form onSubmit={handleLogin} className="login-form">
                <div>
                  <label className="form-label">Usuario</label>
                  <input
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={authLoading}
                  />
                </div>

                <div>
                  <label className="form-label">Contraseña</label>
                  <input
                    placeholder="Contraseña"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={authLoading}
                  />
                </div>

                <button type="submit" disabled={authLoading}>
                  {authLoading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              {err && <div className="client-alert error">{err}</div>}

              <small className="muted" style={{ marginTop: 12, display: "block" }}>
                API: {API_URL}
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>{title}</h1>

      <div className="client-shell">
        <div className="client-hero">
          <div>
            <small className="client-eyebrow">Panel del cliente</small>
            <h2 className="client-hero-title">
              {client?.name ? `Bienvenido, ${client.name}` : "Bienvenido"}
            </h2>
            <p className="client-hero-subtitle">
              Consulta tu información y registra tu avance de forma simple.
            </p>
          </div>

          <div className="client-hero-actions">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/admin";
                }}
                disabled={busy}
              >
                Ir a /admin
              </button>
            )}

            <button type="button" onClick={loadAssignedClient} disabled={loading || busy}>
              {loading ? "Cargando..." : "Recargar"}
            </button>

            <button type="button" onClick={handleLogout} disabled={busy}>
              Salir
            </button>
          </div>
        </div>

        <div className="client-session-card">
          <div>
            <small className="muted">Sesión</small>
            <div className="client-session-value">
              {user?.username} ({user?.role})
            </div>
          </div>

          <div>
            <small className="muted">Estado</small>
            <div className="client-session-value">
              {client?.active ? "Activo" : "Sin asignar / Inactivo"}
            </div>
          </div>

          <div>
            <small className="muted">API</small>
            <div className="client-session-value">{API_URL}</div>
          </div>
        </div>

        {err && <div className="client-alert error">{err}</div>}

        <Dashboard clients={client ? [client] : []} />

        {!client ? (
          <div className="dashboard">
            <h2>⚠️ Sin cliente asignado</h2>
            <p className="muted">
              Tu usuario no tiene un cliente asignado aún.
              <br />
              Pídele al admin que te asigne en el panel.
            </p>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              <div>DEBUG:</div>
              <div>user.id: <strong>{String(user?.id)}</strong></div>
              <div>clients cargados: <strong>{clientsRaw.length}</strong></div>
            </div>
          </div>
        ) : (
          <ClientOnlyCard
            client={client}
            busy={busy}
            addProgress={addProgress}
            setErr={setErr}
          />
        )}
      </div>
    </div>
  );
}

function ClientOnlyCard({ client, busy, addProgress, setErr }) {
  const [open, setOpen] = useState(null);
  const [progressForm, setProgressForm] = useState({ date: "", weight: "", reps: "" });

  const nutrition = client?.nutrition || { adherence: [] };
  const progress = Array.isArray(client?.progress) ? client.progress : [];

  const submitProgress = () => {
    setErr("");

    const date = (progressForm.date || "").trim();
    const weight = (progressForm.weight || "").trim();

    if (!date || !weight) {
      setErr("Falta fecha y peso.");
      return;
    }

    const already = progress.some((p) => String(p?.date || "").slice(0, 10) === date);
    if (already) {
      setErr(`Ya registraste progreso para ${date}. Solo se permite 1 por día.`);
      return;
    }

    const next = [
      { date, weight, reps: (progressForm.reps || "").trim() },
      ...progress,
    ];

    addProgress(next);
    setProgressForm({ date: "", weight: "", reps: "" });
    setErr(`Progreso guardado para ${date} ✅`);
  };

  const tab = (key) => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: open === key ? "1px solid #444" : "1px solid #2a2a2a",
    background: open === key ? "linear-gradient(180deg, #1a1a1a, #101010)" : "#0d0d0d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: open === key ? "0 6px 18px rgba(0,0,0,0.35)" : "none",
  });

  const sectionCardStyle = {
    background: "linear-gradient(180deg, #121212, #0c0c0c)",
    border: "1px solid #252525",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    opacity: 0.78,
    marginBottom: 6,
  };

  return (
    <div className="client-card client-card-premium">
      <div className="client-card-top">
        <div>
          <div className="client-card-title">{client.name}</div>
          <small className="muted">ID Cliente: {client.id}</small>
        </div>

        <span className={client.active ? "status-badge status-badge-active" : "status-badge status-badge-inactive"}>
          {client.active ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="client-card-summary">
        <div className="client-mini-stat">
          <small className="muted">Rutina</small>
          <strong>{client.routine ? "Asignada" : "Sin rutina"}</strong>
        </div>

        <div className="client-mini-stat">
          <small className="muted">Registros de progreso</small>
          <strong>{progress.length}</strong>
        </div>

        <div className="client-mini-stat">
          <small className="muted">Bitácora nutricional</small>
          <strong>{(nutrition?.adherence || []).length}</strong>
        </div>
      </div>

      <div className="client-tabs">
        <button type="button" style={tab("routine")} onClick={() => setOpen(open === "routine" ? null : "routine")} disabled={busy}>
          Rutina
        </button>

        <button type="button" style={tab("nutrition")} onClick={() => setOpen(open === "nutrition" ? null : "nutrition")} disabled={busy}>
          Nutrición
        </button>

        <button type="button" style={tab("progress")} onClick={() => setOpen(open === "progress" ? null : "progress")} disabled={busy}>
          Progreso
        </button>
      </div>

      {open === "routine" && (
        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Rutina (solo lectura)</h3>
          <textarea
            value={client.routine || ""}
            readOnly
            style={{ width: "100%", minHeight: 160, opacity: 0.95 }}
          />
        </div>
      )}

      {open === "nutrition" && (
        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Plan de Nutrición (solo lectura)</h3>

          <div className="client-readonly-grid">
            <div>
              <label style={labelStyle}>Calorías</label>
              <input value={nutrition?.calories || ""} disabled />
            </div>
            <div>
              <label style={labelStyle}>Proteína</label>
              <input value={nutrition?.protein || ""} disabled />
            </div>
            <div>
              <label style={labelStyle}>Carbs</label>
              <input value={nutrition?.carbs || ""} disabled />
            </div>
            <div>
              <label style={labelStyle}>Grasas</label>
              <input value={nutrition?.fats || ""} disabled />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Notas</label>
            <textarea
              value={nutrition?.notes || ""}
              disabled
              style={{ width: "100%", minHeight: 100 }}
            />
          </div>

          <hr />

          <h4 style={{ margin: "0 0 8px" }}>Bitácora (solo lectura)</h4>
          {(nutrition?.adherence || []).length > 0 ? (
            <ul className="client-log-list">
              {(nutrition?.adherence || []).slice(0, 12).map((a, idx) => (
                <li key={idx}>
                  {a.note || JSON.stringify(a)}
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">Sin registros</small>
          )}
        </div>
      )}

      {open === "progress" && (
        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Progreso (1 vez por día)</h3>

          <div className="client-readonly-grid">
            <div>
              <label style={labelStyle}>Fecha</label>
              <input
                type="date"
                value={progressForm.date}
                onChange={(e) => setProgressForm((p) => ({ ...p, date: e.target.value }))}
                disabled={busy}
              />
            </div>

            <div>
              <label style={labelStyle}>Peso</label>
              <input
                placeholder="Peso"
                value={progressForm.weight}
                onChange={(e) => setProgressForm((p) => ({ ...p, weight: e.target.value }))}
                disabled={busy}
              />
            </div>

            <div>
              <label style={labelStyle}>Reps (opcional)</label>
              <input
                placeholder="Reps (opcional)"
                value={progressForm.reps}
                onChange={(e) => setProgressForm((p) => ({ ...p, reps: e.target.value }))}
                disabled={busy}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={submitProgress} disabled={busy}>
              Agregar progreso
            </button>
          </div>

          {(progress || []).length > 0 && (
            <ul className="progress-list">
              {(progress || []).slice(0, 12).map((p, idx) => (
                <li key={idx}>
                  {p.date} — {p.weight} {p.reps ? `(${p.reps})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}