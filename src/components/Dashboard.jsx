// src/components/Dashboard.jsx
import MiniClientWeight from "./MiniClientWeight";

function Dashboard({ clients }) {
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.active).length;
  const inactiveClients = totalClients - activeClients;

  const activePercent = totalClients
    ? Math.round((activeClients / totalClients) * 100)
    : 0;

  /* ===== PESO GLOBAL ===== */
  const allWeights = clients
    .flatMap((c) => c.progress || [])
    .map((p) => Number(p.weight))
    .filter(Boolean);

  const avgWeight = allWeights.length
    ? Math.round(allWeights.reduce((a, b) => a + b, 0) / allWeights.length)
    : null;

  /* ===== NUTRICIÓN GLOBAL ===== */
  const nutritionLogs = clients.flatMap((c) => c.nutrition?.adherence || []);

  // ✅ FIX:
  // - Si completed === false -> NO cuenta
  // - Si completed es undefined / true -> SÍ cuenta
  const completedCount = nutritionLogs.filter((d) => d?.completed !== false).length;

  const nutritionGlobalPercent = nutritionLogs.length
    ? Math.round((completedCount / nutritionLogs.length) * 100)
    : 0;

  const nutritionColor =
    nutritionGlobalPercent >= 70
      ? "#00ff99"
      : nutritionGlobalPercent >= 40
      ? "#ffcc00"
      : "#ff5555";

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      {/* ===== CLIENTES ===== */}
      <p>Total clientes: {totalClients}</p>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{
            width: `${activePercent}%`,
            backgroundColor:
              activePercent >= 70
                ? "#00ff99"
                : activePercent >= 40
                ? "#ffcc00"
                : "#ff5555",
          }}
        />
      </div>

      <small>
        🟢 Activos: {activeClients} | 🔴 Inactivos: {inactiveClients}
      </small>

      {/* ===== PESO ===== */}
      <h3 style={{ marginTop: 20 }}>⚖️ Peso</h3>

      {avgWeight ? (
        <>
          <p>Peso promedio actual: {avgWeight} kg</p>
          <MiniClientWeight progress={allWeights.map((w) => ({ weight: w }))} />
        </>
      ) : (
        <small className="muted">Sin datos de peso</small>
      )}

      {/* ===== NUTRICIÓN ===== */}
      <h3 style={{ marginTop: 20 }}>🥗 Nutrición</h3>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{
            width: `${nutritionGlobalPercent}%`,
            backgroundColor: nutritionColor,
          }}
        />
      </div>

      <small>
        Adherencia global: {nutritionGlobalPercent}%{" "}
        <span style={{ opacity: 0.7 }}>
          ({completedCount}/{nutritionLogs.length})
        </span>
      </small>
    </div>
  );
}

export default Dashboard;