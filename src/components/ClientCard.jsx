import { useEffect, useState } from "react";
import WeightChart from "./WeightChart";

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
  /* ===== ESTADOS ===== */
  const [routine, setRoutine] = useState("");
  const [goal, setGoal] = useState("");

  useEffect(() => {
    setGoal(client.goalWeight ?? "");
  }, [client.goalWeight]);

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

  /* ===== ADHERENCIA ===== */
  const adherence = client.nutrition?.adherence || [];
  const totalDays = adherence.length;
  const completedDays = adherence.filter((d) => d.completed).length;
  const adherencePercent = totalDays
    ? Math.round((completedDays / totalDays) * 100)
    : 0;

  let adherenceColor = "#444";
  if (adherencePercent >= 70) adherenceColor = "#00ff99";
  else if (adherencePercent >= 40) adherenceColor = "#ffcc00";
  else if (totalDays > 0) adherenceColor = "#ff5555";

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

        <span className={client.active ? "status-active" : "status-inactive"}>
          {client.active ? "Activo" : "Inactivo"}
        </span>

        <button onClick={() => toggleStatus(client.id)}>Estado</button>

        <button onClick={() => exportClientCSV(client.id)}>📁 CSV</button>

        <button
          onClick={() => {
            if (window.confirm("¿Eliminar cliente?")) {
              deleteClient(client.id);
            }
          }}
        >
          🗑️
        </button>
      </div>

      {/* ===== BARRA NUTRICIÓN ===== */}
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
          <button
            onClick={() => {
              if (goal === "") return;
              saveGoalWeight(client.id, Number(goal));
            }}
          >
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
          <small className="muted">
            Rutina actual: {client.routine}
          </small>
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

        {client.progress.length > 0 && (
          <ul className="progress-list">
            {client.progress.map((p, i) => (
              <li key={i}>
                📅 {p.date} — ⚖️ {p.weight} kg — 🔁 {p.reps} reps
              </li>
            ))}
          </ul>
        )}

        {client.progress.length >= 2 && (
          <WeightChart
            progress={client.progress}
            goalWeight={client.goalWeight}
          />
        )}
      </div>

      {/* ===== PLAN NUTRICIONAL ===== */}
      <div className="client-section">
        <strong>🍽️ Plan nutricional</strong>

        <div className="row">
          <input
            type="number"
            placeholder="Calorías"
            value={nutritionForm.calories}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, calories: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Proteína"
            value={nutritionForm.protein}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, protein: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Carbs"
            value={nutritionForm.carbs}
            onChange={(e) =>
              setNutritionForm({ ...nutritionForm, carbs: e.target.value })
            }
          />
          <input
            type="number"
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
            />
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
