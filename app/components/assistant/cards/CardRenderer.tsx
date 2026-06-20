import type { CardData } from "@/lib/assistant";
import { DraftOrderCard } from "./DraftOrderCard";
import { GuidelineCard } from "./GuidelineCard";
import { NoteCard } from "./NoteCard";
import { ReconcileCard } from "./ReconcileCard";
import { SummaryCard } from "./SummaryCard";
import { TrendCard } from "./TrendCard";

/**
 * Projects a typed CardData payload onto its renderer. The exhaustive switch
 * means adding a card kind is a compile error until it's handled here.
 */
export function CardRenderer({ card }: { card: CardData }) {
  switch (card.kind) {
    case "reconcile":
      return <ReconcileCard data={card} />;
    case "trend":
      return <TrendCard data={card} />;
    case "draftOrder":
      return <DraftOrderCard data={card} />;
    case "guideline":
      return <GuidelineCard data={card} />;
    case "summary":
      return <SummaryCard data={card} />;
    case "note":
      return <NoteCard data={card} />;
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}

export default CardRenderer;
