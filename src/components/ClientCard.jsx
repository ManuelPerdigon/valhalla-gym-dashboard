import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { useToast } from "./ToastProvider";

export default function ClientCard({
  client,
  toggleStatus,
  deleteClient,
  saveRoutine,
  addProgress,
  saveNutrition,
  addNutritionLog,
  saveGoalWeight,
  exportClientCSV,
  users = [],
  onAssignUser,
  busy = false,
}) {
  const { showToast } = useToast();

  const [openSection, setOpenSection] = useState(null);

  const [draftRoutine, setDraftRoutine] = useState(client.routine || "");
  const [draftGoal, setDraftGoal] = useState(client.goalWeight || "");
  const [draftNutrition, setDraftNutrition] = useState(client.nutrition || {});

  const [saveState, setSaveState] = useState({
    routine: "idle",
    goal: "idle",
    nutrition: "idle",
  });

  const didMount = useRef(false);

  // 🔥 Asignación
  const [assignValue, setAssignValue] = useState("");

  // 🔁 Sync cliente
  useEffect(() => {
    setDraftRoutine(client.routine || "");
    setDraftGoal(client.goalWeight || "");
    setDraftNutrition(client.nutrition || {});
    setSaveState({ routine: "idle", goal: "idle", nutrition: "idle" });
    setOpenSection(null);
  }, [client.id]);

  // 🔥 FIX CLAVE: Sync cuando llegan users o cambia assignedUserId
  useEffect(() => {
    setAssignValue(client.assignedUserId ? String(client.assignedUserId) : "");
  }, [client.assignedUserId, users]);

  const assignedUser = useMemo(() => {
    if (!client.assignedUserId) return null;
    return users.find((u) => String(u.id) === String(client.assignedUserId)) || null;
  }, [client.assignedUserId, users]);

  const handleAssignChange = async (e) => {
    const val = e.target.value;
    setAssignValue(val);

    if (!onAssignUser) {
      showToast("Falta onAssignUser", "error");
      return;
    }

    try {
      await onAssignUser(client.id, val || null);
      showToast(val ? "Usuario asignado ✅" : "Asignación removida ✅");
    } catch {
      showToast("No se pudo asignar ❌", "error");
    }
  };

  return (
    <li style={{ listStyle: "none", marginBottom: 14, border: "1px solid #222", borderRadius: 14, padding: 14, background: "#0b0b0b" }}>
      
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{client.name}</h3>

            {/* 🔥 ASIGNACIÓN */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}>
              <small style={{ opacity: 0.75 }}>Asignado:</small>
              <strong style={{ fontSize: 12 }}>
                {assignedUser ? assignedUser.username : "— Sin asignar —"}
              </strong>

              <select
                value={assignValue}
                onChange={handleAssignChange}
                disabled={busy}
                style={{
                  background: "#0f0f0f",
                  border: "1px solid #333",
                  color: "#fff",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  minWidth: 220,
                }}
              >
                <option value="">— Sin asignar —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

    </li>
  );
}