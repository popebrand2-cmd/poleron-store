// Minimal dependency-free SVG bar chart for the admin stats dashboard.
// Not meant for huge datasets — built for the "last 30 days" scale.
export default function BarChart({
  data,
  color = "#171717",
  formatValue = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const width = 720;
  const height = 220;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 4;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  // Avoid crowding the x-axis: show at most ~10 labels.
  const labelStride = Math.max(1, Math.ceil(data.length / 10));

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">Sin datos todavía.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * chartHeight;
        const x = i * (barWidth + barGap);
        const y = paddingTop + (chartHeight - barHeight);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} fill={color} rx={2} />
            {i % labelStride === 0 && d.value > 0 && (
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#525252">
                {formatValue(d.value)}
              </text>
            )}
            {i % labelStride === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#737373"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
