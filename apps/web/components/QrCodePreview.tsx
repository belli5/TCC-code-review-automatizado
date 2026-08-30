const MODULES = 29;
const QUIET_ZONE = 2;

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function isFinderPattern(row: number, col: number): boolean | null {
  const corners = [
    [0, 0],
    [0, MODULES - 7],
    [MODULES - 7, 0],
  ];

  for (const [top, left] of corners) {
    const dr = row - top;
    const dc = col - left;
    if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
      if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return false; // margem branca
      const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      return ring !== 2;
    }
  }
  return null;
}

export function QrCodePreview({ value, size = 220 }: { value: string; size?: number }) {
  const random = createRandom(hash(value));
  const cells: { row: number; col: number }[] = [];

  for (let row = 0; row < MODULES; row += 1) {
    for (let col = 0; col < MODULES; col += 1) {
      const finder = isFinderPattern(row, col);
      const filled = finder === null ? random() > 0.5 : finder;
      if (filled) cells.push({ row, col });
    }
  }

  const total = MODULES + QUIET_ZONE * 2;

  return (
    <svg
      className="qr-code"
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="Representação visual do QR Code do PIX"
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#ffffff" />
      {cells.map(({ row, col }) => (
        <rect
          key={`${row}-${col}`}
          x={col + QUIET_ZONE}
          y={row + QUIET_ZONE}
          width={1}
          height={1}
          fill="#0f172a"
        />
      ))}
    </svg>
  );
}
