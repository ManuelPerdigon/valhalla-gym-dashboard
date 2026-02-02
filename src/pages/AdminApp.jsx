import { useEffect, useMemo, useRef, useState } from "react";
import ClientForm from "../components/ClientForm";
import ClientCard from "../components/ClientCard";
import Dashboard from "../components/Dashboard";
import { useAuth, getStoredUsers, setStoredUsers } from "../context/AuthContext";

export default function AdminApp() {
  const { user, logout } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const isFirstLoad = useRef(true);

  // UI filtros clientes
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [sortBy, setSortBy] = useState("recent"); // recent | old | az | za

  /* ===== USUARIOS (CLIENTES) ===== */
  const [users, setUsers] = useState([]);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uClientId, setUClientId] = useState("");
  const [uErr, setUErr] = useState("");

  useEffect(() => {
    setUsers(getStoredUsers());
  }, []);

  const refreshUsers = () => setUsers(getStoredUsers());

  const createClientUser = () => {
    setUErr("");

    const email = uEmail.trim().toLowerCase();
    const pass = uPassword;

    if (!uName.trim()) return setUErr("Falta nombre del usuario.");
    if (!email) return setUErr("Falta email.");
    if (!pass || pass.length < 4) return setUErr("Contraseña mínimo 4 caracteres.");
    if (!uClientId) return setUErr("Selecciona un cliente para asignar.");

    const current = getStoredUsers();

    if (current.some((u) => u.email.toLowerCase() === email)) {
      return setUErr("Ese email ya existe.");
    }

    const newUser = {
      id: Date.now(),
      role: "client",
      name: uName.trim(),
      email,
      password: pass,
      clientId: Number(uClientId),
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newUser];
    setStoredUsers(updated);
    refreshUsers();

    setUName("");
    setUEmail("");
    setUPassword("");
    setUClientId("");
  };

  const deleteUser = (id) => {
    const current = getStoredUsers();
    const updated = current.filter((u) => u.id !== id);
    setStoredUsers(updated);
    refreshUsers();
  };

  /* ===== PERSISTENCIA CLIENTES ===== */
  useEffect(() => {
    const stored = localStorage.getItem("clients");
    if (stored) setClients(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    localStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  /* ===== CLIENTES ===== */
  const addClient = () => {
    if (!name.trim()) return;

    const newClient = {
      id: Date.now(),
      name: name.trim(),
      active: true,
      routine: "",
      goalWeight: "",
      progress: [],
      nutrition: {
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        notes: "",
        adherence: [],
      },
    };

    setClients((prev) => [...prev, newClient]);
    setName("");
  };

  const deleteClient = (id) => setClients((prev) => prev.filter((c) => c.id !== id));

  const toggleStatus = (id) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );

  const saveRoutine = (id, routine) =>
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, routine } : c)));

  const addProgress = (id, newProgressArray) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, progress: newProgressArray } : c))
    );

  const saveGoalWeight = (id, goalWeight) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, goalWeight } : c))
    );

  const saveNutrition = (id, nutritionData) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, nutrition: { ...c.nutrition, ...nutritionData } } : c
      )
    );

  const addNutritionLog = (id, log) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              nutrition: { ...c.nutrition, adherence: [...c.nutrition.adherence, log] },
            }
          : c
      )
    );

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
  };

  const visibleClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = [...clients];

    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s));

    if (statusFilter === "active") list = list.filter((c) => c.active);
    if (statusFilter === "inactive") list = list.filter((c) => !c.active);

    if (sortBy === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortBy === "old") list.sort((a, b) => a.id - b.id);
    else list.sort((a, b) => b.id - a.id);

    return list;
  }, [clients, search, statusFilter, sortBy]);

  // Helper: nombre del cliente ligado a un usuario
  const getClientNameById = (clientId) => {
    const c = clients.find((x) => x.id === clientId);
    return c ? c.name : "— (cliente no encontrado)";
  };

  const clientUsers = users.filter((u) => u.role === "client");
  const adminUsers = users.filter((u) => u.role === "admin");

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      <div className="dashboard">
        <h2>⚔️ Panel Admin</h2>
        <small className="muted">
          Sesión: {user?.name} ({user?.email})
        </small>
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* ===== USUARIOS ===== */}
      <div className="dashboard">
        <h2>👥 Usuarios</h2>

        <div className="client-section">
          <h3 style={{ marginTop: 0 }}>Crear usuario cliente</h3>

          <div className="row">
            <input
              placeholder="Nombre (usuario)"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
            />
            <input
              placeholder="Email (login)"
              value={uEmail}
              onChange={(e) => setUEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
            />

            <select
              value={uClientId}
              onChange={(e) => setUClientId(e.target.value)}
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
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <button type="button" onClick={createClientUser}>
              Crear
            </button>
          </div>

          {uErr && <small style={{ color: "#ff5555" }}>{uErr}</small>}

          <small className="muted" style={{ marginTop: 10 }}>
            Tip: primero crea el <strong>cliente</strong> abajo, luego aquí creas su usuario y lo asignas.
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
                  <strong>{u.name}</strong> — {u.email}
                  <br />
                  <small className="muted">
                    Cliente asignado: {getClientNameById(u.clientId)}
                  </small>
                  <div style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => deleteUser(u.id)}>
                      🗑️ Borrar usuario
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="client-section">
          <h3>Admins ({adminUsers.length})</h3>
          <small className="muted">
            Por ahora dejamos solo el admin demo. Luego hacemos alta de admins si quieres.
          </small>
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
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
          >
            Limpiar
          </button>
        </div>

        <small className="muted">
          Mostrando {visibleClients.length} de {clients.length} clientes
        </small>
      </div>

      <ClientForm name={name} setName={setName} addClient={addClient} />

      <ul style={{ padding: 0 }}>
        {visibleClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            toggleStatus={toggleStatus}
            deleteClient={deleteClient}
            saveRoutine={saveRoutine}
            addProgress={addProgress}
            saveNutrition={saveNutrition}
            addNutritionLog={addNutritionLog}
            saveGoalWeight={saveGoalWeight}
            exportClientCSV={exportClientCSV}
          />
        ))}
      </ul>
    </div>
  );
}