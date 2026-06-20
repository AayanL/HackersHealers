import type { CardData } from "@/lib/assistant";
import { BillingCard } from "./BillingCard";
import { DraftOrderCard } from "./DraftOrderCard";
import { FormCard } from "./FormCard";
import { GuidelineCard } from "./GuidelineCard";
import { NoteCard } from "./NoteCard";
import { ReconcileCard } from "./ReconcileCard";
import { SummaryCard } from "./SummaryCard";
import { TrendCard } from "./TrendCard";

export interface CardCitationProps {
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}

/**
 * Projects a typed CardData payload onto its renderer. The exhaustive switch
 * means adding a card kind is a compile error until it's handled here. The
 * citation props let every ref a card shows render as the same clickable chip
 * the surrounding prose uses.
 */
export function CardRenderer({
  card,
  citationLabels,
  onCitationClick,
}: { card: CardData } & CardCitationProps) {
  const cite = { citationLabels, onCitationClick };
  switch (card.kind) {
    case "reconcile":
      return <ReconcileCard data={card} {...cite} />;
    case "trend":
      return <TrendCard data={card} {...cite} />;
    case "draftOrder":
      return <DraftOrderCard data={card} />;
    case "guideline":
      return <GuidelineCard data={card} {...cite} />;
    case "summary":
      return <SummaryCard data={card} {...cite} />;
    case "note":
      return <NoteCard data={card} {...cite} />;
    case "billing":
      return <BillingCard data={card} {...cite} />;
    case "form":
      return <FormCard data={card} {...cite} />;
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}

export default CardRenderer;
