"use client";

import { useEffect, useRef, useState } from "react";

// A single "Export" button with a dropdown — Print / Copy / Download — shared by
// the billing and form cards. Everything is client-side (Phase-1 export-only; no
// write-back). Each action is guarded so it degrades quietly where a browser API
// is missing (e.g. jsdom / blocked popups).

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c,
  );
}

function printText(title: string, text: string): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=820,height=640");
  if (!w) return;
  w.document.write(
    `<title>${escapeHtml(title)}</title>` +
      `<pre style="font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;padding:32px;color:#15181d">${escapeHtml(
        text,
      )}</pre>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard unavailable — degrade quietly */
  }
}

function downloadText(filename: string, text: string): void {
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* download unavailable — degrade quietly */
  }
}

export function ExportMenu({
  filename,
  title,
  text,
}: {
  filename: string;
  title: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const item =
    "block w-full cursor-pointer px-3 py-[6px] text-left text-[11.5px] text-[#1f242b] hover:bg-[#f4f6f9]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[8px] py-[3px] text-[10.5px] font-semibold text-[#2756e6]"
      >
        Export
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[124px] overflow-hidden rounded-[5px] border border-[#d2d8e0] bg-white shadow-[0_4px_14px_rgba(20,30,45,0.14)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={run(() => printText(title, text))}
            className={item}
          >
            Print
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(() => copyText(text))}
            className={item}
          >
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(() => downloadText(filename, text))}
            className={item}
          >
            Download
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ExportMenu;
