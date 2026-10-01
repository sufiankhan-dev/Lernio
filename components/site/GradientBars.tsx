const leftBars = [89, 165, 191, 191, 134, 165, 134, 97];
const rightBars = [43, 65, 85, 115, 152, 191, 191, 171];

function barHeight(height: number) {
  return `clamp(24px, ${((height / 1024) * 100).toFixed(2)}vw, ${height}px)`;
}

export function GradientBars() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mt-auto flex select-none items-end gap-6"
    >
      <div className="flex flex-1 items-end">
        {leftBars.map((height, index) => (
          <span
            key={`l-${index}`}
            style={{ height: barHeight(height) }}
            className="min-w-0 flex-1 bg-gradient-to-t from-primary-400/85 via-primary-300/45 to-transparent"
          />
        ))}
      </div>
      <div className="flex flex-1 items-end">
        {rightBars.map((height, index) => (
          <span
            key={`r-${index}`}
            style={{ height: barHeight(height) }}
            className="min-w-0 flex-1 bg-gradient-to-t from-primary-400/85 via-primary-300/45 to-transparent"
          />
        ))}
      </div>
    </div>
  );
}
