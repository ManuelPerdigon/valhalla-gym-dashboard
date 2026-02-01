function NutritionChart({ adherence }) {
  if (!adherence || adherence.length === 0) {
    return <small className="muted">Sin registros</small>;
  }

  return (
    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
      {adherence.slice(-14).map((d) => (
        <div
          key={d.date}
          title={`${d.date} – ${
            d.completed ? "Cumplió" : "No cumplió"
          }`}
          style={{
            width: "14px",
            height: d.completed ? "40px" : "20px",
            background: d.completed ? "#00ff99" : "#ff5555",
            borderRadius: "4px",
            transition: "all 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

export default NutritionChart;