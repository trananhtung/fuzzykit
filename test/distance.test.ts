import { levenshtein, damerauLevenshtein, jaro, jaroWinkler, similarity, damerauSimilarity } from "../src/index.js";

// ── Levenshtein ────────────────────────────────────────────────────────────

describe("levenshtein()", () => {
  test("identical strings = 0", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
    expect(levenshtein("", "")).toBe(0);
  });

  test("empty string distance", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  test("single insertion", () => {
    expect(levenshtein("cat", "cats")).toBe(1);
    expect(levenshtein("receive", "recieve")).toBe(2); // NOT 1 — swap counts as 2 in Levenshtein
  });

  test("single substitution", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1);
    expect(levenshtein("a", "b")).toBe(1);
  });

  test("classic kitten → sitting", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  test("distance is symmetric", () => {
    expect(levenshtein("abc", "xyz")).toBe(levenshtein("xyz", "abc"));
    expect(levenshtein("kitten", "sitting")).toBe(levenshtein("sitting", "kitten"));
  });

  test("completely different strings = max possible", () => {
    expect(levenshtein("abc", "xyz")).toBe(3);
  });
});

// ── Damerau-Levenshtein ────────────────────────────────────────────────────

describe("damerauLevenshtein()", () => {
  test("identical strings = 0", () => {
    expect(damerauLevenshtein("hello", "hello")).toBe(0);
  });

  test("transposition counts as 1", () => {
    expect(damerauLevenshtein("ab", "ba")).toBe(1);
    expect(damerauLevenshtein("receive", "recieve")).toBe(1); // ie transposition
    expect(damerauLevenshtein("teh", "the")).toBe(1);
  });

  test("standard edit ops still work", () => {
    expect(damerauLevenshtein("kitten", "sitting")).toBe(3);
    expect(damerauLevenshtein("", "abc")).toBe(3);
    expect(damerauLevenshtein("abc", "")).toBe(3);
  });

  test("one more than levenshtein for transposed strings", () => {
    // Levenshtein needs 2 ops (delete + insert or 2 subs) for transposition
    // Damerau needs only 1
    const a = "ca", b = "ac";
    expect(levenshtein(a, b)).toBe(2);
    expect(damerauLevenshtein(a, b)).toBe(1);
  });

  test("symmetric", () => {
    expect(damerauLevenshtein("abc", "bac")).toBe(damerauLevenshtein("bac", "abc"));
  });

  test("multiple transpositions", () => {
    expect(damerauLevenshtein("abcdef", "badcfe")).toBe(3); // ab↔ba, cd↔dc, ef↔fe
  });
});

// ── Jaro ──────────────────────────────────────────────────────────────────

describe("jaro()", () => {
  test("identical strings = 1", () => {
    expect(jaro("hello", "hello")).toBe(1);
    expect(jaro("", "")).toBe(1);
  });

  test("completely different = 0", () => {
    expect(jaro("abc", "xyz")).toBe(0);
  });

  test("classic Martha / Marhta", () => {
    // Known example from Jaro's 1989 paper
    const score = jaro("MARTHA", "MARHTA");
    expect(score).toBeCloseTo(0.944, 2);
  });

  test("DWAYNE / DUANE", () => {
    expect(jaro("DWAYNE", "DUANE")).toBeCloseTo(0.822, 2);
  });
});

// ── Jaro-Winkler ──────────────────────────────────────────────────────────

describe("jaroWinkler()", () => {
  test("identical strings = 1", () => {
    expect(jaroWinkler("hello", "hello")).toBe(1);
  });

  test("MARTHA / MARHTA — boost from common prefix MA", () => {
    const jScore = jaro("MARTHA", "MARHTA");
    const jwScore = jaroWinkler("MARTHA", "MARHTA");
    expect(jwScore).toBeGreaterThan(jScore);
    expect(jwScore).toBeCloseTo(0.961, 2);
  });

  test("DWAYNE / DUANE", () => {
    expect(jaroWinkler("DWAYNE", "DUANE")).toBeCloseTo(0.84, 2);
  });

  test("no common prefix = same as jaro", () => {
    const a = "xyz", b = "abc";
    expect(jaroWinkler(a, b)).toBe(jaro(a, b));
  });
});

// ── similarity / damerauSimilarity ────────────────────────────────────────

describe("similarity()", () => {
  test("identical = 1", () => expect(similarity("abc", "abc")).toBe(1));
  test("empty strings = 1", () => expect(similarity("", "")).toBe(1));
  test("range 0..1", () => {
    const s = similarity("kitten", "sitting");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    expect(s).toBeCloseTo(1 - 3 / 7, 5);
  });
});

describe("damerauSimilarity()", () => {
  test("transposition gives higher score than Levenshtein", () => {
    const dl = damerauSimilarity("receive", "recieve");
    const l = similarity("receive", "recieve");
    expect(dl).toBeGreaterThan(l);
  });
  test("identical = 1", () => expect(damerauSimilarity("abc", "abc")).toBe(1));
});
