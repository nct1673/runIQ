const DAY_MS = 24 * 60 * 60 * 1000;

export interface TimelinePoint {
  date: Date;
  label: string; // e.g. "Selangor · Half"
  sub: string; // e.g. "1 Nov · in 16 days"
  kind: "done" | "next" | "upcoming";
}

const W = 1420;
const PAD = 70; // keeps the end labels inside the viewBox
const Y = 62;

const POINT_STYLE: Record<TimelinePoint["kind"], { fill: string; ring: string; icon: string }> = {
  done: { fill: "#B6F35A", ring: "#15142A", icon: "🏆" },
  next: { fill: "#FF4D8D", ring: "rgba(255,77,141,.35)", icon: "⚑" },
  upcoming: { fill: "#A27BFF", ring: "#15142A", icon: "⚑" },
};

function weeksLabel(a: Date, b: Date): string {
  const days = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  return days < 14 ? `${days} days` : `${Math.round(days / 7)} weeks`;
}

/** Season strip from the design: a line from the first month to the last
 * race, a "Today" marker, one dot per race and the gap between races.
 * `points` must be sorted by date; `today` is midnight local. */
export default function RaceTimeline({ points, today }: { points: TimelinePoint[]; today: Date }) {
  if (points.length === 0) return null;

  const first = Math.min(today.getTime(), points[0].date.getTime());
  const last = Math.max(today.getTime(), points[points.length - 1].date.getTime());
  const d0 = new Date(new Date(first).getFullYear(), new Date(first).getMonth(), 1).getTime();
  const span = Math.max(last - d0, 60 * DAY_MS);
  const d1 = d0 + span + Math.max(7 * DAY_MS, 0.06 * span);
  const x = (t: number) => PAD + ((t - d0) / (d1 - d0)) * (W - 2 * PAD);

  const months: { t: number; label: string }[] = [];
  for (let m = new Date(d0); m.getTime() < d1; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    months.push({ t: m.getTime(), label: m.toLocaleDateString(undefined, { month: "short" }) });
  }

  const todayX = x(today.getTime());

  return (
    <svg width="100%" viewBox={`0 0 ${W} 130`} role="img" aria-label="Race timeline" className="block">
      <line x1={PAD} x2={W - PAD} y1={Y} y2={Y} stroke="#36335F" strokeWidth={2} />
      <line x1={x(d0)} x2={todayX} y1={Y} y2={Y} stroke="#6E6A9E" strokeWidth={3} />

      {months.map(({ t, label }, i) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={Y - 6} y2={Y + 6} stroke="#36335F" />
          <text x={x(t) + (i === 0 ? 6 : 22)} y={Y - 10} fontSize={11} fill="#6E6A9E" fontWeight={600}>
            {label}
          </text>
        </g>
      ))}

      {points.slice(1).map((p, i) => {
        const a = points[i];
        const xa = x(a.date.getTime());
        const xb = x(p.date.getTime());
        const mid = (xa + xb) / 2;
        const short = p.date.getTime() - a.date.getTime() < 35 * DAY_MS;
        const color = short ? "#FFB938" : "#9A95C4";
        if (xb - xa < 80) return null; // too tight to label
        return (
          <g key={`gap${i}`}>
            <path
              d={`M${xa + 16},${Y - 30} Q${mid},${Y - 48} ${xb - 16},${Y - 30}`}
              fill="none"
              stroke={color}
              strokeDasharray="3 4"
              opacity={0.7}
            />
            <text x={mid} y={Y - 44} fontSize={11.5} fill={color} fontWeight={600} textAnchor="middle">
              {weeksLabel(a.date, p.date)}
            </text>
          </g>
        );
      })}

      <line x1={todayX} x2={todayX} y1={Y - 16} y2={Y + 16} stroke="#fff" strokeWidth={2} />
      <text x={todayX} y={Y + 34} fontSize={11.5} fill="#fff" fontWeight={700} textAnchor="middle">
        Today
      </text>

      {points.map((p, i) => {
        const px = x(p.date.getTime());
        const s = POINT_STYLE[p.kind];
        // Nudge labels that would sit on top of the "Today" label.
        const clash = Math.abs(px - todayX) < 40;
        const dy = clash ? 22 : 0;
        return (
          <g key={i}>
            <circle cx={px} cy={Y} r={15} fill={s.fill} stroke={s.ring} strokeWidth={3} />
            <text x={px} y={Y + 5} fontSize={13} textAnchor="middle">
              {s.icon}
            </text>
            <text x={px} y={Y + 40 + dy} fontSize={12.5} fill="#fff" fontWeight={600} textAnchor="middle">
              {p.label}
            </text>
            <text x={px} y={Y + 56 + dy} fontSize={11} fill="#9A95C4" textAnchor="middle">
              {p.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
