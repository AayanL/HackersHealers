import { describe, expect, it } from "vitest";
import { formatQuantity } from "@/lib/format";

describe("formatQuantity", () => {
  it("rounds absurd Synthea float precision to a few significant figures", () => {
    expect(formatQuantity(15.125706291650257)).toBe("15.1");
    expect(formatQuantity(12.123504273625288)).toBe("12.1");
  });

  it("trims trailing zeros and leaves clean values untouched", () => {
    expect(formatQuantity(5.3)).toBe("5.3");
    expect(formatQuantity(5.0)).toBe("5");
    expect(formatQuantity(142)).toBe("142");
  });

  it("keeps enough precision for small magnitudes", () => {
    expect(formatQuantity(0.84)).toBe("0.84");
    expect(formatQuantity(0.007123)).toBe("0.00712");
  });

  it("passes through non-finite values rather than throwing", () => {
    expect(formatQuantity(Number.NaN)).toBe("NaN");
    expect(formatQuantity(0)).toBe("0");
  });
});
