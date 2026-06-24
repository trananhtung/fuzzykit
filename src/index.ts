export {
  levenshtein,
  damerauLevenshtein,
  jaro,
  jaroWinkler,
  similarity,
  damerauSimilarity,
} from "./distance.js";

export {
  fuzzySearch,
  fuzzySearchBy,
  bestMatch,
  isMatch,
} from "./search.js";

export type { FuzzyMatch, SearchOptions } from "./search.js";
