import { useEffect, useRef, useState } from "react";
import "./App.css";
import ClientForm from "./components/ClientForm";
import ClientCard from "./components/ClientCard";
import Dashboard from "./components/Dashboard";

function App() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const isFirstLoad = useRef(true);

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
      },
    ]);
    setName("");
  };

  const deleteClient = (id) =>
    setClients((prev) => prev.filter((c) => c.id !== id));

  const toggleStatus = (id) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c
      )
    );

  const saveRoutine = (id, routine) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, routine } : c
      )
    );

  const addProgress = (id, newProgressArray) =>
  setClients((prev) =>
    prev.map((c) =>
      c.id === id ? { ...c, progress: newProgressArray } : c
    )
  );

  const saveGoalWeight = (id, goalWeight) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, goalWeight } : c
      )
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
    [],
    ["Fecha", "Peso", "Reps"],
    ...(client.progress || []).map((p) => [
      p.date,
      p.weight,
      p.reps,
    ]),
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
      <h1>Valhalla Gym</h1>

      {/* 🔥 AQUÍ PASAMOS LOS CLIENTES COMPLETOS */}
      <Dashboard clients={clients} />

      <ClientForm
        name={name}
        setName={setName}
        addClient={addClient}
      />

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
/>

        ))}
      </ul>
    </div>
  );
}

export default App;
