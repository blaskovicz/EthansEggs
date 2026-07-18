import { describe, expect, it } from "vitest";
import { formatCents, formatDate, formatDateTime } from "./format";

describe("formatCents", () => {
  it("formats a positive amount as dollars", () => {
    expect(formatCents(1250)).toBe("$12.50");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats a negative amount with a leading minus sign", () => {
    expect(formatCents(-500)).toBe("-$5.00");
  });

  it("pads to two decimal places", () => {
    expect(formatCents(100)).toBe("$1.00");
    expect(formatCents(5)).toBe("$0.05");
  });
});

describe("formatDate", () => {
  it("formats a YYYY-MM-DD string as a local calendar day, not UTC-shifted", () => {
    // 2026-07-18 must render as July 18, regardless of the runner's timezone -
    // this guards against the classic `new Date("2026-07-18")` UTC-parsing bug.
    const result = formatDate("2026-07-18");
    expect(result).toContain("Jul");
    expect(result).toContain("18");
  });
});

describe("formatDateTime", () => {
  it("includes month, day, and time", () => {
    const result = formatDateTime("2026-07-18T14:30:00");
    expect(result).toContain("Jul");
    expect(result).toContain("18");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
