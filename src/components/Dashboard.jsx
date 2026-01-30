function Dashboard({
  totalClients,
  activeClients,
  inactiveClients,
  activePercent,
  nutritionGlobalPercent,
  nutritionGreen,
  nutritionYellow,
  nutritionRed,
}) {
  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      <p>
        👥 Total clientes: <strong>{totalClients}</strong>
      </p>

      <p className="status-active">
        ✅ Activos: <strong>{activeClients}</strong>
      </p>

      <p className="status-inactive">
        ❌ Inactivos: <strong>{inactiveClients}</strong>
      </p>

      {/* ===== CLIENTES ACTIVOS ===== */}
      <div className="progress-wrapper">
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{ width: `${activePercent}%` }}
          />
        </div>
        <small>{activePercent}% clientes activos</small>
      </div>

      <hr />

      {/* ===== NUTRICIÓN ===== */}
      <h3>🥗 Nutrición</h3>

      <p>
        Adherencia global: <strong>{nutritionGlobalPercent}%</strong>
      </p>

      <div className="progress-wrapper">
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{ width: `${nutritionGlobalPercent}%` }}
          />
        </div>
        <small>Adherencia nutricional global</small>
      </div>

      <p className="status-active">
        🟢 Bien: <strong>{nutritionGreen}</strong>
      </p>
      <p className="muted">
        🟡 En riesgo: <strong>{nutritionYellow}</strong>
      </p>
      <p className="status-inactive">
        🔴 Críticos: <strong>{nutritionRed}</strong>
      </p>
    </div>
  );
}

export default Dashboard;
