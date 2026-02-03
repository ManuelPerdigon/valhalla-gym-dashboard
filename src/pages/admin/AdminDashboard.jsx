import { useEffect, useRef, useState } from "react";
import "../../App.css";
import ClientForm from "../../components/ClientForm";
import ClientCard from "../../components/ClientCard";
import Dashboard from "../../components/Dashboard";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { logout, users } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const isFirstLoad = useRef(true);

  // Solo usuarios tipo cliente para asignación
  const clientUsers = users.filter((u) => u.role === "client");

  /* ===== PERSISTENCIA ===== */
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

    setClients((prev) => [
      ...prev,
      {
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

        // ✅ NUEVO: asignación
        assignedUserId: "",
      },
    ]);

    setName("");
  };

  const deleteClient = (id) =>
    setClients((prev) => prev.filter((c) => c.id !== id));

  const toggleStatus = (id) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );

  const saveRoutine = (id, routine) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, routine } : c))
    );

  const addProgress = (id, newProgressArray) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, progress: newProgressArray } : c
      )
    );

  const saveGoalWeight = (id, goalWeight) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, goalWeight } : c))
    );

  const saveNutrition = (id, nutritionData) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              nutrition: { ...c.nutrition, ...nutritionData },
            }
          : c
      )
    );

  const addNutritionLog = (id, log) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              nutrition: {
                ...c.nutrition,
                adherence: [...c.nutrition.adherence, log],
              },
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

  // ✅ NUEVO: asignar cliente a usuario (sin duplicados)
  const assignClientToUser = (clientId, userId) => {
    setClients((prev) => {
      // Si selecciona "sin asignar", lo permitimos siempre
      if (!userId) {
        return prev.map((c) =>
          c.id === clientId ? { ...c, assignedUserId: "" } : c
        );
      }

      // ¿Ese userId ya está asignado a otro cliente?
      const alreadyAssigned = prev.find(
        (c) => c.assignedUserId === userId && c.id !== clientId
      );

      if (alreadyAssigned) {
        alert(
          `Ese usuario ya está asignado a: ${alreadyAssigned.name}. Primero desasígnalo allá.`
        );
        return prev; // no cambia nada
      }

      // Asignación válida
      return prev.map((c) =>
        c.id === clientId ? { ...c, assignedUserId: userId } : c
      );
    });
  };

  // ✅ Mapa: userId -> nombre del cliente asignado (para UI: deshabilitar ocupados)
  const assignedMap = clients.reduce((acc, c) => {
    if (c.assignedUserId) acc[c.assignedUserId] = c.name;
    return acc;
  }, {});

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