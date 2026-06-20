import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChartSidebar from "@/app/components/ChartSidebar";

describe("ChartSidebar", () => {
  it("marks the active chart section with aria-current", () => {
    render(<ChartSidebar active="Medications" />);
    const meds = screen.getByRole("button", { name: /Medications/i });
    expect(meds).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: /Snapshot/i }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renders section counts", () => {
    render(<ChartSidebar />);
    expect(
      screen.getByRole("button", { name: /Problems/i }),
    ).toHaveTextContent("3");
  });

  it("calls onSelect when a section is clicked", () => {
    const onSelect = vi.fn();
    render(<ChartSidebar onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Results/i }));
    expect(onSelect).toHaveBeenCalledWith("Results");
  });
});
