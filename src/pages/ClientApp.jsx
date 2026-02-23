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
  const [clientsRaw, setClientsRaw] = useState([]); // por si quieres dashboard global
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState("");

  // ===== API helper =====
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

  // ===== load client assigned to logged-in user =====
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

    // ✅ CLAVE: el cliente “de este usuario”
    const mine = list.find((c) => String(c.assignedUserId || "") === String(user.id));
    setClient(mine || null);
  };

  // cuando cambia auth, recarga
  useEffect(() => {
    if (!isAuthed) return;
    loadAssignedClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, user?.id, API_URL]);

  // ===== handlers: login/logout =====
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

    // ✅ tras login, carga su cliente asignado
    // (el effect lo hará, pero esto lo hace inmediato)
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

  // ===== client actions (solo progress/nutrition) =====
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

    // también actualiza la lista (por si Dashboard lo usa)
    setClientsRaw((prev) =>
      prev.map((c) => (String(c.id) === String(updated.id) ? updated : c))
    );

    return updated;
  };

  const addProgress = async (newProgressArray) => {
    await patchClient({ progress: newProgressArray });
  };

  const saveNutrition = async (nutritionObj) => {
    const current = client?.nutrition || { adherence: [] };
    await patchClient({
      nutrition: {
        ...current,
        ...nutritionObj,
      },
    });
  };

  const addNutritionLog = async (log) => {
    const current = client?.nutrition || { adherence: [] };
    const next = {
      ...current,
      adherence: [...(current.adherence || []), log],
    };
    await patchClient({ nutrition: next });
  };

  // ===== UI derived =====
  const isAdmin = user?.role === "admin";
  const title = useMemo(() => {
    if (!isAuthed) return "Valhalla Gym";
    if (isAdmin) return "Valhalla Gym · Admin (usa /admin)";
    return "Valhalla Gym · Cliente";
  }, [isAuthed, isAdmin]);

  // =========================
  // RENDER
  // =========================
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

          {err && (
            <div style={{ marginTop: 10, color: "#ff5555" }}>
              {err}
            </div>
          )}

          <small className="muted" style={{ marginTop: 12 }}>
            API: {API_URL}
          </small>
        </div>
      </div>
    );
  }

  // logeado
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

        {err && (
          <div style={{ marginTop: 10, color: "#ff5555" }}>
            {err}
          </div>
        )}
      </div>

      {/* Dashboard global (opcional): si quieres que el cliente solo vea SU info,
          puedes pasar [client].filter(Boolean) */}
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
          saveNutrition={saveNutrition}
          addNutritionLog={addNutritionLog}
        />
      )}
    </div>
  );
}

/* =========================================================
   UI simple SOLO para cliente (sin asignación, sin admin stuff)
========================================================= */
function ClientOnlyCard({ client, busy, addProgress, saveNutrition, addNutritionLog }) {
  const [open, setOpen] = useState(null);

  const [draftNutrition, setDraftNutrition] = useState(client.nutrition || { adherence: [] });
  useEffect(() => {
    setDraftNutrition(client.nutrition || { adherence: [] });
  }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [progressForm, setProgressForm] = useState({ date: "", weight: "", reps: "" });
  const [adhText, setAdhText] = useState("");

  const submitProgress = () => {
    if (!progressForm.date || !progressForm.weight) return;

    const base = Array.isArray(client.progress) ? client.progress : [];
    const next = [...base];
    next.unshift({
      date: progressForm.date,
      weight: progressForm.weight,
      reps: progressForm.reps || "",
    });
    addProgress(next);
    setProgressForm({ date: "", weight: "", reps: "" });
  };

  const submitNutrition = () => {
    saveNutrition(draftNutrition);
  };

  const submitAdherence = () => {
    const t = adhText.trim();
    if (!t) return;
    const log = { date: new Date().toISOString(), note: t, completed: true };
    addNutritionLog(log);
    setAdhText("");
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
        <button type="button" style={btn("nutrition")} onClick={() => setOpen(open === "nutrition" ? null : "nutrition")} disabled={busy}>
          Nutrición
        </button>
        <button type="button" style={btn("progress")} onClick={() => setOpen(open === "progress" ? null : "progress")} disabled={busy}>
          Progreso
        </button>
      </div>

      {open === "nutrition" && (
        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Plan de Nutrición</h3>

          <div className="row">
            <input
              placeholder="Calorías"
              value={draftNutrition?.calories || ""}
              onChange={(e) => setDraftNutrition((p) => ({ ...(p || {}), calories: e.target.value }))}
              disabled={busy}
            />
            <input
              placeholder="Proteína"
              value={draftNutrition?.protein || ""}
              onChange={(e) => setDraftNutrition((p) => ({ ...(p || {}), protein: e.target.value }))}
              disabled={busy}
            />
            <input
              placeholder="Carbs"
              value={draftNutrition?.carbs || ""}
              onChange={(e) => setDraftNutrition((p) => ({ ...(p || {}), carbs: e.target.value }))}
              disabled={busy}
            />
            <input
              placeholder="Grasas"
              value={draftNutrition?.fats || ""}
              onChange={(e) => setDraftNutrition((p) => ({ ...(p || {}), fats: e.target.value }))}
              disabled={busy}
            />
          </div>

          <textarea
            placeholder="Notas"
            value={draftNutrition?.notes || ""}
            onChange={(e) => setDraftNutrition((p) => ({ ...(p || {}), notes: e.target.value }))}
            style={{ width: "100%", minHeight: 90, marginTop: 10 }}
            disabled={busy}
          />

          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" onClick={submitNutrition} disabled={busy}>
              Guardar nutrición
            </button>
          </div>

          <hr />

          <h4 style={{ margin: "0 0 8px" }}>Bitácora</h4>
          <div className="row">
            <input
              placeholder="Ej: Cumplió macros, 2L agua..."
              value={adhText}
              onChange={(e) => setAdhText(e.target.value)}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={submitAdherence} disabled={busy}>
              Agregar
            </button>
          </div>

          {(client.nutrition?.adherence || []).length > 0 && (
            <ul style={{ marginTop: 10, paddingLeft: 16 }}>
              {(client.nutrition?.adherence || []).slice(0, 10).map((a, idx) => (
                <li key={idx} style={{ opacity: 0.85 }}>
                  {a.note || JSON.stringify(a)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open === "progress" && (
        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Progreso</h3>

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

          {(client.progress || []).length > 0 && (
            <ul className="progress-list">
              {(client.progress || []).slice(0, 12).map((p, idx) => (
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