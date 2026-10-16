import { hoursMinutes, paceParts, type YearSummary } from "@/lib/activities";

/** Year totals on the left, one bar per month (km) on the right. */
export default function YearStrip({
  summary,
  highlightMonth,
}: {
  summary: YearSummary;
  /** Month index (0-11) of the selected run, drawn in the accent gradient. */
  highlightMonth: number | null;
}) {
  const { h, m } = hoursMinutes(summary.movingS);
  const pace = paceParts(summary.avgPace);
  const maxKm = Math.max(1, ...summary.months.map((x) => x.km));

  const totals: { label: string; value: React.ReactNode }[] = [
    {
      label: `${summary.year} distance`,
      value: (
        <>
          {summary.km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          <Unit>km</Unit>
        </>
      ),
    },
    { label: "Runs", value: summary.runs },
    {
      label: "Moving time",
      value: (
        <>
          {h}
          <Unit>h</Unit> {m}
          <Unit>m</Unit>
        </>
      ),
    },
    {
      label: "Avg pace",
      value: (
        <>
          {pace.value}
          <Unit>{pace.unit}</Unit>
        </>
      ),
    },
  ];

  return (
    <section className="mb-[18px] grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface px-6 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] lg:grid-cols-[auto_1fr] lg:gap-[34px]">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-9">
        {totals.map((t) => (
          <div key={t.label}>
            <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
              {t.label}
            </small>
            <b className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">{t.value}</b>
          </div>
        ))}
      </div>

      <div
        className="grid h-[138px] items-end gap-2.5 overflow-x-auto border-border lg:border-l lg:pl-[30px]"
        style={{ gridTemplateColumns: `repeat(${summary.months.length}, minmax(28px, 1fr))` }}
      >
        {summary.months.map((mo) => {
          const on = mo.month === highlightMonth;
          const background = mo.partial
            ? "repeating-linear-gradient(135deg, rgba(162,123,255,.5) 0 4px, rgba(255,77,141,.5) 4px 8px)"
            : on
              ? "linear-gradient(180deg, #a27bff, #ff4d8d)"
              : "#3f3a72";
          return (
            <div key={mo.month} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className={"text-[11px] " + (on ? "font-semibold text-text" : "text-text-muted")}>
                {Math.round(mo.km)}
              </span>
              <div
                className="w-full rounded-t-md rounded-b-[3px]"
                style={{ height: `${Math.max(2, (mo.km / maxKm) * 92)}px`, background }}
              />
              <span className={"text-[11.5px] " + (on ? "font-semibold text-text" : "text-text-muted")}>
                {mo.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <em className="ml-[3px] text-sm font-medium not-italic text-text-muted">{children}</em>;
}
