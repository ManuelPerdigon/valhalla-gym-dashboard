import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ClientCard from "../components/ClientCard";
import MiniClientWeight from "../components/MiniClientWeight";
import NutritionChart from "../components/NutritionChart";

export default function ClientApp() {
  const { user, logout } = useAuth();

  const [clients, setClients] = useState([]);
  const isFirstLoad = useRef(true);

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

  const client = useMemo(() => {
    if (!user?.clientId) return null;
    return clients.find((c) => c.id === user.clientId) || null;
  }, [clients, user?.clientId]);

  /* ===== FUNCIONES (SOLO PARA SU PROPIO CLIENTE) ===== */
  const addProgress = (id, newProgressArray) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, progress: newProgressArray } : c))
    );

  const saveGoalWeight = (id, goalWeight) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, goalWeight } : c))
    );

  const saveRoutine = (id, routine) =>
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, routine } : c))
    );

  const saveNutrition = (id, nutritionData) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, nutrition: { ...c.nutrition, ...nutritionData } }
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

  /* ===== MÉTRICAS CLIENTE ===== */
  const progressSorted = useMemo(() => {
    if (!client?.progress) return [];
    return [...client.progress].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [client?.progress]);

  const weightNow = progressSorted.length
    ? Number(progressSorted[progressSorted.length - 1].weight)
    : null;

  const weightStart = progressSorted.length ? Number(progressSorted[0].weight) : null;

  const weightDiff =
    weightNow !== null && weightStart !== null ? weightNow - weightStart : null;

  const goalWeightNum =
    client?.goalWeight !== "" && client?.goalWeight != null
      ? Number(client.goalWeight)
      : null;

  const progressToGoalPercent = useMemo(() => {
    // Si no hay goal o no hay pesos, no mostramos barra
    if (goalWeightNum === null || weightNow === null || weightStart === null)
      return null;

    // Si ya está en objetivo
    if (weightNow === goalWeightNum) return 100;

    // Calculamos avance desde inicio hacia el objetivo
    const totalNeeded = Math.abs(weightStart - goalWeightNum);
    const done = Math.abs(weightStart - weightNow);

    if (totalNeeded === 0) return 100;

    const pct = Math.round((done / totalNeeded) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [goalWeightNum, weightNow, weightStart]);

  const adherence = client?.nutrition?.adherence || [];
  const last14 = adherence.slice(-14);
  const adherencePercent = last14.length
    ? Math.round((last14.filter((d) => d.completed).length / last14.length) * 100)
    : 0;

  const adherenceColor =
    adherencePercent >= 70 ? "#00ff99" : adherencePercent >= 40 ? "#ffcc00" : "#ff5555";

  if (!user) return null;

  return (
    <div className="app">
      <h1>Valhalla Gym</h1>

      <div className="dashboard">
        <h2>🧑‍💪 Panel Cliente</h2>
        <small className="muted">
          Sesión: {user.name} ({user.email})
        </small>

        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {!user.clientId ? (
        <div className="dashboard">
          <h3>⚠️ No tienes cliente asignado</h3>
          <small className="muted">Pídele al admin que te asigne a un cliente.</small>
        </div>
      ) : !client ? (
        <div className="dashboard">
          <h3>⚠️ Cliente no encontrado</h3>
          <small className="muted">
            Tu cuenta apunta a un clientId que no existe en localStorage.
            <br />
            Solución: el admin debe reasignarte o recrear el cliente.
          </small>
        </div>
      ) : (
        <>
          {/* ===== DASHBOARD PERSONAL ===== */}
          <div className="dashboard">
            <h2>📊 Tu Dashboard</h2>

            {/* Peso actual */}
            <div className="client-section">
              <h3 style={{ marginTop: 0 }}>⚖️ Peso</h3>

              {weightNow !== null ? (
                <>
                  <p>
                    Peso actual: <strong>{weightNow} kg</strong>{" "}
                    {weightDiff !== null && (
                      <span
                        style={{
                          color: weightDiff <= 0 ? "#00ff99" : "#ff5555",
                          marginLeft: 8,
                          fontWeight: "bold",
                        }}
                      >
                        ({weightDiff > 0 ? "+" : ""}
                        {weightDiff} kg)
                      </span>
                    )}
                  </p>

                  {/* Mini gráfica */}
                  <MiniClientWeight progress={progressSorted} />

                  {/* Progreso a objetivo */}
                  {progressToGoalPercent !== null && (
                    <>
                      <p style={{ marginTop: 12 }}>
                        Progreso hacia objetivo ({goalWeightNum} kg):{" "}
                        <strong>{progressToGoalPercent}%</strong>
                      </p>

                      <div className="progress-container">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${progressToGoalPercent}%`,
                            backgroundColor:
                              progressToGoalPercent >= 70
                                ? "#00ff99"
                                : progressToGoalPercent >= 40
                                ? "#ffcc00"
                                : "#ff5555",
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <small className="muted">Aún no hay registros de peso.</small>
              )}
            </div>

            {/* Nutrición */}
            <div className="client-section">
              <h3>🥗 Nutrición (últimos 14 días)</h3>

              {last14.length ? (
                <>
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${adherencePercent}%`,
                        backgroundColor: adherenceColor,
                      }}
                    />
                  </div>

                  <small style={{ color: adherenceColor }}>
                    Adherencia: {adherencePercent}%
                  </small>

                  <NutritionChart adherence={adherence} />
                </>
              ) : (
                <small className="muted">Aún no hay registros de nutrición.</small>
              )}
            </div>

            {/* Rutina */}
            <div className="client-section">
              <h3>🏋️ Rutina actual</h3>
              <p className="muted">{client.routine || "—"}</p>
            </div>
          </div>

          {/* ===== TARJETA COMPLETA (EDITABLE PARA CLIENTE) ===== */}
          <ul style={{ padding: 0 }}>
            <ClientCard
              key={client.id}
              client={client}
              isClientView={true}
              toggleStatus={() => {}}
              deleteClient={() => {}}
              exportClientCSV={() => {}}
              saveRoutine={saveRoutine}
              addProgress={addProgress}
              saveNutrition={saveNutrition}
              addNutritionLog={addNutritionLog}
              saveGoalWeight={saveGoalWeight}
            />
          </ul>
        </>
      )}
    </div>
  );
}