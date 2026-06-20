"use client";

import { ChartPage, DraftButton, EmptyState } from "./ChartPage";

export function OrdersView({ onDraft }: { onDraft?: () => void }) {
  return (
    <ChartPage title="Orders">
      <EmptyState
        action={
          onDraft ? (
            <DraftButton onClick={onDraft}>Draft an order</DraftButton>
          ) : undefined
        }
      >
        No active or pending orders for this patient. The assistant can draft a
        lab or medication order — nothing is placed until you confirm and sign.
      </EmptyState>
    </ChartPage>
  );
}

export default OrdersView;
