// src/components/ClientCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { useToast } from "./ToastProvider";

export default function ClientCard({
  client,

  // acciones
  toggleStatus,
  deleteClient,
  saveRoutine,
  addProgress,
  saveNutrition,
  addNutritionLog,
  saveGoalWeight,
  exportClientCSV,

  // ✅ NUEVO: asignación
  users = [], // lista de users role=client desde AdminApp
  onAssignUser, // (clientId, userIdOrNull) => Promise
  busy = false, // para deshabilitar UI mientras guarda
}) {
  const { showToast } = useToast();

  const [openSection, setOpenSection] = useState(null);

  // ===== Drafts para autosave =====
  const [draftRoutine, setDraftRoutine] = useState(client.routine || "");
  const [draftGoal, setDraftGoal] = useState(client.goalWeight || "");
  const [draftNutrition, setDraftNutrition] = useState(client.nutrition || {});

  // ===== UI save state =====
  const [saveState, setSaveState] = useState({
    routine: "idle", // idle | dirty | saving | saved | error
    goal: "idle",
    nutrition: "idle",
  });

  // Evitar autosave en primer render
  const didMount = useRef(false);

  // ===== Asignación UI =====
  const [assignValue, setAssignValue] = useState(
    client.assignedUserId ? String(client.assignedUserId) : ""
  );

  // Sincroniza drafts cuando cambie el cliente (id)
  useEffect(() => {
    setDraftRoutine(client.routine || "");
    setDraftGoal(client.goalWeight || "");
    setDraftNutrition(client.nutrition || {});
    setSaveState({ routine: "idle", goal: "idle", nutrition: "idle" });

    setAssignValue(client.assignedUserId ? String(client.assignedUserId) : "");
    setOpenSection(null);
  }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderSaveBadge = (state) => {
    const map = {
      idle: null,
      dirty: { txt: "• Sin guardar", opacity: 0.75 },
      saving: { txt: "Guardando…", opacity: 0.9 },
      saved: { txt: "Guardado ✅", opacity: 0.9 },
      error: { txt: "Error ❌", opacity: 1 },
    };
    const s = map[state];
    if (!s) return null;
    return (
      <span style={{ fontSize: 12, opacity: s.opacity, marginLeft: 10 }}>
        {s.txt}
      </span>
    );
  };

  // ===== Autosave: Rutina =====
  useDebouncedEffect(
    async () => {
      if (!didMount.current) {
        didMount.current = true;
        return;
      }
      if (saveState.routine !== "dirty") return;

      try {
        setSaveState((p) => ({ ...p, routine: "saving" }));
        await saveRoutine(client.id, draftRoutine);
        setSaveState((p) => ({ ...p, routine: "saved" }));
        showToast("Rutina guardada ✅");
      } catch {
        setSaveState((p) => ({ ...p, routine: "error" }));
        showToast("No se pudo guardar la rutina ❌", "error");
      }
    },
    [draftRoutine, saveState.routine, client.id],
    800
  );

  // ===== Autosave: Goal Weight =====
  useDebouncedEffect(
    async () => {
      if (saveState.goal !== "dirty") return;
      try {
        setSaveState((p) => ({ ...p, goal: "saving" }));
        await saveGoalWeight(client.id, draftGoal);
        setSaveState((p) => ({ ...p, goal: "saved" }));
        showToast("Meta actualizada ✅");
      } catch {
        setSaveState((p) => ({ ...p, goal: "error" }));
        showToast("No se pudo guardar la meta ❌", "error");
      }
    },
    [draftGoal, saveState.goal, client.id],
    800
  );

  // ===== Autosave: Nutrition =====
  useDebouncedEffect(
    async () => {
      if (saveState.nutrition !== "dirty") return;
      try {
        setSaveState((p) => ({ ...p, nutrition: "saving" }));
        await saveNutrition(client.id, draftNutrition);
        setSaveState((p) => ({ ...p, nutrition: "saved" }));
        showToast("Nutrición guardada ✅");
      } catch {
        setSaveState((p) => ({ ...p, nutrition: "error" }));
        showToast("No se pudo guardar nutrición ❌", "error");
      }
    },
    [draftNutrition, saveState.nutrition, client.id],
    900
  );

  const setNutField = (key, val) => {
    setDraftNutrition((prev) => ({ ...(prev || {}), [key]: val }));
    setSaveState((p) => ({ ...p, nutrition: "dirty" }));
  };

  // ===== Progreso (agregar registro) =====
  const [progressForm, setProgressForm] = useState({ date: "", weight: "", reps: "" });

  const submitProgress = () => {
    if (!progressForm.date || !progressForm.weight) {
      showToast("Falta fecha y peso para agregar progreso", "warning");
      return;
    }

    const next = Array.isArray(client.progress) ? [...client.progress] : [];
    next.unshift({
      date: progressForm.date,
      weight: progressForm.weight,
      reps: progressForm.reps || "",
    });

    addProgress(client.id, next);
    setProgressForm({ date: "", weight: "", reps: "" });
    showToast("Progreso agregado ✅");
  };

  // ===== Adherencia nutrición (log simple) =====
  const [adhText, setAdhText] = useState("");
  const submitAdherence = () => {
    const t = adhText.trim();
    if (!t) {
      showToast("Escribe algo para la bitácora", "warning");
      return;
    }

    // ✅ completed para dashboard
    const log = { date: new Date().toISOString(), note: t, completed: true };

    addNutritionLog(client.id, log);
    setAdhText("");
    showToast("Bitácora agregada ✅");
  };

  const isOpen = (key) => openSection === key;

  const sectionBtnStyle = (active) => ({
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #333",
    background: active ? "#141414" : "#0f0f0f",
    color: "#fff",
    cursor: "pointer",
  });

  const headerPillStyle = useMemo(
    () => ({
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #333",
      background: client.active ? "rgba(0,255,153,0.08)" : "rgba(255,85,85,0.08)",
      color: client.active ? "#00ff99" : "#ff5555",
    }),
    [client.active]
  );

  // ===== Helpers asignación =====
  const assignedUser = useMemo(() => {
    if (!client.assignedUserId) return null;
    return users.find((u) => String(u.id) === String(client.assignedUserId)) || null;
  }, [client.assignedUserId, users]);

  // (Opcional) bloquear usuarios que ya están asignados a otro cliente
  // Si quieres que se puedan reasignar libremente, quita esta lógica y usa users tal cual.
  const availableUsers = useMemo(() => {
    // si no viene info suficiente, solo devuelve users
    return users;
  }, [users]);

  const handleAssignChange = async (e) => {
    const val = e.target.value; // "" | userId
    setAssignValue(val);

    if (!onAssignUser) {
      showToast("Falta onAssignUser en ClientCard (prop).", "error");
      return;
    }

    const nextUserId = val ? val : null;

    try {
      await onAssignUser(client.id, nextUserId);
      showToast(nextUserId ? "Usuario asignado ✅" : "Asignación removida ✅");
    } catch {
      showToast("No se pudo asignar usuario ❌", "error");
    }
  };

  return (
    <li
      style={{
        listStyle: "none",
        marginBottom: 14,
        border: "1px solid #222",
        borderRadius: 14,
        padding: 14,
        background: "#0b0b0b",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{client.name}</h3>
            <span style={headerPillStyle}>{client.active ? "Activo" : "Inactivo"}</span>

            {/* ✅ Asignación */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6, flexWrap: "wrap" }}>
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
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            ID: {client.id} · Progreso: {(client.progress || []).length} registros
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => exportClientCSV(client.id)} disabled={busy}>
            Exportar CSV
          </button>
          <button type="button" onClick={() => toggleStatus(client.id)} disabled={busy}>
            {client.active ? "Desactivar" : "Activar"}
          </button>
          <button
            type="button"
            onClick={() => {
              deleteClient(client.id);
              showToast("Cliente eliminado 🗑️", "warning");
            }}
            disabled={busy}
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={sectionBtnStyle(isOpen("routine"))}
          onClick={() => setOpenSection(isOpen("routine") ? null : "routine")}
          disabled={busy}
        >
          Rutina {renderSaveBadge(saveState.routine)}
        </button>

        <button
          type="button"
          style={sectionBtnStyle(isOpen("nutrition"))}
          onClick={() => setOpenSection(isOpen("nutrition") ? null : "nutrition")}
          disabled={busy}
        >
          Nutrición {renderSaveBadge(saveState.nutrition)}
        </button>

        <button
          type="button"
          style={sectionBtnStyle(isOpen("progress"))}
          onClick={() => setOpenSection(isOpen("progress") ? null : "progress")}
          disabled={busy}
        >
          Progreso
        </button>

        <button
          type="button"
          style={sectionBtnStyle(isOpen("goal"))}
          onClick={() => setOpenSection(isOpen("goal") ? null : "goal")}
          disabled={busy}
        >
          Meta {renderSaveBadge(saveState.goal)}
        </button>
      </div>

      {/* Content */}
      <div style={{ marginTop: 12 }}>
        {/* ===== Rutina ===== */}
        {isOpen("routine") && (
          <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0 }}>Rutina</h4>
              {renderSaveBadge(saveState.routine)}
            </div>

            <textarea
              value={draftRoutine}
              onChange={(e) => {
                setDraftRoutine(e.target.value);
                setSaveState((p) => ({ ...p, routine: "dirty" }));
              }}
              placeholder="Escribe la rutina aquí..."
              style={{
                width: "100%",
                minHeight: 140,
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
              }}
              disabled={busy}
            />

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Auto-guardado cada ~0.8s cuando dejas de escribir.
            </small>
          </div>
        )}

        {/* ===== Nutrición ===== */}
        {isOpen("nutrition") && (
          <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0 }}>Plan de Nutrición</h4>
              {renderSaveBadge(saveState.nutrition)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
              <input
                placeholder="Calorías"
                value={draftNutrition?.calories || ""}
                onChange={(e) => setNutField("calories", e.target.value)}
                disabled={busy}
              />
              <input
                placeholder="Proteína"
                value={draftNutrition?.protein || ""}
                onChange={(e) => setNutField("protein", e.target.value)}
                disabled={busy}
              />
              <input
                placeholder="Carbs"
                value={draftNutrition?.carbs || ""}
                onChange={(e) => setNutField("carbs", e.target.value)}
                disabled={busy}
              />
              <input
                placeholder="Grasas"
                value={draftNutrition?.fats || ""}
                onChange={(e) => setNutField("fats", e.target.value)}
                disabled={busy}
              />
            </div>

            <textarea
              placeholder="Notas"
              value={draftNutrition?.notes || ""}
              onChange={(e) => setNutField("notes", e.target.value)}
              style={{
                width: "100%",
                minHeight: 90,
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
              }}
              disabled={busy}
            />

            <div style={{ marginTop: 10 }}>
              <h5 style={{ margin: "10px 0 6px" }}>Adherencia / Bitácora</h5>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="Ej: Cumplió macros, 2L agua, etc."
                  value={adhText}
                  onChange={(e) => setAdhText(e.target.value)}
                  style={{ flex: 1 }}
                  disabled={busy}
                />
                <button type="button" onClick={submitAdherence} disabled={busy}>
                  Agregar
                </button>
              </div>

              {(client.nutrition?.adherence || []).length > 0 && (
                <ul style={{ marginTop: 10, paddingLeft: 16 }}>
                  {(client.nutrition?.adherence || []).slice(0, 6).map((a, idx) => (
                    <li key={idx} style={{ opacity: 0.85 }}>
                      {a.note || JSON.stringify(a)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Auto-guardado cada ~0.9s.
            </small>
          </div>
        )}

        {/* ===== Progreso ===== */}
        {isOpen("progress") && (
          <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
            <h4 style={{ margin: 0 }}>Progreso</h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
              <input
                type="date"
                value={progressForm.date}
                onChange={(e) => setProgressForm((p) => ({ ...p, date: e.target.value }))}
                disabled={busy}
              />
              <input
                placeholder="Peso"
                value={progressForm.weight}
                onChange={(e) => setProgressForm((p) => ({ ...p, weight: e.target.value }))}
                disabled={busy}
              />
              <input
                placeholder="Reps (opcional)"
                value={progressForm.reps}
                onChange={(e) => setProgressForm((p) => ({ ...p, reps: e.target.value }))}
                disabled={busy}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={submitProgress} disabled={busy}>
                Agregar progreso
              </button>
            </div>

            {(client.progress || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <small style={{ opacity: 0.7 }}>Últimos registros:</small>
                <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                  {(client.progress || []).slice(0, 8).map((p, idx) => (
                    <li key={idx}>
                      {p.date} — {p.weight} {p.reps ? `(${p.reps})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ===== Meta ===== */}
        {isOpen("goal") && (
          <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0 }}>Meta de peso</h4>
              {renderSaveBadge(saveState.goal)}
            </div>

            <input
              placeholder="Ej: 78 kg"
              value={draftGoal}
              onChange={(e) => {
                setDraftGoal(e.target.value);
                setSaveState((p) => ({ ...p, goal: "dirty" }));
              }}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
              }}
              disabled={busy}
            />

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Auto-guardado.
            </small>
          </div>
        )}
      </div>
    </li>
  );
}