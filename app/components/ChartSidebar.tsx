"use client";

export interface ChartNavItem {
  label: string;
  count?: number;
}

export interface ChartSidebarProps {
  active?: string;
  items?: ChartNavItem[];
  onSelect?: (label: string) => void;
}

export const DEFAULT_CHART_ITEMS: ChartNavItem[] = [
  { label: "Snapshot" },
  { label: "Problems", count: 3 },
  { label: "Medications", count: 5 },
  { label: "Results" },
  { label: "Notes" },
  { label: "Orders" },
  { label: "Allergies", count: 1 },
];

export function ChartSidebar({
  active = "Medications",
  items = DEFAULT_CHART_ITEMS,
  onSelect,
}: ChartSidebarProps) {
  return (
    <nav
      aria-label="Chart"
      className="flex w-[172px] flex-none flex-col gap-px overflow-y-auto bg-[#16202e] px-[9px] py-[12px]"
    >
      <div className="px-[10px] py-[7px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#5d6b7e]">
        Chart
      </div>
      {items.map((it) => {
        const isActive = it.label === active;
        return (
          <button
            key={it.label}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={onSelect ? () => onSelect(it.label) : undefined}
            className={`flex items-center justify-between rounded-[4px] px-[11px] py-[8px] text-left text-[12.5px] ${
              isActive
                ? "border-l-[3px] border-[#4f86f7] bg-[#233247] font-bold text-white"
                : "text-[#a8b4c4]"
            }`}
          >
            <span>{it.label}</span>
            {it.count != null ? (
              <span className={isActive ? "text-[#8fb0ec]" : "text-[#5d6b7e]"}>
                {it.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default ChartSidebar;
