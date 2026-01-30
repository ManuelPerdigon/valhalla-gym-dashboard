function WeightChart({ progress, goalWeight }) {
  if (!progress || progress.length < 2) {
    return null;
  }

  const weights = progress.map(p => Number(p.weight));
  const maxWeight = Math.max(...weights, goalWeight ?? 0);
  const minWeight = Math.min(...weights, goalWeight ?? weights[0]);
  const range = maxWeight - minWeight || 1;

  const weightPoints = progress
    .map((p, i) => {
      const x = (i / (progress.length - 1)) * 300;
      const y = 100 - ((p.weight - minWeight) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const goalY =
    goalWeight !== undefined
      ? 100 - ((goalWeight - minWeight) / range) * 100
      : null;

  return (
    <svg
  viewBox="0 0 300 120"
  preserveAspectRatio="none"
  height="140"
  style={{ width: "100%", maxHeight: "140px" }}
>
      {/* Línea objetivo */}
      {goalWeight && (
        <line
          x1="0"
          y1={goalY}
          x2="300"
          y2={goalY}
          stroke="#ffffff"
          strokeDasharray="4 4"
          strokeWidth="2"
        />
      )}

      {/* Línea de peso */}
      <polyline
        fill="none"
        stroke="#00ff99"
        strokeWidth="3"
        points={weightPoints}
      />
    </svg>
  );
}

export default WeightChart;
