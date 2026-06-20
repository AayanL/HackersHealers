"use client";

import type { ReactNode } from "react";

/**
 * Shared chrome for every chart section page (Problems, Results, Notes, …) so
 * they match the Medications panel: a scrollable <main> with a bold title, an
 * optional mono count, and an optional right-aligned action.
 */
export function ChartPage({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto px-[20px] py-[16px]">
      <div className="mb-3 flex items-center gap-[10px]">
        <h1 className="m-0 text-[16px] font-extrabold tracking-[-0.01em]">
          {title}
        </h1>
        {count ? (
          <span className="font-mono text-[11.5px] text-[#8a93a2]">{count}</span>
        ) : null}
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </main>
  );
}

/** A quiet, dashed-border placeholder for a section with nothing to show. */
export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[6px] border border-dashed border-[#cbd3dd] bg-white px-6 py-[44px] text-center">
      <p className="m-0 max-w-[380px] text-[12.5px] leading-[1.5] text-[#6b7480]">
        {children}
      </p>
      {action}
    </div>
  );
}

/** The shared blue "ask the assistant" action button (mirrors Reconcile). */
export function DraftButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[5px] border border-[#2756e6] bg-[#2756e6] px-3 py-[7px] text-[12px] font-bold text-white"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden>
        <path d="M12 2.5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
      </svg>
      {children}
    </button>
  );
}

export default ChartPage;
