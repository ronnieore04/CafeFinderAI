import { describe, it, expect } from "vitest";
import { toPriceLevel } from "./places";

describe("toPriceLevel", () => {
  it("maps PRICE_LEVEL_FREE to 0", () => {
    expect(toPriceLevel("PRICE_LEVEL_FREE")).toBe(0);
  });

  it("maps PRICE_LEVEL_INEXPENSIVE to 1", () => {
    expect(toPriceLevel("PRICE_LEVEL_INEXPENSIVE")).toBe(1);
  });

  it("maps PRICE_LEVEL_MODERATE to 2", () => {
    expect(toPriceLevel("PRICE_LEVEL_MODERATE")).toBe(2);
  });

  it("maps PRICE_LEVEL_EXPENSIVE to 3", () => {
    expect(toPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe(3);
  });

  it("maps PRICE_LEVEL_VERY_EXPENSIVE to 4", () => {
    expect(toPriceLevel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe(4);
  });

  it("maps PRICE_LEVEL_UNSPECIFIED to null", () => {
    expect(toPriceLevel("PRICE_LEVEL_UNSPECIFIED")).toBeNull();
  });

  it("maps undefined to null", () => {
    expect(toPriceLevel(undefined)).toBeNull();
  });
});
