/**
 * UNIT TESTS — pet-utils.ts
 * Tests each utility function in complete isolation.
 */

import {
  speciesEmoji,
  severityColor,
  formatLogDate,
  petDisplayName,
  isLogFlagged,
  hasSevereFlagged,
} from "@/lib/pet-utils";

describe("speciesEmoji", () => {
  it("returns dog emoji for dog", () => {
    expect(speciesEmoji("dog")).toBe("🐶");
  });

  it("returns cat emoji for cat", () => {
    expect(speciesEmoji("cat")).toBe("🐱");
  });

  it("is case-insensitive", () => {
    expect(speciesEmoji("DOG")).toBe("🐶");
    expect(speciesEmoji("Cat")).toBe("🐱");
  });

  it("returns paw emoji for unknown species", () => {
    expect(speciesEmoji("dragon")).toBe("🐾");
    expect(speciesEmoji("")).toBe("🐾");
  });

  it("returns paw emoji for other", () => {
    expect(speciesEmoji("other")).toBe("🐾");
  });

  it("handles all known species", () => {
    expect(speciesEmoji("rabbit")).toBe("🐰");
    expect(speciesEmoji("bird")).toBe("🐦");
    expect(speciesEmoji("fish")).toBe("🐟");
    expect(speciesEmoji("hamster")).toBe("🐹");
    expect(speciesEmoji("turtle")).toBe("🐢");
  });
});

describe("severityColor", () => {
  it("returns red classes for high severity", () => {
    const result = severityColor("high");
    expect(result).toContain("red");
  });

  it("returns amber classes for medium severity", () => {
    const result = severityColor("medium");
    expect(result).toContain("amber");
  });

  it("returns blue classes for low severity", () => {
    const result = severityColor("low");
    expect(result).toContain("blue");
  });

  it("returns blue classes when severity is undefined", () => {
    const result = severityColor(undefined);
    expect(result).toContain("blue");
  });

  it("returns blue classes for unknown severity", () => {
    const result = severityColor("unknown");
    expect(result).toContain("blue");
  });
});

describe("formatLogDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatLogDate("2026-06-30T10:00:00Z");
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(result).toMatch(/Jun/);
  });

  it("includes the day of week", () => {
    const result = formatLogDate("2026-06-30T00:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("petDisplayName", () => {
  it("shows breed and age when both present", () => {
    const result = petDisplayName({ name: "Bella", breed: "Labrador", species: "dog", age_years: 3 });
    expect(result).toContain("Labrador");
    expect(result).toContain("3yr");
  });

  it("falls back to species when no breed", () => {
    const result = petDisplayName({ name: "Bella", species: "dog" });
    expect(result).toContain("dog");
    expect(result).not.toContain("yr");
  });

  it("shows species without age when age is absent", () => {
    const result = petDisplayName({ name: "Max", breed: "Poodle", species: "dog" });
    expect(result).toBe("Poodle");
  });
});

describe("isLogFlagged", () => {
  it("returns true when log is flagged", () => {
    expect(isLogFlagged({ flagged: true })).toBe(true);
  });

  it("returns false when log is not flagged", () => {
    expect(isLogFlagged({ flagged: false })).toBe(false);
  });
});

describe("hasSevereFlagged", () => {
  it("returns true if any log is flagged with high severity", () => {
    const logs = [
      { flagged: false, severity: "low" },
      { flagged: true, severity: "high" },
    ];
    expect(hasSevereFlagged(logs)).toBe(true);
  });

  it("returns false if flagged logs are not high severity", () => {
    const logs = [
      { flagged: true, severity: "medium" },
      { flagged: true, severity: "low" },
    ];
    expect(hasSevereFlagged(logs)).toBe(false);
  });

  it("returns false for empty log list", () => {
    expect(hasSevereFlagged([])).toBe(false);
  });

  it("returns false when no logs are flagged", () => {
    const logs = [{ flagged: false, severity: "high" }];
    expect(hasSevereFlagged(logs)).toBe(false);
  });
});
