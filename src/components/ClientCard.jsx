import { useMemo } from "react";

export default function ClientCard({
  client,
  users = [],
  onAssignUser,
  busy,
  toggleStatus,
  deleteClient,
  saveRoutine,
  addProgress,
  saveNutrition,
  addNutritionLog,
  saveGoalWeight,
  exportClientCSV,
}) {

  // 🔥 Solo usuarios tipo CLIENT
  const clientUsers = useMemo(() => {
    return Array.isArray(users)
      ? users.filter(u => u.role === "client")
      : [];
  }, [users]);

  const assigned = clientUsers.find(u => u.id === client.assignedUserId);

  return (
    <li className="client-card">

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong>{client.name}</strong>

        <span style={{ color: client.active ? "#6cff6c" : "#ff5c5c" }}>
          {client.active ? "Activo" : "Inactivo"}
        </span>

        <span>
          Asignado:{" "}
          <strong>
            {assigned ? assigned.username : "— Sin asignar —"}
          </strong>
        </span>

        {/* 👇 ESTE ES EL SELECT QUE NO TE SALÍA */}
        <select
          value={client.assignedUserId || ""}
          onChange={(e) =>
            onAssignUser(client.id, e.target.value || null)
          }
          disabled={busy}
        >
          <option value="">— Sin asignar —</option>

          {clientUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <small>users: {clientUsers.length}</small>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => toggleStatus(client.id)} disabled={busy}>
          {client.active ? "Desactivar" : "Activar"}
        </button>

        <button onClick={deleteClient} disabled={busy}>
          🗑️ Eliminar
        </button>

        <button onClick={exportClientCSV}>
          Exportar CSV
        </button>
      </div>

    </li>
  );
}