function MiniClientWeight({ progress, color = "#00ff99" }) {
  if (!progress || progress.length < 2) {
    return <small className="muted">Sin datos de peso</small>;
  }

  const weights = progress
    .map((p) => Number(p.weight))
    .filter(Boolean);

  if (weights.length < 2) {
    return <small className="muted">Sin datos</small>;
  }

  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const range = max - min || 1;

  const points = weights
    .slice(-8) // últimas 8 mediciones
    .map((w, i, arr) => {
      const x = (i / (arr.length - 1)) * 100;
      const y = 28 - ((w - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height="28"
      viewBox="0 0 100 28"
      style={{ marginTop: "6px" }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default MiniClientWeight;
