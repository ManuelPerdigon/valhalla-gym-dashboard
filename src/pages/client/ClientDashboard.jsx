import { useEffect, useState } from "react";
import ClientCard from "../../components/ClientCard";
import Dashboard from "../../components/Dashboard";
import { useAuth } from "../../context/AuthContext";

export default function ClientDashboard() {
  const { API_URL, authHeaders, logout } = useAuth();
  const [clients, setClients] = useState([]);

  const fetchMine = async () => {
    const res = await fetch(`${API_URL}/clients`, { headers: { ...authHeaders } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Error");
    setClients(data);
  };

  useEffect(() => {
    fetchMine().catch((e) => {
      console.error(e);
      alert("Error cargando tus datos. Revisa que el backend esté corriendo.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En cliente solo permitimos actualizar progress/nutrition con PATCH
  const patchClient = async (id, patch) => {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Error");
    setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
  };

  const addProgress = async (id, newProgressArray) =>
    patchClient(id, { progress: newProgressArray });

  const addNutritionLog = async (id, log) => {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    const adherence = current.nutrition?.adherence || [];
    await patchClient(id, {
      nutrition: { ...current.nutrition, adherence: [...adherence, log] },
    });
  };

  return (
    <div className="app">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <h1>Valhalla Gym</h1>
        <button type="button" onClick={logout}>
          Salir
        </button>
      </div>

      <Dashboard clients={clients} />

      <ul style={{ padding: 0 }}>
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            // cliente: vista restringida
            isClientView={true}
            // solo usamos estos 2
            addProgress={addProgress}
            addNutritionLog={addNutritionLog}
          />
        ))}
      </ul>
    </div>
  );
}