import { useEffect, useRef, useState } from "react";

function App() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [routine, setRoutine] = useState("");
  const [progress, setProgress] = useState({
    date: "",
    weight: "",
    reps: "",
  });
const exportCSV = () => {
  let csv = "Nombre,Estado,Rutina,Fecha,Peso,Reps\n";

  clients.forEach((c) => {
    c.progress.forEach((p) => {
      csv += `${c.name},${c.active ? "Activo" : "Inactivo"},${c.routine},${p.date},${p.weight},${p.reps}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "valhalla_gym_progreso.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
  const isFirstLoad = useRef(true);

  // 🔹 Cargar clientes
  useEffect(() => {
    const stored = localStorage.getItem("clients");
    if (stored) {
      setClients(JSON.parse(stored));
    }
  }, []);

  // 🔹 Guardar clientes
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    localStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  // 📊 DASHBOARD
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.active).length;
  const inactiveClients = totalClients - activeClients;
  const totalProgress = clients.reduce(
    (acc, c) => acc + c.progress.length,
    0
  );

  const activePercent = totalClients
    ? Math.round((activeClients / totalClients) * 100)
    : 0;

  const addClient = () => {
    if (!name.trim()) return;

    setClients(prev => [
      ...prev,
      {
        id: Date.now(),
        name,
        active: true,
        routine: "",
        progress: [],
      },
    ]);
    setName("");
  };

  const toggleStatus = (id) => {
    setClients(prev =>
      prev.map(c =>
        c.id === id ? { ...c, active: !c.active } : c
      )
    );
  };

  const saveRoutine = (id) => {
    if (!routine.trim()) return;

    setClients(prev =>
      prev.map(c =>
        c.id === id ? { ...c, routine } : c
      )
    );
    setRoutine("");
  };

  const addProgress = (id) => {
    if (!progress.date || !progress.weight || !progress.reps)
      return;

    setClients(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, progress: [...c.progress, progress] }
          : c
      )
    );
    const exportCSV = () => {
    let csv = "Nombre,Estado,Rutina,Fecha,Peso,Reps\n";

    clients.forEach((c) => {
      c.progress.forEach((p) => {
        csv += `${c.name},${c.active ? "Activo" : "Inactivo"},${c.routine},${p.date},${p.weight},${p.reps}\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "valhalla_gym_progreso.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    setProgress({ date: "", weight: "", reps: "" });
  };

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      {/* 📊 DASHBOARD */}
      <div className="card">
        <h2>Dashboard</h2>
        <p>👥 Total clientes: <strong>{totalClients}</strong></p>
        <p className="status-active">
          ✅ Activos: <strong>{activeClients}</strong>
        </p>
        <p className="status-inactive">
          ❌ Inactivos: <strong>{inactiveClients}</strong>
        </p>
        <p>
          📈 Registros de progreso: <strong>{totalProgress}</strong>
        </p>

        <div style={{ marginTop: 10 }}>
          <div style={{ background: "#222", height: 20, width: "100%" }}>
            <div
              style={{
                background: "#00ff99",
                height: "100%",
                width: `${activePercent}%`,
              }}
            />
          </div>
          <small>{activePercent}% clientes activos</small>
        </div>
      </div>
<button onClick={exportCSV}>
  📁 Exportar CSV
</button>
      {/* ➕ AGREGAR CLIENTE */}
      <input
        placeholder="Nombre del cliente"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={addClient}>Agregar cliente</button>

      <hr />

      {/* 👤 CLIENTES */}
      <ul>
        {clients.map((c) => (
          <li key={c.id} className="card">
            <strong>{c.name}</strong> —{" "}
            <span className={c.active ? "status-active" : "status-inactive"}>
              {c.active ? "Activo" : "Inactivo"}
            </span>
            <button onClick={() => toggleStatus(c.id)}>
              Cambiar estado
            </button>

            <div>
              <input
                placeholder="Rutina"
                onChange={(e) => setRoutine(e.target.value)}
              />
              <button onClick={() => saveRoutine(c.id)}>
                Guardar rutina
              </button>
            </div>

            {c.routine && <div>🏋️ Rutina: {c.routine}</div>}

            <div style={{ marginTop: 10 }}>
              <input
                type="date"
                value={progress.date}
                onChange={(e) =>
                  setProgress({ ...progress, date: e.target.value })
                }
              />
              <input
                placeholder="Peso"
                value={progress.weight}
                onChange={(e) =>
                  setProgress({ ...progress, weight: e.target.value })
                }
              />
              <input
                placeholder="Reps"
                value={progress.reps}
                onChange={(e) =>
                  setProgress({ ...progress, reps: e.target.value })
                }
              />
              <button onClick={() => addProgress(c.id)}>
                Agregar progreso
              </button>
            </div>

            <ul>
              {c.progress.map((p, i) => (
                <li key={i}>
                  📅 {p.date} — ⚖️ {p.weight}kg — 🔁 {p.reps} reps
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;