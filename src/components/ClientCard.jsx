import { useEffect, useState } from "react";
import WeightChart from "./WeightChart";
import MiniClientWeight from "./MiniClientWeight";

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
  const [routine, setRoutine] = useState("");
  const [goal, setGoal] = useState(client.goalWeight || "");

  const [progress, setProgress] = useState({
    date: "",
    weight: "",
    reps: "",
  });

  const [nutritionForm, setNutritionForm] = useState({
    calories: client.nutrition?.calories || "",
    protein: client.nutrition?.protein || "",
    carbs: client.nutrition?.carbs || "",
    fats: client.nutrition?.fats || "",
    notes: client.nutrition?.notes || "",
  });

  const [nutritionDate, setNutritionDate] = useState("");
  const [nutritionCompleted, setNutritionCompleted] = useState(false);

  useEffect(() => {
    setGoal(client.goalWeight || "");
  }, [client.goalWeight]);

  /* ===== ADHERENCIA ===== */
  const adherence = client.nutrition?.adherence || [];
  const totalDays = adherence.length;
  const completedDays = adherence.filter(d => d.completed).length;
  const adherencePercent = totalDays
    ? Math.round((completedDays / totalDays) * 100)
    : 0;

  let adherenceColor = "#444";
  if (adherencePercent >= 70) adherenceColor = "#00ff99";
  else if (adherencePercent >= 40) adherenceColor = "#ffcc00";
  else if (totalDays > 0) adherenceColor = "#ff5555";

  /* ===== ALERTAS ===== */
  const alerts = [];
  let progressColor = "#666";

  if (client.progress.length === 0) {
    alerts.push("⚠️ Sin registros de progreso");
  }

  if (client.goalWeight && client.progress.length > 0) {
    const lastWeight =
      Number(client.progress[client.progress.length - 1].weight);
    const diff = Math.abs(lastWeight - client.goalWeight);

    if (diff <= 1) {
      alerts.push("🟢 Objetivo casi logrado");
      progressColor = "#00ff99";
    } else if (diff <= 4) {
      alerts.push("🟡 Cerca del objetivo");
      progressColor = "#ffcc00";
    } else {
      alerts.push("🔴 Muy lejos del objetivo");
      progressColor = "#ff5555";
    }
  }

  if (totalDays > 3 && adherencePercent < 40) {
    alerts.push("🍽️ Mala adherencia nutricional");
  }

  return (
    <li className="client-card" style={{ borderLeft: `4px solid ${progressColor}` }}>
      {/* ===== HEADER ===== */}
      <div className="client-header">
        <div style={{ flex: 1 }}>
          <strong>{client.name}</strong>
          <small style={{ color: adherenceColor }}>
            {adherencePercent}% adherencia
          </small>

          <MiniClientWeight
            progress={client.progress}
            color={progressColor}
          />
        </div>

        <span className={client.active ? "status-active" : "status-inactive"}>
          {client.active ? "Activo" : "Inactivo"}
        </span>

        <button onClick={() => toggleStatus(client.id)}>Estado</button>
        <button onClick={() => exportClientCSV(client.id)}>📁 CSV</button>
        <button onClick={() => deleteClient(client.id)}>🗑️</button>
      </div>

      {/* ===== ALERTAS ===== */}
      {alerts.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          {alerts.map((a, i) => (
            <small key={i} className="muted">
              {a}
            </small>
          ))}
        </div>
      )}

      {/* ===== BARRA ADHERENCIA ===== */}
      <div className="progress-wrapper">
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${adherencePercent}%`,
              backgroundColor: adherenceColor,
            }}
          />
        </div>
      </div>

      {/* ===== OBJETIVO ===== */}
      <div className="client-section">
        <strong>🎯 Objetivo de peso</strong>
        <div className="row">
          <input
            type="number"
            placeholder="Peso objetivo (kg)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <button onClick={() => saveGoalWeight(client.id, Number(goal))}>
            Guardar
          </button>
        </div>
      </div>

      {/* ===== RUTINA ===== */}
      <div className="client-section">
        <strong>🏋️ Rutina</strong>
        <div className="row">
          <input
            placeholder="Rutina"
            value={routine}
            onChange={(e) => setRoutine(e.target.value)}
          />
          <button
            onClick={() => {
              if (!routine.trim()) return;
              saveRoutine(client.id, routine);
              setRoutine("");
            }}
          >
            Guardar rutina
          </button>
        </div>

        {client.routine && (
          <small className="muted">Rutina actual: {client.routine}</small>
        )}
      </div>

      {/* ===== PROGRESO ===== */}
      <div className="client-section">
        <strong>📈 Progreso</strong>

        <div className="row">
          <input
            type="date"
            value={progress.date}
            onChange={(e) =>
              setProgress({ ...progress, date: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Peso (kg)"
            value={progress.weight}
            onChange={(e) =>
              setProgress({ ...progress, weight: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Reps"
            value={progress.reps}
            onChange={(e) =>
              setProgress({ ...progress, reps: e.target.value })
            }
          />
          <button
            onClick={() => {
              if (!progress.date || !progress.weight) return;
              addProgress(client.id, progress);
              setProgress({ date: "", weight: "", reps: "" });
            }}
          >
            Agregar
          </button>
        </div>

        {client.progress.length >= 2 && (
          <WeightChart
            progress={client.progress}
            goalWeight={client.goalWeight}
          />
        )}
      </div>

      {/* ===== NUTRICIÓN ===== */}
      <div className="client-section">
        <strong>🍽️ Nutrición</strong>

        <div className="row">
          <input
            placeholder="Calorías"
            value={nutritionForm.calories}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, calories: e.target.value })
            }
          />
          <input
            placeholder="Proteína"
            value={nutritionForm.protein}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, protein: e.target.value })
            }
          />
          <input
            placeholder="Carbs"
            value={nutritionForm.carbs}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, carbs: e.target.value })
            }
          />
          <input
            placeholder="Grasas"
            value={nutritionForm.fats}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, fats: e.target.value })
            }
          />
        </div>

        <input
          placeholder="Notas"
          value={nutritionForm.notes}
          onChange={(e) =>
            setNutritionForm({ ...nutritionForm, notes: e.target.value })
          }
        />

        <button onClick={() => saveNutrition(client.id, nutritionForm)}>
          Guardar nutrición
        </button>
      </div>

      {/* ===== NUTRICIÓN DIARIA ===== */}
      <div className="client-section">
        <strong>🥗 Nutrición diaria</strong>

        <div className="row">
          <input
            type="date"
            value={nutritionDate}
            onChange={(e) => setNutritionDate(e.target.value)}
          />

          <label>
            <input
              type="checkbox"
              checked={nutritionCompleted}
              onChange={(e) =>
                setNutritionCompleted(e.target.checked)
              }
            />{" "}
            Cumplió dieta
          </label>

          <button
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
        </div>
      </div>
    </li>
  );
}

export default ClientCard;
