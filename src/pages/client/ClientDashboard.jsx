import { useEffect, useState } from "react";
import "../../App.css";
import ClientCard from "../../components/ClientCard";
import Dashboard from "../../components/Dashboard";
import { useAuth } from "../../context/AuthContext";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("clients");
    if (stored) setClients(JSON.parse(stored));
  }, []);

  // ✅ Cliente solo ve su cliente asignado
  const myClients = clients.filter((c) => c.assignedUserId === user.id);

  return (
    <div className="app">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <h1>Valhalla Gym</h1>
        <button type="button" onClick={logout}>Salir</button>
      </div>

      <Dashboard clients={myClients} />

      {myClients.length === 0 ? (
        <div className="dashboard">
          <h2>Tu cuenta no tiene cliente asignado</h2>
          <small className="muted">
            Pide a tu coach que te asigne tu perfil.
          </small>
        </div>
      ) : (
        <ul style={{ padding: 0 }}>
          {myClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              // en cliente no usamos estas funciones:
              toggleStatus={() => {}}
              deleteClient={() => {}}
              saveRoutine={() => {}}
              saveNutrition={() => {}}
              saveGoalWeight={() => {}}
              exportClientCSV={() => {}}
              addProgress={(id, arr) => {
                // cliente sí puede agregar progreso (según tus reglas)
                setClients((prev) => {
                  const updated = prev.map((c) =>
                    c.id === id ? { ...c, progress: arr } : c
                  );
                  localStorage.setItem("clients", JSON.stringify(updated));
                  return updated;
                });
              }}
              addNutritionLog={(id, log) => {
                setClients((prev) => {
                  const updated = prev.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          nutrition: {
                            ...c.nutrition,
                            adherence: [...c.nutrition.adherence, log],
                          },
                        }
                      : c
                  );
                  localStorage.setItem("clients", JSON.stringify(updated));
                  return updated;
                });
              }}
              isClientView={true}
            />
          ))}
        </ul>
      )}
    </div>
  );
}