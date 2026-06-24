# fuzzykit

Zero-dependency TypeScript fuzzy/approximate string matching: Levenshtein, Damerau-Levenshtein (with transpositions), Jaro-Winkler, and fuzzy search with ranking. Port of Python `rapidfuzz` (42M/week) / Go `go-fuzzywuzzy`.

[![npm](https://img.shields.io/npm/v/fuzzykit)](https://www.npmjs.com/package/fuzzykit)
[![license](https://img.shields.io/npm/l/fuzzykit)](LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

## Install

```bash
npm install fuzzykit
```

## Why?

- `fast-fuzzy` (1.1M/week) — has a runtime `graphemesplit` dependency, stale since 2022
- `fuse.js` (11M/week) — zero-dep but uses a different algorithm (bitap), not DL distance
- `fuzzykit` — zero-dep, TypeScript-native, Damerau-Levenshtein (handles transpositions correctly)

**Damerau-Levenshtein** correctly counts `"recieve" → "receive"` as **1 edit** (transposition), while standard Levenshtein counts it as **2 edits** (delete + insert). For spell-checking and autocorrect, DL is the right metric.

## Quick start

```typescript
import { fuzzySearch, bestMatch, isMatch } from "fuzzykit";

// Spell checker
const dictionary = ["receive", "believe", "friend", "piece", "weird"];

fuzzySearch("recieve", dictionary);
// [{ item: "receive", score: 0.875, distance: 1 }, { item: "relieve", ... }, ...]

bestMatch("recieve", dictionary);
// { item: "receive", score: 0.875, distance: 1 }

isMatch("helo", "hello");  // true — single typo
isMatch("hllo", "hello");  // false — two edits (default threshold: 1)
```

## Distance functions

```typescript
import {
  levenshtein,
  damerauLevenshtein,
  jaro,
  jaroWinkler,
  similarity,
  damerauSimilarity
} from "fuzzykit";

// Levenshtein (insertions, deletions, substitutions)
levenshtein("kitten", "sitting")  // 3
levenshtein("receive", "recieve") // 2 — swap counts as delete+insert

// Damerau-Levenshtein (+ transpositions in one step)
damerauLevenshtein("receive", "recieve")  // 1 — transposition!
damerauLevenshtein("teh", "the")          // 1 — transposition
damerauLevenshtein("kitten", "sitting")   // 3 (same as Levenshtein here)

// Jaro similarity (0..1)
jaro("MARTHA", "MARHTA")  // ~0.944

// Jaro-Winkler (boosts common prefix, good for names)
jaroWinkler("MARTHA", "MARHTA")   // ~0.961
jaroWinkler("DWAYNE", "DUANE")    // ~0.840

// Normalized similarity (0..1, 1 = identical)
similarity("kitten", "sitting")        // ~0.571 (Levenshtein-based)
damerauSimilarity("receive", "recieve") // ~0.875 (DL-based)
```

## Fuzzy search

### `fuzzySearch(query, candidates, opts?)`

```typescript
const fruits = ["apple", "apricot", "banana", "cherry", "blueberry"];

fuzzySearch("aple", fruits);
// [
//   { item: "apple", score: 0.8, distance: 1 },
//   { item: "apricot", score: ..., distance: ... },
//   ...
// ]

// Options
fuzzySearch("aple", fruits, {
  maxDistance: 2,       // only include matches within 2 edits
  minScore: 0.7,        // only include matches with score ≥ 0.7
  limit: 5,             // top 5 results only
  caseSensitive: false, // default: case-insensitive
  useJaroWinkler: false // default: Damerau-Levenshtein scoring
});
```

### `fuzzySearchBy(query, objects, keyFn, opts?)`

Search a list of objects by a property:

```typescript
import { fuzzySearchBy } from "fuzzykit";

const users = [
  { id: 1, name: "John Smith" },
  { id: 2, name: "Jane Doe" },
  { id: 3, name: "Jonathan Lee" },
];

fuzzySearchBy("Jon", users, u => u.name, { limit: 2 });
// [
//   { item: { id: 1, name: "John Smith" }, score: 0.75, distance: 1 },
//   { item: { id: 3, name: "Jonathan Lee" }, score: ..., distance: ... }
// ]
```

### `bestMatch(query, candidates, opts?)`

Returns the single best match:

```typescript
bestMatch("helo", ["hello", "world", "help"]);
// { item: "hello", score: 0.8, distance: 1 }
```

### `isMatch(query, candidate, maxDistance?)`

Quick boolean check — is the query within `maxDistance` edits of the candidate?

```typescript
isMatch("recieve", "receive");        // true (distance=1, default threshold=1)
isMatch("completly", "completely");   // false (distance=2)
isMatch("completly", "completely", 2); // true (custom threshold=2)
```

## Real-world examples

### Command-line did-you-mean

```typescript
import { bestMatch } from "fuzzykit";

const validCommands = ["start", "stop", "restart", "status", "deploy", "rollback"];

function runCommand(input: string) {
  if (!validCommands.includes(input)) {
    const suggestion = bestMatch(input, validCommands, { maxDistance: 3 });
    throw new Error(`Unknown command: "${input}". Did you mean "${suggestion?.item}"?`);
  }
  // ...
}

runCommand("satrt");   // Error: Unknown command: "satrt". Did you mean "start"?
runCommand("depoly");  // Error: Unknown command: "depoly". Did you mean "deploy"?
```

### Product search with typo tolerance

```typescript
import { fuzzySearchBy } from "fuzzykit";

const products = [
  { id: 1, name: "MacBook Pro", sku: "MBP2024" },
  { id: 2, name: "MacBook Air", sku: "MBA2024" },
  { id: 3, name: "iPad Pro", sku: "IPADP2024" },
];

const results = fuzzySearchBy("macbok", products, p => p.name, {
  minScore: 0.6,
  limit: 3,
});
// Both MacBook Pro and MacBook Air appear, sorted by similarity
```

### Record linkage (name deduplication)

```typescript
import { jaroWinkler } from "fuzzykit";

function areSamePerson(a: string, b: string): boolean {
  return jaroWinkler(a.toLowerCase(), b.toLowerCase()) > 0.92;
}

areSamePerson("John Smith", "Jon Smith");    // true (~0.97)
areSamePerson("John Smith", "Jane Smith");   // false (~0.90)
```

## API Reference

### Distance functions

| Function | Description | Range |
|---|---|---|
| `levenshtein(a, b)` | Edit distance (ins/del/sub) | 0..max(len) |
| `damerauLevenshtein(a, b)` | Edit distance + transpositions | 0..max(len) |
| `jaro(a, b)` | Jaro similarity | 0..1 |
| `jaroWinkler(a, b, prefixScale?)` | Jaro-Winkler similarity | 0..1 |
| `similarity(a, b)` | Normalized Levenshtein (1 - dist/max) | 0..1 |
| `damerauSimilarity(a, b)` | Normalized Damerau-Levenshtein | 0..1 |

### Search functions

| Function | Returns | Description |
|---|---|---|
| `fuzzySearch(q, candidates, opts?)` | `FuzzyMatch<string>[]` | Ranked fuzzy matches |
| `fuzzySearchBy(q, items, keyFn, opts?)` | `FuzzyMatch<T>[]` | Ranked matches on objects |
| `bestMatch(q, candidates, opts?)` | `FuzzyMatch<string> \| undefined` | Top match |
| `isMatch(q, candidate, maxDist?)` | `boolean` | Within max edit distance |

### `SearchOptions`

```typescript
interface SearchOptions {
  maxDistance?: number;     // max edits to include (default: Infinity)
  minScore?: number;        // min similarity to include (default: 0)
  limit?: number;           // max results (default: all)
  useJaroWinkler?: boolean; // use JW scoring instead of DL (default: false)
  caseSensitive?: boolean;  // case-sensitive matching (default: false)
}
```

## License

MIT
