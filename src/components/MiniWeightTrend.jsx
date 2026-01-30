function MiniWeightTrend({ weights }) {
  if (!weights || weights.length < 2) {
    return <small className="muted">Sin datos</small>;
  }

  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const range = max - min || 1;

  const points = weights
    .slice(-10) // últimas 10 mediciones
    .map((w, i, arr) => {
      const x = (i / (arr.length - 1)) * 100;
      const y = 40 - ((w - min) / range) * 40;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height="40" viewBox="0 0 100 40">
      <polyline
        fill="none"
        stroke="#00ff99"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

export default MiniWeightTrend;
