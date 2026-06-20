/** A small segmented control used inside cards (SBAR/patient, note/todo). */
export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-[3px] rounded-[6px] bg-[#eef0f4] p-[3px]"
    >
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={`flex-1 cursor-pointer rounded-[4px] px-[8px] py-[5px] text-[11px] font-semibold ${
              selected
                ? "bg-white text-[#2756e6] shadow-sm"
                : "bg-transparent text-[#6b7480]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
