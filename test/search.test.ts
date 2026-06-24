import { fuzzySearch, fuzzySearchBy, bestMatch, isMatch } from "../src/index.js";

describe("fuzzySearch()", () => {
  const fruits = ["apple", "apricot", "banana", "cherry", "blueberry", "grape"];

  test("exact match scores highest", () => {
    const results = fuzzySearch("apple", fruits);
    expect(results[0].item).toBe("apple");
    expect(results[0].score).toBe(1);
    expect(results[0].distance).toBe(0);
  });

  test("close typo returned", () => {
    const results = fuzzySearch("aple", fruits); // missing p
    const items = results.map(r => r.item);
    expect(items[0]).toBe("apple");
    expect(results[0].distance).toBeLessThanOrEqual(2);
  });

  test("case-insensitive by default", () => {
    const results = fuzzySearch("APPLE", fruits);
    expect(results[0].item).toBe("apple");
  });

  test("case-sensitive option", () => {
    const results = fuzzySearch("APPLE", fruits, { caseSensitive: true });
    // "APPLE" vs "apple" is distance 5 (all chars differ in case)
    // Lower scores expected
    expect(results.every(r => r.score < 1)).toBe(true);
  });

  test("maxDistance filter", () => {
    const results = fuzzySearch("xyz", fruits, { maxDistance: 2 });
    // All fruits are >= 3 edits away from "xyz"
    expect(results).toHaveLength(0);
  });

  test("minScore filter", () => {
    const results = fuzzySearch("apple", fruits, { minScore: 0.9 });
    expect(results.every(r => r.score >= 0.9)).toBe(true);
  });

  test("limit option", () => {
    const results = fuzzySearch("a", fruits, { limit: 2 });
    expect(results).toHaveLength(2);
  });

  test("results sorted by score descending", () => {
    const results = fuzzySearch("appl", fruits);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  test("empty candidates returns empty", () => {
    expect(fuzzySearch("apple", [])).toEqual([]);
  });

  test("transposition handled (recieve → receive)", () => {
    const dict = ["receive", "believe", "relieve", "conceive"];
    const results = fuzzySearch("recieve", dict);
    expect(results[0].item).toBe("receive");
    expect(results[0].distance).toBe(1); // single transposition
  });
});

describe("fuzzySearchBy()", () => {
  interface User { id: number; name: string; email: string }
  const users: User[] = [
    { id: 1, name: "John Smith", email: "john@example.com" },
    { id: 2, name: "Jane Doe", email: "jane@example.com" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com" },
    { id: 4, name: "Alice Williams", email: "alice@example.com" },
  ];

  test("search by name field", () => {
    const results = fuzzySearchBy("Jon", users, u => u.name);
    expect(results[0].item.name).toBe("John Smith");
  });

  test("search by email field", () => {
    const results = fuzzySearchBy("jne@example.com", users, u => u.email);
    expect(results[0].item.email).toBe("jane@example.com");
  });

  test("returns full object", () => {
    const results = fuzzySearchBy("Alice", users, u => u.name, { limit: 1 });
    expect(results[0].item).toEqual({ id: 4, name: "Alice Williams", email: "alice@example.com" });
  });

  test("limit works on objects", () => {
    const results = fuzzySearchBy("J", users, u => u.name, { limit: 2 });
    expect(results).toHaveLength(2);
  });
});

describe("bestMatch()", () => {
  test("returns closest match", () => {
    const result = bestMatch("helo", ["hello", "world", "help"]);
    expect(result).toBeDefined();
    expect(result!.item).toBe("hello");
  });

  test("returns undefined for empty candidates", () => {
    expect(bestMatch("test", [])).toBeUndefined();
  });

  test("exact match wins", () => {
    const result = bestMatch("world", ["world", "word", "words"]);
    expect(result!.item).toBe("world");
    expect(result!.score).toBe(1);
  });
});

describe("isMatch()", () => {
  test("exact match", () => {
    expect(isMatch("hello", "hello")).toBe(true);
    expect(isMatch("Hello", "hello")).toBe(true); // case-insensitive
  });

  test("single typo matches with default threshold", () => {
    expect(isMatch("helo", "hello")).toBe(true);
    expect(isMatch("wrold", "world")).toBe(true); // transposition
  });

  test("two typos don't match with default threshold", () => {
    expect(isMatch("hllo", "hello")).toBe(true); // distance=1
    expect(isMatch("hlo", "hello")).toBe(false);  // distance=2
  });

  test("custom maxDistance", () => {
    expect(isMatch("kitten", "sitting", 3)).toBe(true);
    expect(isMatch("kitten", "sitting", 2)).toBe(false);
  });

  test("empty strings", () => {
    expect(isMatch("", "")).toBe(true);
    expect(isMatch("a", "", 0)).toBe(false);
  });

  test("early exit for length difference exceeding maxDistance", () => {
    expect(isMatch("a", "abcdefgh", 1)).toBe(false);
  });
});

describe("Jaro-Winkler scoring option", () => {
  test("useJaroWinkler option changes scores for non-exact matches", () => {
    const words = ["Martha", "Martin", "Marta", "Mars"];
    // Use a typo so neither algorithm scores 1.0 for top result
    const damerau = fuzzySearch("Martah", words);  // transposition
    const jw = fuzzySearch("Martah", words, { useJaroWinkler: true });
    // Scores differ between DL and JW for near-match
    const dlScore = damerau.find(r => r.item === "Martha")!.score;
    const jwScore = jw.find(r => r.item === "Martha")!.score;
    expect(dlScore).not.toBe(jwScore);
    // Both should rank Martha highly
    expect(damerau[0].item).toBe("Martha");
    expect(jw[0].item).toBe("Martha");
  });
});

describe("Real-world: spell checker", () => {
  const dictionary = [
    "definitely", "necessary", "occurrence", "accommodate", "separate",
    "receive", "believe", "friend", "piece", "weird"
  ];

  const typos: [string, string][] = [
    ["definately", "definitely"],
    ["neccesary", "necessary"],
    ["ocurrence", "occurrence"],
    ["accomodate", "accommodate"],
    ["seperate", "separate"],
    ["recieve", "receive"],
    ["beleive", "believe"],
    ["freind", "friend"],
    ["peice", "piece"],
    ["wierd", "weird"],
  ];

  test.each(typos)("corrects %s → %s", (typo, correct) => {
    const result = bestMatch(typo, dictionary);
    expect(result?.item).toBe(correct);
  });
});
