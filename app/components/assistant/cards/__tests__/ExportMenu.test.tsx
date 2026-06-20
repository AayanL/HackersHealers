import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExportMenu from "@/app/components/assistant/cards/ExportMenu";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExportMenu", () => {
  it("opens a dropdown with Print, Copy, and Download", () => {
    render(<ExportMenu filename="x.txt" title="Doc" text="hello" />);
    // Closed initially — the items are not in the DOM.
    expect(screen.queryByRole("menuitem", { name: "Print" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menuitem", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Download" }),
    ).toBeInTheDocument();
  });

  it("copies the text and closes the menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ExportMenu filename="x.txt" title="Doc" text="hello world" />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("hello world");
    // Menu closes after an action.
    expect(screen.queryByRole("menuitem", { name: "Copy" })).toBeNull();
  });

  it("opens a print window for the Print action", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<ExportMenu filename="x.txt" title="Doc" text="print me" />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Print" }));
    expect(open).toHaveBeenCalled();
  });
});
