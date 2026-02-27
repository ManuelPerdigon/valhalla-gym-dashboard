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

  // login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // data
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

  // ✅ Solo cliente: permitir progreso (pero con regla 1 por día).
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

  // ✅ IMPORTANTE: Cliente ya NO edita nutrición ni bitácora
  // (solo lectura). Por eso NO hay saveNutrition / addNutritionLog.

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

        <div className="dashboard">
          <h2>Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="row" style={{ marginTop: 10 }}>
            <input
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={authLoading}
            />
            <input
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={authLoading}
            />
            <button type="submit" disabled={authLoading}>
              {authLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {err && <div style={{ marginTop: 10, color: "#ff5555" }}>{err}</div>}

          <small className="muted" style={{ marginTop: 12 }}>
            API: {API_URL}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>{title}</h1>

      <div className="dashboard">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <small className="muted">
              Sesión: {user?.username} ({user?.role})
            </small>
            <small className="muted">API: {API_URL}</small>
          </div>

          <div className="row" style={{ marginTop: 0 }}>
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

        {err && <div style={{ marginTop: 10, color: "#ff5555" }}>{err}</div>}
      </div>

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
  );
}

/* =========================================================
   UI simple SOLO para cliente (rutina + nutrición SOLO VER, progreso editable 1/día)
========================================================= */
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

    // ✅ Regla: 1 registro por fecha
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

  const btn = (key) => ({
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #333",
    background: open === key ? "#141414" : "#0f0f0f",
    color: "#fff",
    cursor: "pointer",
  });

  return (
    <div className="client-card">
      <div className="client-header" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>{client.name}</strong>
          <small>ID: {client.id}</small>
        </div>

        <span className={client.active ? "status-active" : "status-inactive"}>
          {client.active ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" style={btn("routine")} onClick={() => setOpen(open === "routine" ? null : "routine")} disabled={busy}>
          Rutina
        </button>

        <button type="button" style={btn("nutrition")} onClick={() => setOpen(open === "nutrition" ? null : "nutrition")} disabled={busy}>
          Nutrición
        </button>

        <button type="button" style={btn("progress")} onClick={() => setOpen(open === "progress" ? null : "progress")} disabled={busy}>
          Progreso
        </button>
      </div>

      {open === "routine" && (
        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Rutina (solo lectura)</h3>
          <textarea
            value={client.routine || ""}
            readOnly
            style={{ width: "100%", minHeight: 140, marginTop: 10, opacity: 0.95 }}
          />
        </div>
      )}

      {open === "nutrition" && (
        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Plan de Nutrición (solo lectura)</h3>

          <div className="row">
            <input placeholder="Calorías" value={nutrition?.calories || ""} disabled />
            <input placeholder="Proteína" value={nutrition?.protein || ""} disabled />
            <input placeholder="Carbs" value={nutrition?.carbs || ""} disabled />
            <input placeholder="Grasas" value={nutrition?.fats || ""} disabled />
          </div>

          <textarea
            placeholder="Notas"
            value={nutrition?.notes || ""}
            disabled
            style={{ width: "100%", minHeight: 90, marginTop: 10 }}
          />

          <hr />

          <h4 style={{ margin: "0 0 8px" }}>Bitácora (solo lectura)</h4>
          {(nutrition?.adherence || []).length > 0 ? (
            <ul style={{ marginTop: 10, paddingLeft: 16 }}>
              {(nutrition?.adherence || []).slice(0, 12).map((a, idx) => (
                <li key={idx} style={{ opacity: 0.85 }}>
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
        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Progreso (1 vez por día)</h3>

          <div className="row">
            <input
              type="date"
              value={progressForm.date}
              onChange={(e) => setProgressForm((p) => ({ ...p, date: e.target.value }))}
              disabled={busy}
            />
            <input
              placeholder="Peso"
              value={progressForm.weight}
              onChange={(e) => setProgressForm((p) => ({ ...p, weight: e.target.value }))}
              disabled={busy}
            />
            <input
              placeholder="Reps (opcional)"
              value={progressForm.reps}
              onChange={(e) => setProgressForm((p) => ({ ...p, reps: e.target.value }))}
              disabled={busy}
            />
            <button type="button" onClick={submitProgress} disabled={busy}>
              Agregar
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