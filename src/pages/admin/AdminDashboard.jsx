import { useEffect, useMemo, useState } from "react";
import ClientForm from "../../components/ClientForm";
import ClientCard from "../../components/ClientCard";
import Dashboard from "../../components/Dashboard";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { API_URL, authHeaders, logout } = useAuth();

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");

  const clientUsers = useMemo(
    () => (users || []).filter((u) => u.role === "client"),
    [users]
  );

  const assignedMap = useMemo(() => {
    return clients.reduce((acc, c) => {
      if (c.assignedUserId) acc[c.assignedUserId] = c.name;
      return acc;
    }, {});
  }, [clients]);

  const fetchAll = async () => {
    const [clientsRes, usersRes] = await Promise.all([
      fetch(`${API_URL}/clients`, { headers: { ...authHeaders } }),
      fetch(`${API_URL}/users`, { headers: { ...authHeaders } }),
    ]);

    const cData = await clientsRes.json();
    const uData = await usersRes.json();

    if (!clientsRes.ok) throw new Error(cData?.error || "Error clients");
    if (!usersRes.ok) throw new Error(uData?.error || "Error users");

    setClients(cData);
    setUsers(uData);
  };

  useEffect(() => {
    fetchAll().catch((e) => {
      console.error(e);
      alert("Error cargando datos. Revisa que el backend esté corriendo.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Helpers API ===== */

  const patchClient = async (id, patch) => {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(patch),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Error al actualizar");
    }

    setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
  };

  const addClient = async () => {
    try {
      if (!name.trim()) return;

      const res = await fetch(`${API_URL}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("POST /clients error:", data);
        alert(data?.error || `Error al crear (status ${res.status})`);
        return;
      }

      setClients((prev) => [data, ...prev]);
      setName("");
    } catch (e) {
      console.error(e);
      alert("Error de red (backend apagado o API_URL incorrecto).");
    }
  };

  // ✅ BORRADO REAL en backend
  const deleteClient = async (id) => {
    const ok = confirm("¿Eliminar cliente PERMANENTEMENTE? (No se puede deshacer)");
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || `Error eliminando (status ${res.status})`);
        return;
      }

      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      alert("Error de red (backend apagado o API_URL incorrecto).");
    }
  };

  const toggleStatus = async (id) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    await patchClient(id, { active: current.active ? 0 : 1 });
  };

  const saveRoutine = async (id, routine) => patchClient(id, { routine });

  const addProgress = async (id, newProgressArray) =>
    patchClient(id, { progress: newProgressArray });

  const saveGoalWeight = async (id, goalWeight) =>
    patchClient(id, { goalWeight });

  const saveNutrition = async (id, nutritionData) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    await patchClient(id, {
      nutrition: { ...current.nutrition, ...nutritionData },
    });
  };

  const addNutritionLog = async (id, log) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    const adherence = current.nutrition?.adherence || [];
    await patchClient(id, {
      nutrition: { ...current.nutrition, adherence: [...adherence, log] },
    });
  };

  const assignClientToUser = async (clientId, userId) => {
    try {
      await patchClient(clientId, { assignedUserId: userId || "" });
    } catch (e) {
      alert(e.message);
    }
  };

  const exportClientCSV = (id) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const rows = [
      ["Nombre", client.name],
      ["Activo", client.active ? "Sí" : "No"],
      ["Objetivo peso", client.goalWeight || ""],
      ["Rutina", client.routine || ""],
      ["Usuario asignado", client.assignedUserId || ""],
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

  return (
    <div className="app">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <h1>Valhalla Gym</h1>
        <button type="button" onClick={logout}>
          Salir
        </button>
      </div>

      <Dashboard clients={clients} />

      <ClientForm name={name} setName={setName} addClient={addClient} />

      <ul style={{ padding: 0 }}>
        {clients.map((client) => (
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
            isClientView={false}
            clientUsers={clientUsers}
            assignClientToUser={assignClientToUser}
            assignedMap={assignedMap}
          />
        ))}
      </ul>
    </div>
  );
}