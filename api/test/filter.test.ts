import { describe, expect, it } from "vitest";
import { filterText, normalizeSpokenDigits } from "../src/privacy/filter.js";

describe("SSN masking", () => {
  it.each([
    "my ssn is 123-45-6789",
    "it's 123 45 6789",
    "123456789",
    "number 123.45.6789 ok",
    "123 456 789",
  ])("masks %s", (s) => {
    const r = filterText(s);
    expect(r.masked).toBe(true);
    expect(r.kinds).toContain("ssn");
    expect(r.text).not.toMatch(/\d{4}/);
  });

  it("masks spoken digits from a voice transcript", () => {
    const r = filterText("my social is one two three four five six seven eight nine");
    expect(r.masked).toBe(true);
    expect(r.text).toContain("[SSN removed]");
  });

  it.each([
    "my phone is 504-555-1234",
    "(504) 555-1234",
    "I get $1,180 a month",
    "born 01/15/1952",
    "I paid $1,300 on 10/12/2026",
    "oh, I see. one more question for you",
    "zip 70821-9278",
  ])("leaves %s alone", (s) => {
    const r = filterText(s);
    expect(r.masked).toBe(false);
    expect(r.text).toBe(s);
  });
});

describe("Medicare number (MBI) masking", () => {
  it.each([
    "1EG4-TE5-MK73",
    "my number is 1EG4TE5MK73",
    "1eg4-te5-mk73",
    "1 E G 4 T E 5 M K 7 3",
    "it is 1EG4 TE5 MK73 thanks",
  ])("masks %s", (s) => {
    const r = filterText(s);
    expect(r.masked).toBe(true);
    expect(r.kinds).toContain("mbi");
    expect(r.text).not.toMatch(/MK73/i);
  });

  it("does not match a mock MBI that uses an excluded letter (so mocks are visibly fake)", () => {
    // S, L, O, I, B, Z are never used in real MBIs; Leigh's mock cards should use one
    expect(filterText("1SL4-TE5-MK73").kinds).not.toContain("mbi");
  });

  it("gives one combined notice when both appear", () => {
    const r = filterText("ssn 123-45-6789 and medicare 1EG4-TE5-MK73");
    expect(r.kinds.sort()).toEqual(["mbi", "ssn"]);
    expect(r.notice).toMatch(/Social Security or Medicare/);
  });
});

describe("normalizeSpokenDigits", () => {
  it("converts long runs only", () => {
    expect(normalizeSpokenDigits("one two three four")).toMatch(/1234/);
    expect(normalizeSpokenDigits("I have two cars")).toBe("I have two cars");
  });
});
