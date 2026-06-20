import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DraftOrderCardData } from "@/lib/assistant";
import DraftOrderCard from "@/app/components/assistant/cards/DraftOrderCard";

const data: DraftOrderCardData = {
  kind: "draftOrder",
  orderType: "lab",
  title: "Basic Metabolic Panel",
  code: "LOINC 51990-0",
  fields: [
    { label: "Priority", value: "Routine" },
    { label: "Collect", value: "2026-06-26" },
    { label: "Reason", value: "Recheck elevated potassium (5.3)" },
  ],
  safety: ["No known interactions with active meds."],
};

describe("DraftOrderCard", () => {
  it("opens in an unsigned draft state with its fields", () => {
    render(<DraftOrderCard data={data} />);
    expect(screen.getByTestId("draft-status")).toHaveTextContent(
      "DRAFT — not signed",
    );
    expect(screen.getByText("Basic Metabolic Panel")).toBeInTheDocument();
    expect(screen.getByText("2026-06-26")).toBeInTheDocument();
  });

  it("flips to confirmed and invokes onConfirm on explicit click", () => {
    const onConfirm = vi.fn();
    render(<DraftOrderCard data={data} onConfirm={onConfirm} />);
    fireEvent.click(
      screen.getByRole("button", { name: /confirm & open order/i }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("draft-status")).toHaveTextContent("CONFIRMED");
    // Action buttons are gone once confirmed — it cannot be re-submitted.
    expect(
      screen.queryByRole("button", { name: /confirm & open order/i }),
    ).not.toBeInTheDocument();
  });

  it("flips to rejected and invokes onReject", () => {
    const onReject = vi.fn();
    render(<DraftOrderCard data={data} onReject={onReject} />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("draft-status")).toHaveTextContent(
      "DRAFT REJECTED",
    );
  });

  it("offers an Edit affordance", () => {
    render(<DraftOrderCard data={data} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
