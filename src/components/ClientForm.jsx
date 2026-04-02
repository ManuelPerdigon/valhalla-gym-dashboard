// src/components/ClientForm.jsx
function ClientForm({
  name,
  setName,
  initialWeight,
  setInitialWeight,
  initialDate,
  setInitialDate,
  addClient,
}) {
  return (
    <div className="client-section">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div>
          <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 6 }}>
            Nombre del cliente
          </label>
          <input
            placeholder="Nombre del cliente"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 6 }}>
            Peso inicial
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Ej: 82.5"
            value={initialWeight}
            onChange={(e) => setInitialWeight(e.target.value)}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, opacity: 0.8, display: "block", marginBottom: 6 }}>
            Fecha inicial
          </label>
          <input
            type="date"
            value={initialDate}
            onChange={(e) => setInitialDate(e.target.value)}
          />
        </div>

        <div>
          <button type="button" onClick={addClient}>
            Agregar cliente
          </button>
        </div>
      </div>

      <hr style={{ marginTop: 16 }} />
    </div>
  );
}

export default ClientForm;