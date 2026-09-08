/**
 * Typo tolerance for name/title lookups (members, expenses, team). One
 * shared implementation — every resolver imports this rather than rolling
 * its own distance function.
 *
 * Deliberately conservative: this exists to survive things like "sharmaa"
 * vs "Sharma", not to guess between genuinely different names. It only
 * kicks in after exact/substring/token matching has already come back
 * empty, and it only returns a hit when there is a single closest match —
 * ties are returned as-is so the caller can treat them as ambiguous rather
 * than silently picking one.
 */

/** Case-insensitive Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curRow = [i];
    for (let j = 1; j <= n; j++) {
      curRow[j] =
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]
          : 1 + Math.min(prevRow[j - 1], prevRow[j], curRow[j - 1]);
    }
    prevRow = curRow;
  }
  return prevRow[n];
}

/**
 * How many edits to tolerate, scaled to word length so short words don't
 * get blurred into unrelated short words (e.g. "Om" must never fuzzy-match
 * "Am") while longer names get a little more slack for a dropped/doubled
 * letter or two.
 */
function tolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

export interface FuzzyCandidate<T> {
  item: T;
  label: string;
}

export interface FuzzyHit<T> extends FuzzyCandidate<T> {
  distance: number;
}

/**
 * Fuzzy-matches `query` against `candidates` by their `label`. Returns only
 * the candidate(s) tied for the closest edit distance within tolerance —
 * empty if nothing is close enough, one item if there's a confident single
 * match, or several if it's a genuine tie (caller should treat that as
 * ambiguous, not pick one).
 *
 * Distance 0 (exact match) is excluded on purpose — that belongs to the
 * exact-match tier callers already run before reaching this one.
 */
export function fuzzyFind<T>(query: string, candidates: FuzzyCandidate<T>[]): FuzzyHit<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = candidates
    .map(({ item, label }) => ({ item, label, distance: levenshtein(q, label.toLowerCase()) }))
    .filter((c) => c.distance > 0 && c.distance <= tolerance(Math.min(q.length, c.label.length)));

  if (!scored.length) return [];
  const best = Math.min(...scored.map((c) => c.distance));
  return scored.filter((c) => c.distance === best);
}
