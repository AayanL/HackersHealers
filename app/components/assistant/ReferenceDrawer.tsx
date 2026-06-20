"use client";

import { useEffect, useId, useRef } from "react";
import type { ResourceDetail } from "@/lib/resources";

// The "reference item" a citation chip opens: a modal slide-over showing the
// parsed fields we hold for the cited FHIR resource, plus its raw reference id.
// Implements the modal contract — initial focus, focus trap, Esc, and focus
// restore to the trigger on close.

function focusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

export function ReferenceDrawer({
  resource,
  onClose,
}: {
  resource: ResourceDetail | null;
  onClose: () => void;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!resource) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const aside = asideRef.current;
    (focusable(aside)[0] ?? aside)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable(aside);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && idx === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to whatever triggered the drawer (the citation chip).
      previouslyFocused?.focus?.();
    };
  }, [resource, onClose]);

  if (!resource) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex justify-end"
    >
      <div
        aria-hidden="true"
        data-testid="drawer-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      <aside
        ref={asideRef}
        tabIndex={-1}
        className="relative z-10 flex h-full w-[360px] max-w-[88vw] flex-col border-l border-[#d2d8e0] bg-white shadow-2xl outline-none"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[#d2d8e0] bg-[#16202e] px-4 py-[11px] text-white">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9fb0c7]">
            {resource.type}
          </span>
          <span className="ml-auto" />
          <button
            type="button"
            aria-label="Close reference"
            onClick={onClose}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#233247] text-[14px] leading-none text-[#cfd8e3] hover:bg-[#2c3d54]"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <h2
            id={titleId}
            className="m-0 text-[15px] font-extrabold leading-[1.3] text-[#15181d]"
          >
            {resource.title}
          </h2>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[7px]">
            {resource.fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
                  {f.label}
                </dt>
                <dd className="m-0 text-[12.5px] text-[#1f242b]">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-1 border-t border-[#eaedf1] pt-3">
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
              Reference
            </div>
            <code className="mt-1 block break-all rounded-[4px] bg-[#f4f6f9] px-[8px] py-[6px] font-mono text-[11px] text-[#3a4a5e]">
              {resource.ref}
            </code>
          </div>

          <p className="m-0 text-[10.5px] leading-[1.45] text-[#8a93a2]">
            Shown from the chart context loaded for this patient.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default ReferenceDrawer;
