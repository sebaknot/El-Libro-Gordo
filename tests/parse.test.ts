import { describe, expect, it } from "vitest";
import {
  maskSsn,
  parseDate,
  parseEmail,
  parseMoney,
  parsePhone,
  parseSsn,
  sanitizeCell,
} from "../src/lib/import/parse";

describe("parseDate", () => {
  it("parses ISO dates", () => {
    expect(parseDate("1985-01-15")).toBe("1985-01-15");
    expect(parseDate("1985-1-5")).toBe("1985-01-05");
  });
  it("parses US dates, including 2-digit years", () => {
    expect(parseDate("1/15/1985")).toBe("1985-01-15");
    expect(parseDate("01-15-85")).toBe("1985-01-15");
    expect(parseDate("12/31/99")).toBe("1999-12-31");
  });
  it("flips to DD/MM when the first number can't be a month", () => {
    expect(parseDate("25/12/1990")).toBe("1990-12-25");
  });
  it("parses Excel serial dates (incl. the 1900 leap-year offset)", () => {
    expect(parseDate("29221")).toBe("1980-01-01");
    expect(parseDate("366")).toBeNull(); // before the plausible range
  });
  it("rejects impossible dates and garbage", () => {
    expect(parseDate("2/30/1990")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("parsePhone", () => {
  it("normalizes US numbers to E.164", () => {
    expect(parsePhone("(305) 555-0134")).toBe("+13055550134");
    expect(parsePhone("305.555.0134")).toBe("+13055550134");
    expect(parsePhone("1-305-555-0134")).toBe("+13055550134");
    expect(parsePhone("+52 55 1234 5678")).toBe("+525512345678");
  });
  it("rejects numbers that are too short or empty", () => {
    expect(parsePhone("555-0134")).toBeNull();
    expect(parsePhone("")).toBeNull();
  });
});

describe("parseSsn / maskSsn", () => {
  it("accepts exactly 9 digits, with or without dashes", () => {
    expect(parseSsn("123-45-6789")).toBe("123456789");
    expect(parseSsn("123456789")).toBe("123456789");
    expect(parseSsn("12345678")).toBeNull();
    expect(parseSsn("1234567890")).toBeNull();
  });
  it("masks to last-4 only", () => {
    expect(maskSsn("6789")).toBe("***-**-6789");
    expect(maskSsn(null)).toBe("—");
  });
});

describe("parseEmail / parseMoney", () => {
  it("validates emails and lowercases them", () => {
    expect(parseEmail("Maria@Example.COM")).toBe("maria@example.com");
    expect(parseEmail("not-an-email")).toBeNull();
  });
  it("reads money with $ and commas", () => {
    expect(parseMoney("$45,000.50")).toBe(45000.5);
    expect(parseMoney("precio")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
  });
});

describe("sanitizeCell — formula injection", () => {
  it("neutralizes leading formula characters", () => {
    expect(sanitizeCell("=SUM(A1:A9)")).toEqual({ value: "SUM(A1:A9)", neutralized: true });
    expect(sanitizeCell("+cmd|' /c calc'!A0")).toMatchObject({ neutralized: true });
    expect(sanitizeCell("@everyone")).toEqual({ value: "everyone", neutralized: true });
  });
  it("keeps ordinary values, trims, strips control characters", () => {
    expect(sanitizeCell("  Maria\u0007 ")).toEqual({ value: "Maria", neutralized: false });
    expect(sanitizeCell("O'Brien")).toEqual({ value: "O'Brien", neutralized: false });
  });
  it("does not mangle negative numbers but does neutralize '-text'", () => {
    expect(sanitizeCell("-5").value).toBe("-5");
    expect(sanitizeCell("-rm -rf").neutralized).toBe(true);
  });
  it("caps absurdly long cells", () => {
    expect(sanitizeCell("x".repeat(1000)).value.length).toBe(200);
  });
});
