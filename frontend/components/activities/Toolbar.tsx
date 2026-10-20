import { SearchIcon } from "@/components/icons";
import { FILTERS, SORTS, type FilterKey, type SortKey } from "@/lib/activities";

/** Search box, filter chips (with counts where the design shows them) and sort menu. */
export default function Toolbar({
  query,
  onQuery,
  filter,
  onFilter,
  counts,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (q: string) => void;
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  counts: Record<FilterKey, number>;
  sort: SortKey;
  onSort: (s: SortKey) => void;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <label className="flex h-[38px] w-full items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text-muted focus-within:border-border-strong sm:w-[280px] sm:flex-none">
        <SearchIcon className="h-[15px] w-[15px] shrink-0" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search runs, places…"
          aria-label="Search runs"
          className="w-full bg-transparent text-text outline-none placeholder:text-text-muted"
        />
      </label>

      {FILTERS.map((f) => {
        const on = f.key === filter;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilter(f.key)}
            aria-pressed={on}
            className={
              "flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] transition-colors " +
              (on
                ? "border-white bg-white font-semibold text-[#14102a]"
                : "border-border bg-surface text-text-soft hover:bg-surface-hover")
            }
          >
            {f.label}
            {f.showCount && (
              <em className={"text-[11.5px] not-italic " + (on ? "text-[#5a5680]" : "text-text-muted")}>
                {counts[f.key]}
              </em>
            )}
          </button>
        );
      })}

      <span className="flex-1" />

      <label className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-[12.5px] text-text-soft">
        Sort:
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          aria-label="Sort runs"
          className="cursor-pointer bg-transparent text-text outline-none [color-scheme:dark]"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
