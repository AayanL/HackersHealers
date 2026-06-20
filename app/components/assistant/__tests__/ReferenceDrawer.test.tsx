import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReferenceDrawer from "@/app/components/assistant/ReferenceDrawer";
import type { ResourceDetail } from "@/lib/resources";

const resource: ResourceDetail = {
  ref: "MedicationRequest/55b5db91",
  type: "MedicationRequest",
  title: "Nitroglycerin 0.4 mg",
  fields: [
    { label: "Status", value: "active" },
    { label: "Indication", value: "— none charted" },
  ],
};

describe("ReferenceDrawer", () => {
  it("renders nothing when no resource is selected", () => {
    const { container } = render(
      <ReferenceDrawer resource={null} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the resource title, fields, and raw reference", () => {
    render(<ReferenceDrawer resource={resource} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nitroglycerin 0.4 mg")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("MedicationRequest/55b5db91")).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(<ReferenceDrawer resource={resource} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close reference" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose from the backdrop", () => {
    const onClose = vi.fn();
    render(<ReferenceDrawer resource={resource} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("drawer-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<ReferenceDrawer resource={resource} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on open", () => {
    render(<ReferenceDrawer resource={resource} onClose={() => {}} />);
    // The close button is the first focusable inside the dialog.
    expect(screen.getByRole("button", { name: "Close reference" })).toHaveFocus();
  });
});
