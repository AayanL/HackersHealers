import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Markdown from "@/app/components/assistant/Markdown";

describe("Markdown", () => {
  it("renders **bold** as a <strong>", () => {
    render(<Markdown text="Active **without** an indication." />);
    expect(screen.getByText("without").tagName).toBe("STRONG");
  });

  it("renders a dashed list as list items", () => {
    render(<Markdown text={"- **S:** 62M\n- **B:** one med"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("S: 62M");
  });

  it("separates blank-line-delimited paragraphs", () => {
    const { container } = render(<Markdown text={"First line.\n\nSecond line."} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("renders inline `code` as a <code> element", () => {
    render(<Markdown text="Query `Observation?code=2823-3` ran." />);
    expect(screen.getByText("Observation?code=2823-3").tagName).toBe("CODE");
  });

  it("keeps a single line of plain prose intact", () => {
    render(<Markdown text="Drafted — please review and sign." />);
    expect(
      screen.getByText("Drafted — please review and sign."),
    ).toBeInTheDocument();
  });

  it("renders a citation as a bracketed chip with the full ref on hover", () => {
    render(
      <Markdown
        text="Active [MedicationRequest/55b5db91]."
        citationLabels={{ "MedicationRequest/55b5db91": "Nitroglycerin 0.4 mg" }}
      />,
    );
    const chip = screen.getByText("[Nitroglycerin 0.4 mg]");
    expect(chip).toHaveAttribute("title", "MedicationRequest/55b5db91");
    // The raw bracketed id is no longer shown as prose.
    expect(
      screen.queryByText("[MedicationRequest/55b5db91]"),
    ).not.toBeInTheDocument();
  });

  it("makes a citation clickable when a handler is provided", () => {
    const onCitationClick = vi.fn();
    render(
      <Markdown
        text="Active [MedicationRequest/55b5db91]."
        citationLabels={{ "MedicationRequest/55b5db91": "Nitroglycerin 0.4 mg" }}
        onCitationClick={onCitationClick}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open reference MedicationRequest/55b5db91",
      }),
    );
    expect(onCitationClick).toHaveBeenCalledWith("MedicationRequest/55b5db91");
  });

  it("falls back to a shortened ref when the citation is unknown", () => {
    render(<Markdown text="See [Observation/abcdef1234567890]." />);
    expect(screen.getByText("[Observation/abcdef12…]")).toBeInTheDocument();
  });
});
