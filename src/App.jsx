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
    if (stored) {
      setClients(JSON.parse(stored));
    }
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

  const deleteClient = (id) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleStatus = (id) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c
      )
    );
  };

  /* ===== RUTINA ===== */
  const saveRoutine = (id, routine) => {
    if (!routine.trim()) return;
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, routine } : c
      )
    );
  };

  /* ===== PROGRESO ===== */
  const addProgress = (id, progress) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, progress: [...c.progress, progress] }
          : c
      )
    );
  };

  /* ===== OBJETIVO ===== */
  const saveGoalWeight = (id, goalWeight) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, goalWeight } : c
      )
    );
  };

  /* ===== NUTRICIÓN ===== */
  const saveNutrition = (id, nutritionData) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              nutrition: {
                ...c.nutrition,
                ...nutritionData,
              },
            }
          : c
      )
    );
  };

  const addNutritionLog = (id, log) => {
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
  };

  /* ===== EXPORTAR CSV POR CLIENTE ===== */
  const exportClientCSV = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const headers = [
      "Cliente",
      "Estado",
      "ObjetivoPeso",
      "Rutina",
      "Fecha",
      "Peso",
      "Reps",
      "Calorias",
      "Proteina",
      "Carbs",
      "Grasas",
      "AdherenciaPercent",
    ];

    const adherence = client.nutrition.adherence || [];
    const adherencePercent = adherence.length
      ? Math.round(
          (adherence.filter((d) => d.completed).length /
            adherence.length) *
            100
        )
      : "";

    const rows = [];

    if (client.progress.length === 0) {
      rows.push([
        client.name,
        client.active ? "Activo" : "Inactivo",
        client.goalWeight,
        client.routine,
        "",
        "",
        "",
        client.nutrition.calories,
        client.nutrition.protein,
        client.nutrition.carbs,
        client.nutrition.fats,
        adherencePercent,
      ]);
    } else {
      client.progress.forEach((p) => {
        rows.push([
          client.name,
          client.active ? "Activo" : "Inactivo",
          client.goalWeight,
          client.routine,
          p.date,
          p.weight,
          p.reps,
          client.nutrition.calories,
          client.nutrition.protein,
          client.nutrition.carbs,
          client.nutrition.fats,
          adherencePercent,
        ]);
      });
    }

    const csv =
      [headers, ...rows]
        .map((r) => r.map((v) => `"${v ?? ""}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `valhalla_${client.name.replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  /* ===== DASHBOARD (REAL) ===== */
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.active).length;
  const inactiveClients = totalClients - activeClients;
  const activePercent = totalClients
    ? Math.round((activeClients / totalClients) * 100)
    : 0;

  const clientsWithNutrition = clients.filter(
    (c) => c.nutrition.adherence.length > 0
  );

  let totalDays = 0;
  let completedDays = 0;
  let nutritionGreen = 0;
  let nutritionYellow = 0;
  let nutritionRed = 0;

  clientsWithNutrition.forEach((c) => {
    const total = c.nutrition.adherence.length;
    const done = c.nutrition.adherence.filter((d) => d.completed).length;

    totalDays += total;
    completedDays += done;

    const percent = total ? Math.round((done / total) * 100) : 0;
    if (percent >= 70) nutritionGreen++;
    else if (percent >= 40) nutritionYellow++;
    else nutritionRed++;
  });

  const nutritionGlobalPercent = totalDays
    ? Math.round((completedDays / totalDays) * 100)
    : 0;

  /* ===== RENDER ===== */
  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      <Dashboard
        totalClients={totalClients}
        activeClients={activeClients}
        inactiveClients={inactiveClients}
        activePercent={activePercent}
        nutritionGlobalPercent={nutritionGlobalPercent}
        nutritionGreen={nutritionGreen}
        nutritionYellow={nutritionYellow}
        nutritionRed={nutritionRed}
      />

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
