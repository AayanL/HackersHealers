import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HealthMaintenance from "@/app/components/assistant/HealthMaintenance";
import type { HealthMaintenanceItem } from "@/lib/assistant";

const ITEMS: HealthMaintenanceItem[] = [
  {
    id: "breast",
    kind: "screening",
    status: "overdue",
    title: "Mammography (breast cancer screening)",
    detail: "last 2022-05 · every 36 mo",
    evidence: ["Procedure/proc-mammo-2022"],
    rule: "ctfphc-2018-breast",
  },
  {
    id: "pneumococcal",
    kind: "immunization",
    status: "due",
    title: "Pneumococcal vaccine",
    detail: "no record on file",
    evidence: ["no record on file"],
    rule: "naci-2024-pneumococcal",
  },
];

describe("HealthMaintenance", () => {
  it("renders nothing when there is nothing actionable", () => {
    const { container } = render(<HealthMaintenance items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each item with a count badge and its status", () => {
    render(<HealthMaintenance items={ITEMS} />);
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(
      screen.getByText("Mammography (breast cancer screening)"),
    ).toBeInTheDocument();
    expect(screen.getByText("overdue")).toBeInTheDocument();
    expect(screen.getByText("due")).toBeInTheDocument();
  });

  it("shows no action controls when no handlers are provided", () => {
    render(<HealthMaintenance items={ITEMS} />);
    expect(screen.queryByRole("button", { name: /Draft an order/ })).toBeNull();
  });

  it("fires onDraftOrder with the item when the Draft order button is clicked", () => {
    const onDraftOrder = vi.fn();
    render(<HealthMaintenance items={ITEMS} onDraftOrder={onDraftOrder} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Draft an order for Pneumococcal vaccine" }),
    );
    expect(onDraftOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pneumococcal" }),
    );
  });
});
