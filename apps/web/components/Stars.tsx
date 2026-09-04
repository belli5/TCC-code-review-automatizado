export function Stars({
  rating,
  size = 16,
  showValue = false,
  count,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
  count?: number;
}) {
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <span className="stars" aria-label={`Nota ${clamped.toFixed(1)} de 5`}>
      <span className="stars-track" style={{ fontSize: size }}>
        <span className="stars-empty">★★★★★</span>
        <span className="stars-filled" style={{ width: `${(clamped / 5) * 100}%` }}>
          ★★★★★
        </span>
      </span>
      {showValue && (
        <span className="stars-value">
          {clamped.toFixed(1)}
          {count !== undefined && <span className="stars-count"> ({count})</span>}
        </span>
      )}
    </span>
  );
}
