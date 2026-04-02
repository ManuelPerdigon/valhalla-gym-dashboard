// src/components/ClientCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { useToast } from "./ToastProvider";

const EMPTY_MEMBERSHIP = {
  type: "",
  start: "",
  end: "",
  amount: "",
  paymentStatus: "pending",
};

export default function ClientCard({
  client,

  toggleStatus,
  deleteClient,
  saveRoutine,
  addProgress,
  saveNutrition,
  addNutritionLog,
  saveGoalWeight,
  saveMembership,
  exportClientCSV,
  exportClientPDF,

  users = [],
  onAssignUser,
  busy = false,
}) {
  const { showToast } = useToast();

  const [openSection, setOpenSection] = useState(null);

  const [draftRoutine, setDraftRoutine] = useState(client.routine || "");
  const [draftGoal, setDraftGoal] = useState(client.goalWeight || "");
  const [draftNutrition, setDraftNutrition] = useState(client.nutrition || {});
  const [draftMembership, setDraftMembership] = useState(
    client.membership || EMPTY_MEMBERSHIP
  );

  const [saveState, setSaveState] = useState({
    routine: "idle",
    goal: "idle",
    nutrition: "idle",
    membership: "idle",
  });

  const didMount = useRef(false);

  const [assignValue, setAssignValue] = useState(
    client.assignedUserId ? String(client.assignedUserId) : ""
  );

  useEffect(() => {
    setDraftRoutine(client.routine || "");
    setDraftGoal(client.goalWeight || "");
    setDraftNutrition(client.nutrition || {});
    setDraftMembership(client.membership || EMPTY_MEMBERSHIP);
    setSaveState({
      routine: "idle",
      goal: "idle",
      nutrition: "idle",
      membership: "idle",
    });

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

    return <span style={{ fontSize: 12, opacity: s.opacity }}>{s.txt}</span>;
  };

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

  useDebouncedEffect(
    async () => {
      if (saveState.membership !== "dirty") return;
      try {
        setSaveState((p) => ({ ...p, membership: "saving" }));
        await saveMembership(client.id, draftMembership);
        setSaveState((p) => ({ ...p, membership: "saved" }));
        showToast("Membresía guardada ✅");
      } catch {
        setSaveState((p) => ({ ...p, membership: "error" }));
        showToast("No se pudo guardar la membresía ❌", "error");
      }
    },
    [draftMembership, saveState.membership, client.id],
    900
  );

  const setNutField = (key, val) => {
    setDraftNutrition((prev) => ({ ...(prev || {}), [key]: val }));
    setSaveState((p) => ({ ...p, nutrition: "dirty" }));
  };

  const setMembershipField = (key, val) => {
    setDraftMembership((prev) => ({ ...(prev || EMPTY_MEMBERSHIP), [key]: val }));
    setSaveState((p) => ({ ...p, membership: "dirty" }));
  };

  const [progressForm, setProgressForm] = useState({
    date: "",
    weight: "",
    reps: "",
  });

  const submitProgress = () => {
    if (!progressForm.date || !progressForm.weight) {
      showToast("Falta fecha y peso para agregar progreso", "warning");
      return;
    }

    const base = Array.isArray(client.progress) ? client.progress : [];
    const next = [...base];
    next.unshift({
      date: progressForm.date,
      weight: progressForm.weight,
      reps: progressForm.reps || "",
    });

    addProgress(client.id, next);
    setProgressForm({ date: "", weight: "", reps: "" });
    showToast("Progreso agregado ✅");
  };

  const [adhText, setAdhText] = useState("");
  const submitAdherence = () => {
    const t = adhText.trim();
    if (!t) {
      showToast("Escribe algo para la bitácora", "warning");
      return;
    }

    const log = { date: new Date().toISOString(), note: t, completed: true };
    addNutritionLog(client.id, log);
    setAdhText("");
    showToast("Bitácora agregada ✅");
  };

  const isOpen = (key) => openSection === key;

  const tabStyle = (active) => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: active ? "1px solid #444" : "1px solid #2a2a2a",
    background: active ? "linear-gradient(180deg, #1a1a1a, #101010)" : "#0d0d0d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: active ? "0 6px 18px rgba(0,0,0,0.35)" : "none",
  });

  const blockStyle = {
    borderTop: "1px solid #222",
    paddingTop: 14,
    marginTop: 10,
  };

  const panelStyle = {
    background: "linear-gradient(180deg, #121212, #0c0c0c)",
    border: "1px solid #252525",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  };

  const labelStyle = {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 6,
    display: "block",
  };

  const assignedUser = useMemo(() => {
    if (!client.assignedUserId) return null;
    return users.find((u) => String(u.id) === String(client.assignedUserId)) || null;
  }, [client.assignedUserId, users]);

  const handleAssignChange = async (e) => {
    const val = e.target.value;
    setAssignValue(val);

    if (!onAssignUser) {
      showToast("Falta onAssignUser en ClientCard.", "error");
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

  const paymentStatusText =
    draftMembership?.paymentStatus === "paid"
      ? "Pagado"
      : draftMembership?.paymentStatus === "overdue"
      ? "Vencido"
      : "Pendiente";

  return (
    <li
      className="client-card"
      style={{
        listStyle: "none",
        marginBottom: 18,
        border: "1px solid #242424",
        borderRadius: 18,
        padding: 18,
        background: "linear-gradient(180deg, #121212, #0b0b0b)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 22, letterSpacing: 0.3 }}>
              {client.name}
            </h3>

            <span
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #333",
                background: client.active
                  ? "rgba(0,255,153,0.08)"
                  : "rgba(255,85,85,0.08)",
                color: client.active ? "#00ff99" : "#ff5555",
                fontWeight: 700,
              }}
            >
              {client.active ? "Activo" : "Inactivo"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #222",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <small style={{ opacity: 0.7, display: "block" }}>ID Cliente</small>
              <strong>{client.id}</strong>
            </div>

            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #222",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <small style={{ opacity: 0.7, display: "block" }}>Usuario asignado</small>
              <strong>{assignedUser ? assignedUser.username : "— Sin asignar —"}</strong>
            </div>

            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #222",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <small style={{ opacity: 0.7, display: "block" }}>Membresía</small>
              <strong>{draftMembership?.type || "Sin definir"}</strong>
            </div>

            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid #222",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <small style={{ opacity: 0.7, display: "block" }}>Pago</small>
              <strong>{paymentStatusText}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "flex-start",
          }}
        >
          <button type="button" onClick={() => exportClientCSV(client.id)} disabled={busy}>
            Exportar CSV
          </button>

          <button type="button" onClick={() => exportClientPDF(client.id)} disabled={busy}>
            Exportar PDF
          </button>

          <button type="button" onClick={() => toggleStatus(client.id)} disabled={busy}>
            {client.active ? "Desactivar" : "Activar"}
          </button>

          <button type="button" onClick={() => deleteClient(client.id)} disabled={busy}>
            🗑️ Eliminar
          </button>
        </div>
      </div>

      <div style={panelStyle}>
        <label style={labelStyle}>Asignación de usuario cliente</label>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select value={assignValue} onChange={handleAssignChange} disabled={busy}>
            <option value="">— Sin asignar —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>

          <small style={{ opacity: 0.65 }}>
            Usuarios cliente disponibles: {users.length}
          </small>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={tabStyle(isOpen("routine"))}
          onClick={() => setOpenSection(isOpen("routine") ? null : "routine")}
          disabled={busy}
        >
          Rutina {renderSaveBadge(saveState.routine)}
        </button>

        <button
          type="button"
          style={tabStyle(isOpen("nutrition"))}
          onClick={() => setOpenSection(isOpen("nutrition") ? null : "nutrition")}
          disabled={busy}
        >
          Nutrición {renderSaveBadge(saveState.nutrition)}
        </button>

        <button
          type="button"
          style={tabStyle(isOpen("progress"))}
          onClick={() => setOpenSection(isOpen("progress") ? null : "progress")}
          disabled={busy}
        >
          Progreso
        </button>

        <button
          type="button"
          style={tabStyle(isOpen("goal"))}
          onClick={() => setOpenSection(isOpen("goal") ? null : "goal")}
          disabled={busy}
        >
          Meta {renderSaveBadge(saveState.goal)}
        </button>

        <button
          type="button"
          style={tabStyle(isOpen("membership"))}
          onClick={() => setOpenSection(isOpen("membership") ? null : "membership")}
          disabled={busy}
        >
          Membresía {renderSaveBadge(saveState.membership)}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {isOpen("routine") && (
          <div style={blockStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
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
                minHeight: 160,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
              }}
              disabled={busy}
            />

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Guardado automático.
            </small>
          </div>
        )}

        {isOpen("nutrition") && (
          <div style={blockStyle}>
            <h4 style={{ margin: "0 0 10px" }}>Plan de Nutrición</h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>Calorías</label>
                <input
                  placeholder="Calorías"
                  value={draftNutrition?.calories || ""}
                  onChange={(e) => setNutField("calories", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Proteína</label>
                <input
                  placeholder="Proteína"
                  value={draftNutrition?.protein || ""}
                  onChange={(e) => setNutField("protein", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Carbs</label>
                <input
                  placeholder="Carbs"
                  value={draftNutrition?.carbs || ""}
                  onChange={(e) => setNutField("carbs", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Grasas</label>
                <input
                  placeholder="Grasas"
                  value={draftNutrition?.fats || ""}
                  onChange={(e) => setNutField("fats", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Notas</label>
              <textarea
                placeholder="Notas"
                value={draftNutrition?.notes || ""}
                onChange={(e) => setNutField("notes", e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#0f0f0f",
                  color: "#fff",
                }}
                disabled={busy}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <h5 style={{ margin: "0 0 8px" }}>Adherencia / Bitácora</h5>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  placeholder="Ej: Cumplió macros, 2L agua, etc."
                  value={adhText}
                  onChange={(e) => setAdhText(e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                  disabled={busy}
                />

                <button type="button" onClick={submitAdherence} disabled={busy}>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {isOpen("progress") && (
          <div style={blockStyle}>
            <h4 style={{ margin: "0 0 10px" }}>Progreso</h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>Fecha</label>
                <input
                  type="date"
                  value={progressForm.date}
                  onChange={(e) =>
                    setProgressForm((p) => ({ ...p, date: e.target.value }))
                  }
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Peso</label>
                <input
                  placeholder="Peso"
                  value={progressForm.weight}
                  onChange={(e) =>
                    setProgressForm((p) => ({ ...p, weight: e.target.value }))
                  }
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Reps (opcional)</label>
                <input
                  placeholder="Reps (opcional)"
                  value={progressForm.reps}
                  onChange={(e) =>
                    setProgressForm((p) => ({ ...p, reps: e.target.value }))
                  }
                  disabled={busy}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={submitProgress} disabled={busy}>
                Agregar progreso
              </button>
            </div>
          </div>
        )}

        {isOpen("goal") && (
          <div style={blockStyle}>
            <h4 style={{ margin: "0 0 10px" }}>Meta de peso</h4>

            <input
              placeholder="Ej: 78 kg"
              value={draftGoal}
              onChange={(e) => {
                setDraftGoal(e.target.value);
                setSaveState((p) => ({ ...p, goal: "dirty" }));
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#0f0f0f",
                color: "#fff",
              }}
              disabled={busy}
            />

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Guardado automático.
            </small>
          </div>
        )}

        {isOpen("membership") && (
          <div style={blockStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h4 style={{ margin: 0 }}>Membresía</h4>
              {renderSaveBadge(saveState.membership)}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <label style={labelStyle}>Tipo de plan</label>
                <select
                  value={draftMembership?.type || ""}
                  onChange={(e) => setMembershipField("type", e.target.value)}
                  disabled={busy}
                >
                  <option value="">Selecciona plan…</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Inicio</label>
                <input
                  type="date"
                  value={draftMembership?.start || ""}
                  onChange={(e) => setMembershipField("start", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Vencimiento</label>
                <input
                  type="date"
                  value={draftMembership?.end || ""}
                  onChange={(e) => setMembershipField("end", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Monto</label>
                <input
                  placeholder="Ej: 450"
                  value={draftMembership?.amount || ""}
                  onChange={(e) => setMembershipField("amount", e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>Estado de pago</label>
                <select
                  value={draftMembership?.paymentStatus || "pending"}
                  onChange={(e) => setMembershipField("paymentStatus", e.target.value)}
                  disabled={busy}
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>
            </div>

            <small style={{ display: "block", marginTop: 8, opacity: 0.7 }}>
              Guardado automático.
            </small>
          </div>
        )}
      </div>
    </li>
  );
}