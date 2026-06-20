import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Composer from "@/app/components/assistant/Composer";

describe("Composer", () => {
  it("renders suggestion chips", () => {
    render(<Composer />);
    expect(
      screen.getByRole("button", { name: "Summarize for handoff" }),
    ).toBeInTheDocument();
  });

  it("sends typed text and clears the input", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const input = screen.getByLabelText("Ask the assistant");
    fireEvent.change(input, { target: { value: "Why lisinopril?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("Why lisinopril?");
    expect(input).toHaveValue("");
  });

  it("sends a suggestion when its chip is clicked", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} suggestions={["Recent labs"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Recent labs" }));
    expect(onSend).toHaveBeenCalledWith("Recent labs");
  });

  it("does not send empty input", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).not.toHaveBeenCalled();
  });
});
