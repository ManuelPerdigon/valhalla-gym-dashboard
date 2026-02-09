import { useEffect, useMemo, useState } from "react";
import ClientForm from "../components/ClientForm";
import ClientCard from "../components/ClientCard";
import Dashboard from "../components/Dashboard";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";

export default function AdminApp() {
  const { user, logout, API_URL, authHeaders } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");

  // UI filtros clientes
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [sortBy, setSortBy] = useState("recent"); // recent | old | az | za

  /* ===== USERS ===== */
  const [users, setUsers] = useState([]);
  const [uName, setUName] = useState("");
  const [uUsername, setUUsername] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uClientId, setUClientId] = useState("");
  const [uErr, setUErr] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (t) => setToast({ type: "success", ...t });

  // Confirm delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

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

  async function loadAll() {
    setLoading(true);
    const [uRes, cRes] = await Promise.all([
      apiFetch("/users", { method: "GET" }),
      apiFetch("/clients", { method: "GET" }),
    ]);

    if (uRes.ok && Array.isArray(uRes.data)) setUsers(uRes.data);
    else showToast({ type: "error", title: "No cargó usuarios", message: uRes.data?.error || "Error" });

    if (cRes.ok && Array.isArray(cRes.data)) setClients(cRes.data);
    else showToast({ type: "error", title: "No cargó clientes", message: cRes.data?.error || "Error" });

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== CLIENTES ===== */
  const addClient = async () => {
    const n = name.trim();
    if (!n) {
      showToast({ type: "warn", title: "Falta nombre", message: "Escribe el nombre del cliente." });
      return;
    }

    setBusy(true);
    const res = await apiFetch("/clients", {
      method: "POST",
      body: JSON.stringify({ name: n }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo crear cliente", message: res.data?.error || "Error" });
      return;
    }

    setClients((prev) => [res.data, ...prev]);
    setName("");
    showToast({ type: "success", title: "Cliente creado", message: n });
  };

  const requestDeleteClient = (client) => {
    setToDelete(client);
    setConfirmOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!toDelete) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${toDelete.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo eliminar", message: res.data?.error || "Error" });
      return;
    }

    setClients((prev) => prev.filter((c) => c.id !== toDelete.id));
    showToast({ type: "success", title: "Cliente eliminado", message: toDelete.name });
    setConfirmOpen(false);
    setToDelete(null);
  };

  const toggleStatus = async (id) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: c.active ? 0 : 1 }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo actualizar estado", message: res.data?.error || "Error" });
      return;
    }

    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({
      type: "success",
      title: "Estado actualizado",
      message: `${res.data.name}: ${res.data.active ? "Activo" : "Inactivo"}`,
    });
  };

  const saveRoutine = async (id, routine) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ routine }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo guardar rutina", message: res.data?.error || "Error" });
      return;
    }
    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({ type: "success", title: "Rutina guardada", message: res.data.name });
  };

  const addProgress = async (id, newProgressArray) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ progress: newProgressArray }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo guardar progreso", message: res.data?.error || "Error" });
      return;
    }
    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({ type: "success", title: "Progreso guardado", message: res.data.name });
  };

  const saveGoalWeight = async (id, goalWeight) => {
    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ goalWeight }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo guardar meta", message: res.data?.error || "Error" });
      return;
    }
    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({ type: "success", title: "Meta guardada", message: res.data.name });
  };

  const saveNutrition = async (id, nutritionData) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        nutrition: {
          ...(current.nutrition || {}),
          ...nutritionData,
        },
      }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo guardar nutrición", message: res.data?.error || "Error" });
      return;
    }
    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({ type: "success", title: "Nutrición guardada", message: res.data.name });
  };

  const addNutritionLog = async (id, log) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;

    const next = {
      ...(current.nutrition || {}),
      adherence: [...(current.nutrition?.adherence || []), log],
    };

    setBusy(true);
    const res = await apiFetch(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nutrition: next }),
    });
    setBusy(false);

    if (!res.ok) {
      showToast({ type: "error", title: "No se pudo guardar log", message: res.data?.error || "Error" });
      return;
    }
    setClients((prev) => prev.map((x) => (x.id === id ? res.data : x)));
    showToast({ type: "success", title: "Log guardado", message: res.data.name });
  };

  const exportClientCSV = (id) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const rows = [
      ["Nombre", client.name],
      ["Activo", client.active ? "Sí" : "No"],
      ["Objetivo peso", client.goalWeight || ""],
      ["Rutina", client.routine || ""],
      [],
      ["Fecha", "Peso", "Reps"],
      ...(client.progress || []).map((p) => [p.date, p.weight, p.reps]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${client.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast({ type: "success", title: "CSV exportado", message: client.name });
  };

  /* ===== USERS ===== */
  const refreshUsers = async () => {
    const res = await apiFetch("/users", { method: "GET" });
    if (res.ok && Array.isArray(res.data)) setUsers(res.data);
  };

  const createClientUser = async () => {
    setUErr("");

    const displayName = uName.trim();
    const username = uUsername.trim(); // login real
    const pass = uPassword;

    if (!displayName) return setUErr("Falta nombre del usuario.");
    if (!username) return setUErr("Falta username/login.");
    if (!pass || pass.length < 4) return setUErr("Contraseña mínimo 4 caracteres.");
    if (!uClientId) return setUErr("Selecciona un cliente para asignar.");

    setBusy(true);

    // 1) crear usuario client
    const r = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({ username, password: pass, role: "client" }),
    });

    if (!r.ok) {
      setBusy(false);
      setUErr(r.data?.error || "No se pudo crear usuario.");
      return;
    }

    // 2) asignarlo al cliente
    const patch = await apiFetch(`/clients/${Number(uClientId)}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedUserId: r.data.user.id }),
    });

    setBusy(false);

    if (!patch.ok) {
      setUErr(patch.data?.error || "Usuario creado pero no se pudo asignar al cliente.");
      return;
    }

    setClients((prev) => prev.map((c) => (c.id === Number(uClientId) ? patch.data : c)));
    await refreshUsers();

    setUName("");
    setUUsername("");
    setUPassword("");
    setUClientId("");

    showToast({
      type: "success",
      title: "Usuario creado y asignado",
      message: `${username} → ${patch.data.name}`,
    });
  };

  const visibleClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = [...clients];

    if (s) list = list.filter((c) => (c.name || "").toLowerCase().includes(s));

    if (statusFilter === "active") list = list.filter((c) => !!c.active);
    if (statusFilter === "inactive") list = list.filter((c) => !c.active);

    if (sortBy === "az") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "za") list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    else if (sortBy === "old") list.sort((a, b) => Number(a.id) - Number(b.id));
    else list.sort((a, b) => Number(b.id) - Number(a.id));

    return list;
  }, [clients, search, statusFilter, sortBy]);

  const clientUsers = users.filter((u) => u.role === "client");
  const adminUsers = users.filter((u) => u.role === "admin");

  return (
    <div className="app">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar cliente"
        message={`Vas a eliminar a "${toDelete?.name}". Esto no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setConfirmOpen(false);
          setToDelete(null);
        }}
        onConfirm={confirmDeleteClient}
      />

      <h1>Valhalla Gym</h1>

      <div className="dashboard">
        <h2>⚔️ Panel Admin</h2>
        <small className="muted">
          Sesión: {user?.username} ({user?.role})
        </small>

        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" onClick={logout} disabled={busy}>
            Cerrar sesión
          </button>
          <button type="button" onClick={loadAll} disabled={loading || busy}>
            {loading ? "Cargando..." : "Recargar"}
          </button>
        </div>

        <small className="muted">API: {API_URL}</small>
      </div>

      {/* ===== USUARIOS ===== */}
      <div className="dashboard">
        <h2>👥 Usuarios</h2>

        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Crear usuario cliente</h3>

          <div className="row">
            <input
              placeholder="Nombre (display)"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              disabled={busy}
            />
            <input
              placeholder="Username/login (ej: cliente1)"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              disabled={busy}
            />
            <input
              placeholder="Password"
              type="password"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              disabled={busy}
            />

            <select
              value={uClientId}
              onChange={(e) => setUClientId(e.target.value)}
              disabled={busy}
              style={{
                background: "#0f0f0f",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px",
                borderRadius: "10px",
              }}
            >
              <option value="">Asignar a cliente…</option>
              {clients
                .slice()
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <button type="button" onClick={createClientUser} disabled={busy}>
              {busy ? "Guardando..." : "Crear + Asignar"}
            </button>
          </div>

          {uErr && <small style={{ color: "#ff5555" }}>{uErr}</small>}

          <small className="muted" style={{ marginTop: 10 }}>
            Tip: crea el <strong>cliente</strong> primero, luego crea el usuario y asigna.
          </small>
        </div>

        <div className="client-section">
          <h3>Usuarios cliente ({clientUsers.length})</h3>
          {clientUsers.length === 0 ? (
            <small className="muted">Aún no hay usuarios cliente.</small>
          ) : (
            <ul className="progress-list">
              {clientUsers.map((u) => (
                <li key={u.id}>
                  <strong>{u.username}</strong> — <small className="muted">{u.role}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="client-section">
          <h3>Admins ({adminUsers.length})</h3>
          <small className="muted">Admin principal (API).</small>
        </div>
      </div>

      {/* ===== TU APP ACTUAL ===== */}
      <Dashboard clients={clients} />

      {/* Controles lista clientes */}
      <div className="client-section">
        <div className="row">
          <input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={busy}
            style={{
              background: "#0f0f0f",
              border: "1px solid #333",
              color: "#fff",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={busy}
            style={{
              background: "#0f0f0f",
              border: "1px solid #333",
              color: "#fff",
              padding: "10px",
              borderRadius: "10px",
            }}
          >
            <option value="recent">Más recientes</option>
            <option value="old">Más antiguos</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSortBy("recent");
            }}
            disabled={busy}
          >
            Limpiar
          </button>
        </div>

        <small className="muted">
          Mostrando {visibleClients.length} de {clients.length} clientes
          {busy ? " · Guardando…" : ""}
        </small>
      </div>

      <ClientForm name={name} setName={setName} addClient={addClient} />

      <ul style={{ padding: 0 }}>
        {loading ? (
          <div className="dashboard">Cargando…</div>
        ) : (
          visibleClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              toggleStatus={toggleStatus}
              deleteClient={() => requestDeleteClient(client)}
              saveRoutine={saveRoutine}
              addProgress={addProgress}
              saveNutrition={saveNutrition}
              addNutritionLog={addNutritionLog}
              saveGoalWeight={saveGoalWeight}
              exportClientCSV={exportClientCSV}
            />
          ))
        )}
      </ul>
    </div>
  );
}