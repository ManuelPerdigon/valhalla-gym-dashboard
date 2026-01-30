function MonthlyProgress({ progress }) {
  if (!progress || progress.length < 2) {
    return <small className="muted">Sin datos mensuales</small>;
  }

  // Ordenar por fecha
  const sorted = [...progress].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Agrupar por mes
  const byMonth = {};

  sorted.forEach((p) => {
    const month = p.date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(p);
  });

  const months = Object.entries(byMonth);

  return (
    <ul className="progress-list">
      {months.map(([month, entries]) => {
        const start = Number(entries[0].weight);
        const end = Number(entries[entries.length - 1].weight);
        const diff = end - start;

        return (
          <li key={month}>
            📅 <strong>{month}</strong> —{" "}
            {start}kg → {end}kg{" "}
            <strong
              style={{
                color: diff <= 0 ? "#00ff99" : "#ff5555",
              }}
            >
              ({diff > 0 ? "+" : ""}
              {diff}kg)
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

export default MonthlyProgress;
