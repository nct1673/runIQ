"use client";

import { useState } from "react";

export interface MonthlyMileagePoint {
  month_start: string;
  distance_km: number;
  runs: number;
}

const CHART_HEIGHT = 160;
const TOP = 12;
const BOTTOM = CHART_HEIGHT - 20;
const GRID_ROWS = 4;

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function monthLabelLong(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Line chart of distance per calendar month, on a light grid -- same
 * shape as WeeklyMileageChart, one bucket size up. */
export default function MonthlyMileageChart({ data }: { data: MonthlyMileagePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No runs yet</p>;
  }

  const max = Math.max(...data.map((d) => d.distance_km), 1);
  const barSlot = 100 / data.length;

  const points = data.map((d, i) => {
    const x = i * barSlot + barSlot / 2;
    const y = TOP + (1 - d.distance_km / max) * (BOTTOM - TOP);
    return { x, y, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative">
      <div className="relative h-[160px] w-full">
        <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          {Array.from({ length: GRID_ROWS + 1 }, (_, i) => {
            const y = TOP + (i / GRID_ROWS) * (BOTTOM - TOP);
            return (
              <line key={`h-${i}`} x1="0" y1={y} x2="100" y2={y} stroke="var(--color-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" />
            );
          })}
          {Array.from({ length: data.length + 1 }, (_, i) => {
            const x = i * barSlot;
            return (
              <line key={`v-${i}`} x1={x} y1={TOP} x2={x} y2={BOTTOM} stroke="var(--color-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" />
            );
          })}

          <path d={linePath} fill="none" stroke="var(--color-mileage)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

          {hovered != null && (
            <line
              x1={points[hovered].x}
              y1={TOP - 4}
              x2={points[hovered].x}
              y2={BOTTOM}
              stroke="var(--color-mileage)"
              strokeWidth="1"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {points.map((p, i) => (
          <div
            key={data[i].month_start}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            className="absolute top-0 h-full -translate-x-1/2"
            style={{ left: `${p.x}%`, width: `${barSlot}%` }}
          >
            <span
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
              style={{
                top: `${(p.y / CHART_HEIGHT) * 100}%`,
                width: hovered === i ? 8 : 6,
                height: hovered === i ? 8 : 6,
                backgroundColor: "var(--color-mileage)",
                borderColor: "var(--color-mileage)",
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-1 flex text-[10px] text-text-muted" style={{ pointerEvents: "none" }}>
        {data.map((d, i) => (
          <div key={d.month_start} style={{ width: `${barSlot}%` }} className="truncate text-center">
            {i % Math.ceil(data.length / 6) === 0 ? monthLabel(d.month_start) : ""}
          </div>
        ))}
      </div>

      {hovered != null && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${hovered * barSlot + barSlot / 2}%` }}
        >
          <div className="font-medium text-text">{data[hovered].distance_km.toFixed(1)} km</div>
          <div className="text-text-muted">
            {monthLabelLong(data[hovered].month_start)} · {data[hovered].runs} run
            {data[hovered].runs === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}
