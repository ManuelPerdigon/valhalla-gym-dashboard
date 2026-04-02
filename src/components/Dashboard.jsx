// src/components/Dashboard.jsx
import MiniClientWeight from "./MiniClientWeight";

function Dashboard({ clients }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const nextWeekStr = sevenDaysLater.toISOString().slice(0, 10);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.active).length;
  const inactiveClients = totalClients - activeClients;

  const assignedClients = clients.filter((c) => c.assignedUserId).length;
  const unassignedClients = totalClients - assignedClients;

  const clientsWithoutRoutine = clients.filter(
    (c) => !String(c.routine || "").trim()
  );

  const clientsWithMembership = clients.filter(
    (c) => c.membership && String(c.membership.type || "").trim()
  );

  const pendingPayments = clients.filter(
    (c) => c.membership?.paymentStatus === "pending"
  );

  const overduePayments = clients.filter(
    (c) => c.membership?.paymentStatus === "overdue"
  );

  const expiringToday = clients.filter((c) => {
    const end = String(c.membership?.end || "").slice(0, 10);
    return end && end === todayStr;
  });

  const expiringThisWeek = clients.filter((c) => {
    const end = String(c.membership?.end || "").slice(0, 10);
    return end && end >= todayStr && end <= nextWeekStr;
  });

  const activePercent = totalClients
    ? Math.round((activeClients / totalClients) * 100)
    : 0;

  const assignedPercent = totalClients
    ? Math.round((assignedClients / totalClients) * 100)
    : 0;

  const membershipPercent = totalClients
    ? Math.round((clientsWithMembership.length / totalClients) * 100)
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

  const completedCount = nutritionLogs.filter((d) => d?.completed !== false).length;

  const nutritionGlobalPercent = nutritionLogs.length
    ? Math.round((completedCount / nutritionLogs.length) * 100)
    : 0;

  /* ===== RECIENTES ===== */
  const recentClients = [...clients]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5);

  const recentProgress = clients
    .flatMap((c) =>
      (c.progress || []).map((p) => ({
        clientName: c.name,
        date: p.date,
        weight: p.weight,
        reps: p.reps,
      }))
    )
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 6);

  const getColor = (val) =>
    val >= 70 ? "#00ff99" : val >= 40 ? "#ffcc00" : "#ff5555";

  const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: 10,
    fontSize: 18,
  };

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      {/* ===== KPIs RÁPIDOS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginTop: 16,
          marginBottom: 18,
        }}
      >
        <div className="dashboard-card">
          <small className="muted">Total clientes</small>
          <div className="big-number">{totalClients}</div>
        </div>

        <div className="dashboard-card">
          <small className="muted">Activos</small>
          <div className="big-number">{activeClients}</div>
        </div>

        <div className="dashboard-card">
          <small className="muted">Inactivos</small>
          <div className="big-number">{inactiveClients}</div>
        </div>

        <div className="dashboard-card">
          <small className="muted">Asignados</small>
          <div className="big-number">{assignedClients}</div>
        </div>

        <div className="dashboard-card">
          <small className="muted">Sin asignar</small>
          <div className="big-number">{unassignedClients}</div>
        </div>
      </div>

      {/* ===== GRID PRINCIPAL ===== */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>👥 Clientes</h3>
          <div className="big-number">{totalClients}</div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                width: `${activePercent}%`,
                backgroundColor: getColor(activePercent),
              }}
            />
          </div>

          <small>
            🟢 {activeClients} activos · 🔴 {inactiveClients} inactivos
          </small>
        </div>

        <div className="dashboard-card">
          <h3>🛡️ Asignación</h3>
          <div className="big-number">{assignedPercent}%</div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                width: `${assignedPercent}%`,
                backgroundColor: getColor(assignedPercent),
              }}
            />
          </div>

          <small>
            ✅ {assignedClients} asignados · ⏳ {unassignedClients} pendientes
          </small>
        </div>

        <div className="dashboard-card">
          <h3>💳 Membresías</h3>
          <div className="big-number">{membershipPercent}%</div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                width: `${membershipPercent}%`,
                backgroundColor: getColor(membershipPercent),
              }}
            />
          </div>

          <small>
            📦 {clientsWithMembership.length} con plan · {totalClients - clientsWithMembership.length} sin plan
          </small>
        </div>

        <div className="dashboard-card">
          <h3>⚖️ Peso</h3>

          {avgWeight ? (
            <>
              <div className="big-number">{avgWeight} kg</div>
              <MiniClientWeight
                progress={allWeights.map((w) => ({ weight: w }))}
              />
            </>
          ) : (
            <small className="muted">Sin datos</small>
          )}
        </div>

        <div className="dashboard-card">
          <h3>🥗 Nutrición</h3>

          <div className="big-number">{nutritionGlobalPercent}%</div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                width: `${nutritionGlobalPercent}%`,
                backgroundColor: getColor(nutritionGlobalPercent),
              }}
            />
          </div>

          <small>
            {completedCount}/{nutritionLogs.length} registros
          </small>
        </div>
      </div>

      {/* ===== ACTIVIDAD RECIENTE ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div className="dashboard-card">
          <h3 style={sectionTitleStyle}>🆕 Últimos clientes</h3>

          {recentClients.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recentClients.map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <strong>{c.name}</strong>{" "}
                  <span className="muted">· ID {c.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">Sin clientes recientes</small>
          )}
        </div>

        <div className="dashboard-card">
          <h3 style={sectionTitleStyle}>📈 Progreso reciente</h3>

          {recentProgress.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recentProgress.map((p, idx) => (
                <li key={`${p.clientName}-${p.date}-${idx}`} style={{ marginBottom: 8 }}>
                  <strong>{p.clientName}</strong>{" "}
                  <span className="muted">
                    · {p.date} · {p.weight} kg {p.reps ? `(${p.reps})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">Sin progresos recientes</small>
          )}
        </div>

        <div className="dashboard-card">
          <h3 style={sectionTitleStyle}>🚨 Alertas rápidas</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Clientes sin asignar</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {unassignedClients}
              </div>
            </div>

            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Clientes sin rutina</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {clientsWithoutRoutine.length}
              </div>
            </div>

            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Pagos pendientes</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {pendingPayments.length}
              </div>
            </div>

            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Pagos vencidos</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {overduePayments.length}
              </div>
            </div>

            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Vencen hoy</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {expiringToday.length}
              </div>
            </div>

            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <small className="muted">Vencen esta semana</small>
              <div className="big-number" style={{ fontSize: 22 }}>
                {expiringThisWeek.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;