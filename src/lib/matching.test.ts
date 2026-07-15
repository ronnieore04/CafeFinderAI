import { describe, it, expect } from "vitest";
import { matchScore, meetsHardConstraints, type CafeTags, type UserPreferences } from "./matching";

const quietWorkPrefs: UserPreferences = {
  maxNoiseLevel: 2,
  minOutlets: "plenty",
  minWifiQuality: "fast",
  preferredVibeTags: ["minimal", "quiet"],
};

const goodWorkCafe: CafeTags = {
  noiseLevel: 2,
  outlets: "plenty",
  wifiQuality: "fast",
  vibeTags: ["minimal", "cozy"],
};

const loudCafe: CafeTags = {
  noiseLevel: 5,
  outlets: "plenty",
  wifiQuality: "fast",
  vibeTags: ["lively", "artsy"],
};

describe("meetsHardConstraints", () => {
  it("passes when a cafe meets all constraints", () => {
    expect(meetsHardConstraints(goodWorkCafe, quietWorkPrefs)).toBe(true);
  });

  it("fails when noise level exceeds the max", () => {
    expect(meetsHardConstraints(loudCafe, quietWorkPrefs)).toBe(false);
  });

  it("fails when outlets don't meet the minimum", () => {
    const fewOutlets: CafeTags = { ...goodWorkCafe, outlets: "some" };
    expect(meetsHardConstraints(fewOutlets, quietWorkPrefs)).toBe(false);
  });
});

describe("matchScore", () => {
  it("returns 0 if hard constraints aren't met", () => {
    expect(matchScore(loudCafe, quietWorkPrefs)).toBe(0);
  });

  it("returns partial overlap score for partial vibe match", () => {
    // goodWorkCafe has 1 of 2 preferred vibe tags ("minimal")
    expect(matchScore(goodWorkCafe, quietWorkPrefs)).toBeCloseTo(0.5);
  });

  it("returns 1 for full vibe tag overlap", () => {
    const perfectMatch: CafeTags = { ...goodWorkCafe, vibeTags: ["minimal", "quiet"] };
    expect(matchScore(perfectMatch, quietWorkPrefs)).toBe(1);
  });

  it("returns 1 when the user has no vibe preferences, as long as constraints pass", () => {
    const noVibePrefs: UserPreferences = { ...quietWorkPrefs, preferredVibeTags: [] };
    expect(matchScore(goodWorkCafe, noVibePrefs)).toBe(1);
  });
});
