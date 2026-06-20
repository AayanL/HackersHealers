import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/assistant";
import Conversation from "@/app/components/assistant/Conversation";

describe("Conversation", () => {
  it("renders user bubbles and assistant text with citations", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", text: "Why lisinopril?" },
      {
        id: "a1",
        role: "assistant",
        text: "Active for hypertension.",
        citations: ["MedicationRequest/lisinopril"],
      },
    ];
    render(<Conversation messages={messages} />);
    expect(screen.getByText("Why lisinopril?")).toBeInTheDocument();
    expect(screen.getByText("Active for hypertension.")).toBeInTheDocument();
    expect(
      screen.getByText("[MedicationRequest/lisinopril]"),
    ).toBeInTheDocument();
  });

  it("renders an assistant message's typed tool-result card", () => {
    const messages: ChatMessage[] = [
      {
        id: "a2",
        role: "assistant",
        text: "Here's the reconciliation.",
        card: {
          kind: "reconcile",
          findings: [
            {
              id: "g1",
              type: "gap",
              severity: "moderate",
              title: "Metformin without diagnosis",
              meds: ["MedicationRequest/metformin"],
            },
          ],
        },
      },
    ];
    render(<Conversation messages={messages} />);
    expect(screen.getByTestId("reconcile-card")).toBeInTheDocument();
    expect(
      screen.getByText("Metformin without diagnosis"),
    ).toBeInTheDocument();
  });

  it("shows a pending indicator while awaiting a reply", () => {
    render(<Conversation messages={[]} pending />);
    expect(screen.getByRole("status")).toHaveTextContent("thinking…");
  });
});
