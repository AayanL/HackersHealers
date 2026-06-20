import type { ChatMessage } from "@/lib/assistant";
import { CardRenderer } from "./cards/CardRenderer";

function CitationChips({ citations }: { citations: string[] }) {
  return (
    <div className="flex flex-wrap gap-[5px]">
      {citations.map((c) => (
        <span
          key={c}
          className="rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[7px] py-[3px] font-mono text-[10px] text-[#2756e6]"
        >
          [{c}]
        </span>
      ))}
    </div>
  );
}

export function Conversation({
  messages,
  pending = false,
}: {
  messages: ChatMessage[];
  pending?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-[14px] overflow-y-auto p-[14px]">
      {messages.map((m) =>
        m.role === "user" ? (
          <div
            key={m.id}
            className="max-w-[84%] self-end rounded-[6px] bg-[#2756e6] px-3 py-2 text-[12.5px] leading-[1.45] text-white"
          >
            {m.text}
          </div>
        ) : (
          <div key={m.id} className="flex flex-col gap-[7px]">
            <div className="text-[13px] leading-[1.5] text-[#1f242b]">
              {m.text}
            </div>
            {m.card ? <CardRenderer card={m.card} /> : null}
            {m.citations && m.citations.length > 0 ? (
              <CitationChips citations={m.citations} />
            ) : null}
          </div>
        ),
      )}
      {pending ? (
        <div
          role="status"
          className="self-start font-mono text-[11px] text-[#8a93a2]"
        >
          thinking…
        </div>
      ) : null}
    </div>
  );
}

export default Conversation;
