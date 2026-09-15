import { describe, it, expect } from "vitest";
import { extractJson, validateTags, type InferredTags } from "./ai-tagging";

describe("extractJson", () => {
  it("strips a ```json fenced block", () => {
    const input = '```json\n{"a": 1}\n```';
    expect(extractJson(input)).toBe('{"a": 1}');
  });

  it("strips a plain ``` fenced block with no language tag", () => {
    const input = '```\n{"a": 1}\n```';
    expect(extractJson(input)).toBe('{"a": 1}');
  });

  it("returns plain JSON text unchanged", () => {
    const input = '{"a": 1}';
    expect(extractJson(input)).toBe('{"a": 1}');
  });

  it("trims surrounding whitespace", () => {
    const input = '   {"a": 1}   ';
    expect(extractJson(input)).toBe('{"a": 1}');
  });
});

describe("validateTags", () => {
  const validInput: InferredTags = {
    noise_level: 3,
    outlets: "plenty",
    wifi_quality: "fast",
    seating_type: ["tables", "couches"],
    vibe_tags: ["cozy", "minimal"],
  };

  it("passes through fully valid input unchanged", () => {
    expect(validateTags(validInput)).toEqual(validInput);
  });

  it("rejects an out-of-range noise_level", () => {
    expect(validateTags({ ...validInput, noise_level: 7 }).noise_level).toBeNull();
  });

  it("rejects a non-integer noise_level", () => {
    expect(validateTags({ ...validInput, noise_level: 2.5 }).noise_level).toBeNull();
  });

  it("rejects an invalid outlets value", () => {
    expect(validateTags({ ...validInput, outlets: "lots" }).outlets).toBeNull();
  });

  it("rejects an invalid wifi_quality value", () => {
    expect(validateTags({ ...validInput, wifi_quality: "great" }).wifi_quality).toBeNull();
  });

  it("rejects a seating_type array containing an invalid value", () => {
    expect(
      validateTags({ ...validInput, seating_type: ["tables", "floor"] }).seating_type
    ).toBeNull();
  });

  it("rejects a vibe_tags array containing an invalid value", () => {
    expect(
      validateTags({ ...validInput, vibe_tags: ["cozy", "loud"] }).vibe_tags
    ).toBeNull();
  });

  it("passes null fields through as null", () => {
    const allNull: InferredTags = {
      noise_level: null,
      outlets: null,
      wifi_quality: null,
      seating_type: null,
      vibe_tags: null,
    };
    expect(validateTags(allNull)).toEqual(allNull);
  });
});
