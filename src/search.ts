import { damerauLevenshtein, damerauSimilarity, jaroWinkler } from "./distance.js";

export interface FuzzyMatch<T> {
  item: T;
  score: number;   // 0..1, higher = better match
  distance: number;
}

export interface SearchOptions {
  /** Maximum edit distance to include in results. Default: Infinity. */
  maxDistance?: number;
  /** Minimum similarity score (0..1) to include. Default: 0. */
  minScore?: number;
  /** Maximum number of results. Default: all matches. */
  limit?: number;
  /** Use Jaro-Winkler scoring instead of normalized Damerau-Levenshtein. Default: false. */
  useJaroWinkler?: boolean;
  /** Case-sensitive matching. Default: false. */
  caseSensitive?: boolean;
}

/**
 * Find approximate matches in a list of strings.
 * Results are sorted by score descending (best match first).
 *
 * @example
 * fuzzySearch("recieve", ["receive", "believe", "relieve"])
 * // [{ item: "receive", score: 0.875, distance: 1 }, ...]
 */
export function fuzzySearch(
  query: string,
  candidates: string[],
  opts?: SearchOptions
): FuzzyMatch<string>[] {
  return fuzzySearchBy(query, candidates, s => s, opts);
}

/**
 * Find approximate matches in a list of objects by a key extractor.
 *
 * @example
 * fuzzySearchBy("jhn", users, u => u.name)
 * // [{ item: { name: "John" }, score: 0.75, distance: 1 }, ...]
 */
export function fuzzySearchBy<T>(
  query: string,
  candidates: T[],
  keyFn: (item: T) => string,
  opts?: SearchOptions
): FuzzyMatch<T>[] {
  const {
    maxDistance = Infinity,
    minScore = 0,
    limit,
    useJaroWinkler = false,
    caseSensitive = false,
  } = opts ?? {};

  const q = caseSensitive ? query : query.toLowerCase();
  const results: FuzzyMatch<T>[] = [];

  for (const item of candidates) {
    const raw = keyFn(item);
    const key = caseSensitive ? raw : raw.toLowerCase();

    const distance = damerauLevenshtein(q, key);
    if (distance > maxDistance) continue;

    const score = useJaroWinkler
      ? jaroWinkler(q, key)
      : damerauSimilarity(q, key);

    if (score < minScore) continue;

    results.push({ item, score, distance });
  }

  results.sort((a, b) => b.score - a.score || a.distance - b.distance);

  return limit !== undefined ? results.slice(0, limit) : results;
}

/**
 * Returns the best match from candidates, or undefined if no candidates.
 */
export function bestMatch(query: string, candidates: string[], opts?: SearchOptions): FuzzyMatch<string> | undefined {
  const results = fuzzySearch(query, candidates, { ...opts, limit: 1 });
  return results[0];
}

/**
 * Returns true if query matches candidate within the given max edit distance.
 * Default: distance ≤ 1 (single-character typo tolerance).
 */
export function isMatch(query: string, candidate: string, maxDistance = 1): boolean {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (q === c) return true;
  if (Math.abs(q.length - c.length) > maxDistance) return false;
  return damerauLevenshtein(q, c) <= maxDistance;
}
