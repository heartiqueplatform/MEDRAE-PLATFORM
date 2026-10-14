/**
 * Super-fast substring + subsequence matcher.
 * Returns a score, or -1 if no match.
 *   - Exact substring match at start  → highest
 *   - Exact substring match anywhere  → high
 *   - All query chars in order         → medium (typo-tolerant)
 *   - Token match (all words present)  → medium
 */
export function scoreMatch(text: string, query: string): number {
    if (!query) return 0;
    const t = text.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return 0;

    // 1. Exact prefix — highest score
    if (t.startsWith(q)) return 1000;

    // 2. Substring anywhere — high score (weighted by position)
    const idx = t.indexOf(q);
    if (idx >= 0) return 900 - idx;

    // 3. All words present (order-independent) — good score
    const qWords = q.split(/\s+/);
    if (qWords.length > 1) {
        const allPresent = qWords.every((w) => t.includes(w));
        if (allPresent) return 600;
    }

    // 4. Subsequence match — "mert" matches "metformin" (chars in order)
    let qi = 0;
    let firstHit = -1;
    let lastHit = -1;
    for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) {
            if (firstHit === -1) firstHit = i;
            lastHit = i;
            qi++;
        }
    }
    if (qi === q.length) {
        // Tighter gaps = better score
        const span = lastHit - firstHit + 1;
        const density = q.length / span; // 1.0 = perfectly consecutive
        return 400 + Math.floor(density * 100);
    }

    // 5. No match
    return -1;
}

/** Sort an array of {name, ...} by match score. */
export function fuzzySearch<T>(
    items: T[],
    query: string,
    getName: (item: T) => string,
    limit = 50
): T[] {
    if (!query.trim()) return items;
    const scored: { item: T; score: number }[] = [];
    for (const item of items) {
        const s = scoreMatch(getName(item), query);
        if (s > 0) scored.push({ item, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((x) => x.item);
}