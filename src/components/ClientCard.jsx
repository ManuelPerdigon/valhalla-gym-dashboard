import { useEffect, useMemo, useState } from "react";
import WeightChart from "./WeightChart";
import NutritionChart from "./NutritionChart";

function ClientCard({
  client,
  toggleStatus,
  deleteClient,
  saveRoutine,
  addProgress,
  saveNutrition,
  addNutritionLog,
  saveGoalWeight,
  exportClientCSV,
  isClientView = false,

  // ✅ asignación (solo admin)
  clientUsers = [],
  assignClientToUser = () => {},
  assignedMap = {}, // { userId: clientName }
}) {
  const [openSection, setOpenSection] = useState(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // anti-trampa / calidad
  const MIN_WEIGHT = 30;
  const MAX_WEIGHT = 250;

  const ALLOWED_START_HOUR = 6;
  const ALLOWED_END_HOUR = 23;

  const [routine, setRoutine] = useState("");
  const [goal, setGoal] = useState(client.goalWeight || "");

  useEffect(() => {
    setGoal(client.goalWeight || "");
  }, [client.goalWeight]);

  // progreso
  const [progressForm, setProgressForm] = useState({ date: "", weight: "", reps: "" });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingProgress, setEditingProgress] = useState({ date: "", weight: "", reps: "" });
  const [progressError, setProgressError] = useState("");

  // nutrición
  const [nutritionDate, setNutritionDate] = useState("");
  const [nutritionCompleted, setNutritionCompleted] = useState(false);
  const [nutritionError, setNutritionError] = useState("");

  const adherence = client.nutrition?.adherence || [];
  const adherencePercent = adherence.length
    ? Math.round((adherence.filter((d) => d.completed).length / adherence.length) * 100)
    : 0;

  const adherenceColor =
    adherencePercent >= 70 ? "#00ff99" : adherencePercent >= 40 ? "#ffcc00" : "#ff5555";

  const toggleSection = (section) => setOpenSection(openSection === section ? null : section);

  // modo cliente: precarga HOY
  useEffect(() => {
    if (!isClientView) return;

    if (openSection === "progreso") {
      setProgressForm((prev) => ({ ...prev, date: today }));
      setProgressError("");
    }
    if (openSection === "nutricion") {
      setNutritionDate(today);
      setNutritionError("");
    }
  }, [openSection, isClientView, today]);

  const progressDates = useMemo(() => new Set((client.progress || []).map((p) => p.date)), [client.progress]);
  const nutritionDates = useMemo(() => new Set((adherence || []).map((d) => d.date)), [adherence]);

  const toOneDecimal = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    return Math.round(n * 10) / 10;
  };

  const validateWeight = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return "Peso inválido.";
    if (n < MIN_WEIGHT || n > MAX_WEIGHT) return `Peso fuera de rango (${MIN_WEIGHT}–${MAX_WEIGHT} kg).`;
    return null;
  };

  const isWithinAllowedTime = () => {
    const hour = new Date().getHours();
    return hour >= ALLOWED_START_HOUR && hour <= ALLOWED_END_HOUR;
  };

  const timeWindowMessage = `Solo puedes registrar entre ${String(ALLOWED_START_HOUR).padStart(
    2,
    "0"
  )}:00 y ${String(ALLOWED_END_HOUR).padStart(2, "0")}:59.`;

  // edit/delete progreso (solo admin)
  const startEdit = (index, e) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditingProgress({ ...client.progress[index] });
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    if (!editingProgress.date || editingProgress.weight === "") return;

    const rounded = toOneDecimal(editingProgress.weight);
    if (rounded === null) return;

    const weightErr = validateWeight(rounded);
    if (weightErr) return;

    const updated = (client.progress || []).map((p, i) => (i === editingIndex ? { ...editingProgress, weight: rounded } : p));
    addProgress(client.id, updated);
    setEditingIndex(null);
  };

  const deleteProgress = (index, e) => {
    e.stopPropagation();
    const updated = (client.progress || []).filter((_, i) => i !== index);
    addProgress(client.id, updated);
  };

  // borrar nutrición (solo admin)
  const removeNutritionDay = (date, e) => {
    e.stopPropagation();
    const filtered = adherence.filter((d) => d.date !== date);
    saveNutrition(client.id, { ...client.nutrition, adherence: filtered });
  };

  const handleAddProgress = () => {
    setProgressError("");

    if (isClientView && !isWithinAllowedTime()) {
      setProgressError(timeWindowMessage);
      return;
    }

    const dateToUse = isClientView ? today : progressForm.date;
    if (!dateToUse || progressForm.weight === "") return;

    if (isClientView && dateToUse !== today) {
      setProgressError("Solo puedes registrar el progreso de HOY.");
      return;
    }

    const rounded = toOneDecimal(progressForm.weight);
    if (rounded === null) {
      setProgressError("Peso inválido.");
      return;
    }

    const weightErr = validateWeight(rounded);
    if (weightErr) {
      setProgressError(weightErr);
      return;
    }

    if (progressDates.has(dateToUse)) {
      setProgressError("Ya existe un registro de progreso para HOY.");
      return;
    }

    addProgress(client.id, [
      ...(client.progress || []),
      { date: dateToUse, weight: rounded, reps: progressForm.reps },
    ]);

    setProgressForm({ date: isClientView ? today : "", weight: "", reps: "" });
  };

  const handleAddNutrition = () => {
    setNutritionError("");

    if (isClientView && !isWithinAllowedTime()) {
      setNutritionError(timeWindowMessage);
      return;
    }

    const dateToUse = isClientView ? today : nutritionDate;
    if (!dateToUse) return;

    if (isClientView && dateToUse !== today) {
      setNutritionError("Solo puedes registrar la nutrición de HOY.");
      return;
    }

    if (nutritionDates.has(dateToUse)) {
      setNutritionError("Ya existe un registro de nutrición para HOY.");
      return;
    }

    addNutritionLog(client.id, { date: dateToUse, completed: nutritionCompleted });

    setNutritionDate(isClientView ? today : "");
    setNutritionCompleted(false);
  };

  // UI asignación (solo admin)
  const assignedToOtherName =
    client.assignedUserId && assignedMap[client.assignedUserId] && assignedMap[client.assignedUserId] !== client.name
      ? assignedMap[client.assignedUserId]
      : null;

  return (
    <li className="client-card">
      {/* HEADER */}
      <div className="client-header">
        <div>
          <strong>{client.name}</strong>
          <small style={{ color: adherenceColor }}>{adherencePercent}% adherencia</small>
        </div>

        {!isClientView && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className={client.active ? "status-active" : "status-inactive"}>
              {client.active ? "Activo" : "Inactivo"}
            </span>
            <button type="button" onClick={() => toggleStatus?.(client.id)}>Estado</button>
            <button type="button" onClick={() => exportClientCSV?.(client.id)}>CSV</button>
            <button type="button" onClick={() => deleteClient?.(client.id)}>🗑️</button>
          </div>
        )}
      </div>

      {/* BARRA */}
      <div className="progress-container" style={{ marginTop: 8 }}>
        <div className="progress-bar" style={{ width: `${adherencePercent}%`, backgroundColor: adherenceColor }} />
      </div>

      {/* ASIGNACIÓN (SOLO ADMIN) */}
      {!isClientView && (
        <div className="client-section">
          <p style={{ margin: "0 0 6px" }}>👤 Usuario asignado: <strong>{client.assignedUserId || "—"}</strong></p>

          <div className="row">
            <select
              value={client.assignedUserId || ""}
              onChange={(e) => assignClientToUser(client.id, e.target.value)}
              style={{
                background: "#0f0f0f",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px",
                borderRadius: "10px",
                minWidth: 240,
              }}
            >
              <option value="">— Sin asignar —</option>

              {clientUsers.map((u) => {
                const takenBy = assignedMap[u.id];
                const disabled = !!takenBy && takenBy !== client.name;
                const label = disabled ? `${u.username} (ocupado por ${takenBy})` : u.username;

                return (
                  <option key={u.id} value={u.id} disabled={disabled}>
                    {label}
                  </option>
                );
              })}
            </select>

            <button type="button" onClick={() => assignClientToUser(client.id, "")}>
              Quitar
            </button>
          </div>

          {assignedToOtherName && (
            <small style={{ color: "#ff5555" }}>
              Ese usuario ya está asignado a: {assignedToOtherName}
            </small>
          )}
        </div>
      )}

      {/* OBJETIVO */}
      <div className="client-section">
        <p>🎯 Objetivo actual: {client.goalWeight || "No definido"} kg</p>

        {isClientView ? (
          <small className="muted">El objetivo lo asigna tu coach.</small>
        ) : (
          <div className="row">
            <input
              type="number"
              placeholder="Nuevo objetivo (kg)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <button type="button" onClick={() => saveGoalWeight?.(client.id, goal)}>
              Guardar objetivo
            </button>
          </div>
        )}

        {(client.progress || []).length >= 2 && (
          <WeightChart progress={client.progress} goalWeight={client.goalWeight} />
        )}
      </div>

      {/* RUTINA */}
      <button type="button" className="accordion" onClick={() => toggleSection("rutina")}>
        🏋️ Rutina
      </button>

      {openSection === "rutina" && (
        <div className="client-section accordion-content">
          {isClientView ? (
            <>
              <p className="muted" style={{ margin: "6px 0 0" }}>{client.routine || "—"}</p>
              <small className="muted">La rutina la asigna tu coach.</small>
            </>
          ) : (
            <>
              <input placeholder="Rutina" value={routine} onChange={(e) => setRoutine(e.target.value)} />
              <button
                type="button"
                onClick={() => {
                  if (!routine.trim()) return;
                  saveRoutine?.(client.id, routine);
                  setRoutine("");
                }}
              >
                Guardar rutina
              </button>
              <small>Actual: {client.routine || "—"}</small>
            </>
          )}
        </div>
      )}

      {/* PROGRESO */}
      <button type="button" className="accordion" onClick={() => toggleSection("progreso")}>
        📈 Progreso
      </button>

      {openSection === "progreso" && (
        <div className="client-section accordion-content">
          <input
            type="date"
            value={isClientView ? today : progressForm.date}
            disabled={isClientView}
            max={isClientView ? today : undefined}
            onChange={(e) => setProgressForm({ ...progressForm, date: e.target.value })}
          />

          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder={`Peso (kg) ${MIN_WEIGHT}-${MAX_WEIGHT} (1 decimal)`}
            value={progressForm.weight}
            onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })}
          />

          <input
            placeholder="Reps"
            value={progressForm.reps}
            onChange={(e) => setProgressForm({ ...progressForm, reps: e.target.value })}
          />

          <button type="button" onClick={handleAddProgress}>Agregar</button>

          {progressError && <small style={{ color: "#ff5555" }}>{progressError}</small>}

          <ul className="progress-list">
            {(client.progress || []).map((p, i) => (
              <li key={`${p.date}-${i}`}>
                {editingIndex === i ? (
                  <>
                    <input
                      type="date"
                      value={editingProgress.date}
                      onChange={(e) => setEditingProgress({ ...editingProgress, date: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={editingProgress.weight}
                      onChange={(e) => setEditingProgress({ ...editingProgress, weight: e.target.value })}
                    />
                    <input
                      value={editingProgress.reps}
                      onChange={(e) => setEditingProgress({ ...editingProgress, reps: e.target.value })}
                    />
                    <button type="button" onClick={saveEdit}>💾</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setEditingIndex(null); }}>✖</button>
                  </>
                ) : (
                  <>
                    {p.date} — {p.weight} kg — {p.reps || "—"}
                    {!isClientView && (
                      <>
                        <button type="button" onClick={(e) => startEdit(i, e)}>✏️</button>
                        <button type="button" onClick={(e) => deleteProgress(i, e)}>🗑️</button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>

          {isClientView && (
            <small className="muted">
              Nota: solo puedes registrar HOY, sin editar/borrar, y en horario permitido.
            </small>
          )}
        </div>
      )}

      {/* NUTRICIÓN */}
      <button type="button" className="accordion" onClick={() => toggleSection("nutricion")}>
        🥗 Nutrición
      </button>

      {openSection === "nutricion" && (
        <div className="client-section accordion-content">
          <input
            type="date"
            value={isClientView ? today : nutritionDate}
            disabled={isClientView}
            max={isClientView ? today : undefined}
            onChange={(e) => setNutritionDate(e.target.value)}
          />

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={nutritionCompleted}
              onChange={(e) => setNutritionCompleted(e.target.checked)}
            />
            Cumplió dieta
          </label>

          <button type="button" onClick={handleAddNutrition}>Registrar día</button>

          {nutritionError && <small style={{ color: "#ff5555" }}>{nutritionError}</small>}

          <NutritionChart adherence={adherence} />

          <ul className="progress-list">
            {adherence.map((d) => (
              <li key={d.date}>
                {d.date} — {d.completed ? "✔ Cumplió" : "✘ No cumplió"}
                {!isClientView && (
                  <button type="button" onClick={(e) => removeNutritionDay(d.date, e)}>
                    🗑️
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isClientView && (
            <small className="muted">
              Nota: solo puedes registrar HOY, sin borrar, y en horario permitido.
            </small>
          )}
        </div>
      )}
    </li>
  );
}

export default ClientCard;