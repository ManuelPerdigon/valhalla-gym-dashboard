// src/components/MiniClientWeight.jsx
function MiniClientWeight({ progress, color = "#00ff99" }) {
  if (!progress || progress.length < 2) {
    return <small className="muted">Sin datos de peso</small>;
  }

  const weights = progress
    .map((p) => Number(p.weight))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (weights.length < 2) {
    return <small className="muted">Sin datos</small>;
  }

  const recentWeights = weights.slice(-8);

  const max = Math.max(...recentWeights);
  const min = Math.min(...recentWeights);
  const range = max - min || 1;

  const width = 100;
  const height = 44;
  const topPad = 6;
  const bottomPad = 8;
  const usableHeight = height - topPad - bottomPad;

  const points = recentWeights.map((w, i, arr) => {
    const x = arr.length === 1 ? 0 : (i / (arr.length - 1)) * width;
    const y = topPad + (1 - (w - min) / range) * usableHeight;
    return { x, y, w };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const first = recentWeights[0];
  const last = recentWeights[recentWeights.length - 1];
  const delta = (last - first).toFixed(1);
  const trendText =
    Number(delta) > 0 ? `+${delta} kg` : `${delta} kg`;

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        borderRadius: 14,
        background: "linear-gradient(180deg, #111, #0b0b0b)",
        border: "1px solid #202020",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <small className="muted">
          Últimas {recentWeights.length} mediciones
        </small>

        <small
          style={{
            color:
              Number(delta) < 0
                ? "#00ff99"
                : Number(delta) > 0
                ? "#ffcc00"
                : "#bbb",
            fontWeight: 700,
          }}
        >
          {trendText}
        </small>
      </div>

      <svg
        width="100%"
        height="56"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* línea guía inferior */}
        <line
          x1="0"
          y1="38"
          x2="100"
          y2="38"
          stroke="#1f1f1f"
          strokeWidth="1"
        />

        {/* gráfica */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* puntos */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="1.8"
            fill={color}
          />
        ))}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          opacity: 0.75,
        }}
      >
        <span>Inicio: {first} kg</span>
        <span>Actual: {last} kg</span>
      </div>
    </div>
  );
}

export default MiniClientWeight;