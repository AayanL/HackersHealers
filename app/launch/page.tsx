"use client";

import { useEffect, useState } from "react";
import { smartAuthorize } from "@/lib/smart";

export default function LaunchPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    smartAuthorize("/").catch((e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#16202e] font-mono text-[13px] text-[#a8b4c4]">
      <div className="flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.01em] text-white">
        <span aria-hidden className="h-4 w-4 rounded-[3px] bg-[#2756e6]" />
        VERA<span className="font-semibold text-[#5d6b7e]">/ehr</span>
      </div>
      {error ? (
        <p className="max-w-md text-center text-[#e8a93b]">
          Launch failed: {error}
        </p>
      ) : (
        <p>Authorizing with the EHR…</p>
      )}
    </main>
  );
}
