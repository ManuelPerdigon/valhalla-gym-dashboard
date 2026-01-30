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
  const [openSection, setOpenSection] = useState(null);

  const [routine, setRoutine] = useState("");
  const [goal, setGoal] = useState(client.goalWeight || "");

  useEffect(() => {
    setGoal(client.goalWeight || "");
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
  });

  const [nutritionDate, setNutritionDate] = useState("");
  const [nutritionCompleted, setNutritionCompleted] = useState(false);

  /* ===== ADHERENCIA ===== */
  const adherence = client.nutrition?.adherence || [];
  const adherencePercent = adherence.length
    ? Math.round(
        (adherence.filter((d) => d.completed).length /
          adherence.length) *
          100
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
          <span className={client.active ? "status-active" : "status-inactive"}>
            {client.active ? "Activo" : "Inactivo"}
          </span>
          <button onClick={() => toggleStatus(client.id)}>Estado</button>
          <button onClick={() => exportClientCSV(client.id)}>CSV</button>
          <button onClick={() => deleteClient(client.id)}>🗑️</button>
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

      {/* ===== RESUMEN ===== */}
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
      onClick={() => {
        saveGoalWeight(client.id, goal);
      }}
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


      {/* ===== ACCORDION ===== */}
      <button className="accordion" onClick={() => toggleSection("rutina")}>
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
            onClick={() => {
              saveRoutine(client.id, routine);
              setRoutine("");
            }}
          >
            Guardar rutina
          </button>
          <small>Actual: {client.routine || "—"}</small>
        </div>
      )}

      <button className="accordion" onClick={() => toggleSection("progreso")}>
        📈 Progreso
      </button>

      {openSection === "progreso" && (
        <div className="client-section accordion-content">
          <input
            type="date"
            value={progress.date}
            onChange={(e) =>
              setProgress({ ...progress, date: e.target.value })
            }
          />
          <input
            placeholder="Peso (kg)"
            value={progress.weight}
            onChange={(e) =>
              setProgress({ ...progress, weight: e.target.value })
            }
          />
          <input
            placeholder="Reps"
            value={progress.reps}
            onChange={(e) =>
              setProgress({ ...progress, reps: e.target.value })
            }
          />
          <button
            onClick={() => {
              addProgress(client.id, progress);
              setProgress({ date: "", weight: "", reps: "" });
            }}
          >
            Agregar
          </button>

          <ul className="progress-list">
            {client.progress.map((p, i) => (
              <li key={i}>
                {p.date} — {p.weight} kg — {p.reps} reps
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="accordion" onClick={() => toggleSection("nutricion")}>
        🥗 Nutrición
      </button>

      {openSection === "nutricion" && (
        <div className="client-section accordion-content">
          <input
            placeholder="Calorías"
            value={nutritionForm.calories}
            onChange={(e) =>
              setNutritionForm({
                ...nutritionForm,
                calories: e.target.value,
              })
            }
          />
          <input
            placeholder="Proteína"
            value={nutritionForm.protein}
            onChange={(e) =>
              setNutritionForm({
                ...nutritionForm,
                protein: e.target.value,
              })
            }
          />

          <button onClick={() => saveNutrition(client.id, nutritionForm)}>
            Guardar nutrición
          </button>

          <hr />

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
      )}
    </li>
  );
}

export default ClientCard;
