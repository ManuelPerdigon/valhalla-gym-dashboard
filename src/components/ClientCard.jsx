import { useEffect, useState } from "react";
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
}) {
  const [openSection, setOpenSection] = useState(null);

  const [routine, setRoutine] = useState("");
  const [goal, setGoal] = useState(client.goalWeight || "");

  useEffect(() => {
    setGoal(client.goalWeight || "");
  }, [client.goalWeight]);

  /* ===== PROGRESO ===== */
  const [progressForm, setProgressForm] = useState({
    date: "",
    weight: "",
    reps: "",
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingProgress, setEditingProgress] = useState({
    date: "",
    weight: "",
    reps: "",
  });

  /* ===== NUTRICIÓN ===== */
  const [nutritionDate, setNutritionDate] = useState("");
  const [nutritionCompleted, setNutritionCompleted] = useState(false);

  const adherence = client.nutrition?.adherence || [];
  const adherencePercent = adherence.length
    ? Math.round(
        (adherence.filter((d) => d.completed).length / adherence.length) * 100
      )
    : 0;

  const adherenceColor =
    adherencePercent >= 70
      ? "#00ff99"
      : adherencePercent >= 40
      ? "#ffcc00"
      : "#ff5555";

  const toggleSection = (section) =>
    setOpenSection(openSection === section ? null : section);

  /* ===== PROGRESO HELPERS ===== */
  const startEdit = (index, e) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditingProgress({ ...client.progress[index] });
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    if (!editingProgress.date || editingProgress.weight === "") return;

    const updated = client.progress.map((p, i) =>
      i === editingIndex
        ? {
            ...editingProgress,
            weight: Number(editingProgress.weight),
          }
        : p
    );

    addProgress(client.id, updated);
    setEditingIndex(null);
  };

  const deleteProgress = (index, e) => {
    e.stopPropagation();
    const updated = client.progress.filter((_, i) => i !== index);
    addProgress(client.id, updated);
  };

  /* ===== NUTRICIÓN HELPERS ===== */
  const removeNutritionDay = (date, e) => {
    e.stopPropagation();
    const filtered = adherence.filter((d) => d.date !== date);
    saveNutrition(client.id, {
      ...client.nutrition,
      adherence: filtered,
    });
  };

  return (
    <li className="client-card">
      {/* ===== HEADER ===== */}
      <div className="client-header">
        <div>
          <strong>{client.name}</strong>
          <small style={{ color: adherenceColor }}>
            {adherencePercent}% adherencia
          </small>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <span
            className={client.active ? "status-active" : "status-inactive"}
          >
            {client.active ? "Activo" : "Inactivo"}
          </span>
          <button type="button" onClick={() => toggleStatus(client.id)}>
            Estado
          </button>
          <button type="button" onClick={() => exportClientCSV(client.id)}>
            CSV
          </button>
          <button type="button" onClick={() => deleteClient(client.id)}>
            🗑️
          </button>
        </div>
      </div>

      {/* ===== BARRA ===== */}
      <div className="progress-container">
        <div
          className="progress-bar"
          style={{
            width: `${adherencePercent}%`,
            backgroundColor: adherenceColor,
          }}
        />
      </div>

      {/* ===== OBJETIVO ===== */}
      <div className="client-section">
        <p>🎯 Objetivo actual: {client.goalWeight || "No definido"} kg</p>

        <div className="row">
          <input
            type="number"
            placeholder="Nuevo objetivo (kg)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <button
            type="button"
            onClick={() => saveGoalWeight(client.id, goal)}
          >
            Guardar objetivo
          </button>
        </div>

        {client.progress.length >= 2 && (
          <WeightChart
            progress={client.progress}
            goalWeight={client.goalWeight}
          />
        )}
      </div>

      {/* ===== RUTINA ===== */}
      <button
        type="button"
        className="accordion"
        onClick={() => toggleSection("rutina")}
      >
        🏋️ Rutina
      </button>

      {openSection === "rutina" && (
        <div className="client-section accordion-content">
          <input
            placeholder="Rutina"
            value={routine}
            onChange={(e) => setRoutine(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (!routine.trim()) return;
              saveRoutine(client.id, routine);
              setRoutine("");
            }}
          >
            Guardar rutina
          </button>
          <small>Actual: {client.routine || "—"}</small>
        </div>
      )}

      {/* ===== PROGRESO ===== */}
      <button
        type="button"
        className="accordion"
        onClick={() => toggleSection("progreso")}
      >
        📈 Progreso
      </button>

      {openSection === "progreso" && (
        <div className="client-section accordion-content">
          <input
            type="date"
            value={progressForm.date}
            onChange={(e) =>
              setProgressForm({ ...progressForm, date: e.target.value })
            }
          />
          <input
            placeholder="Peso (kg)"
            value={progressForm.weight}
            onChange={(e) =>
              setProgressForm({ ...progressForm, weight: e.target.value })
            }
          />
          <input
            placeholder="Reps"
            value={progressForm.reps}
            onChange={(e) =>
              setProgressForm({ ...progressForm, reps: e.target.value })
            }
          />

          <button
            type="button"
            onClick={() => {
              if (!progressForm.date || progressForm.weight === "") return;
              addProgress(client.id, [
                ...client.progress,
                {
                  date: progressForm.date,
                  weight: Number(progressForm.weight),
                  reps: progressForm.reps,
                },
              ]);
              setProgressForm({ date: "", weight: "", reps: "" });
            }}
          >
            Agregar
          </button>

          <ul className="progress-list">
            {client.progress.map((p, i) => (
              <li key={`${p.date}-${i}`}>
                {editingIndex === i ? (
                  <>
                    <input
                      type="date"
                      value={editingProgress.date}
                      onChange={(e) =>
                        setEditingProgress({
                          ...editingProgress,
                          date: e.target.value,
                        })
                      }
                    />
                    <input
                      type="number"
                      value={editingProgress.weight}
                      onChange={(e) =>
                        setEditingProgress({
                          ...editingProgress,
                          weight: e.target.value,
                        })
                      }
                    />
                    <input
                      value={editingProgress.reps}
                      onChange={(e) =>
                        setEditingProgress({
                          ...editingProgress,
                          reps: e.target.value,
                        })
                      }
                    />
                    <button type="button" onClick={saveEdit}>
                      💾
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIndex(null);
                      }}
                    >
                      ✖
                    </button>
                  </>
                ) : (
                  <>
                    {p.date} — {p.weight} kg — {p.reps || "—"}
                    <button
                      type="button"
                      onClick={(e) => startEdit(i, e)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteProgress(i, e)}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== NUTRICIÓN ===== */}
      <button
        type="button"
        className="accordion"
        onClick={() => toggleSection("nutricion")}
      >
        🥗 Nutrición
      </button>

      {openSection === "nutricion" && (
        <div className="client-section accordion-content">
          <input
            type="date"
            value={nutritionDate}
            onChange={(e) => setNutritionDate(e.target.value)}
          />

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={nutritionCompleted}
              onChange={(e) =>
                setNutritionCompleted(e.target.checked)
              }
            />
            Cumplió dieta
          </label>

          <button
            type="button"
            onClick={() => {
              if (!nutritionDate) return;
              addNutritionLog(client.id, {
                date: nutritionDate,
                completed: nutritionCompleted,
              });
              setNutritionDate("");
              setNutritionCompleted(false);
            }}
          >
            Registrar día
          </button>

          <NutritionChart adherence={adherence} />

          <ul className="progress-list">
            {adherence.map((d) => (
              <li key={d.date}>
                {d.date} — {d.completed ? "✔ Cumplió" : "✘ No cumplió"}
                <button
                  type="button"
                  onClick={(e) => removeNutritionDay(d.date, e)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default ClientCard;