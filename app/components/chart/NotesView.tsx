"use client";

import { ChartPage, DraftButton, EmptyState } from "./ChartPage";

export function NotesView({ onDraft }: { onDraft?: () => void }) {
  return (
    <ChartPage title="Notes">
      <EmptyState
        action={
          onDraft ? (
            <DraftButton onClick={onDraft}>Draft a note</DraftButton>
          ) : undefined
        }
      >
        No progress notes on file for this patient. The assistant can draft a
        SOAP note grounded in the chart — review and sign before it&apos;s
        entered.
      </EmptyState>
    </ChartPage>
  );
}

export default NotesView;
