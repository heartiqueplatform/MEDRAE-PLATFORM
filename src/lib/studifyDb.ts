import Dexie, { Table } from "dexie";

export interface DbEpisode {
    id: string;                 // episode uuid from Supabase
    showId: string;             // podcast_shows.id
    showTitle?: string;
    showArtwork?: string;
    title: string;
    audioUrl: string;
    duration?: number;
    publishedAt?: string;       // ISO
    isHidden?: boolean;
    cachedAt: number;           // Date.now() when saved
}

export interface DbShow {
    id: string;                 // podcast_shows.id
    appleId: string;
    title: string;
    author?: string;
    artwork?: string;
    description?: string;
    episodeCount: number;
    endorsementCount: number;
    cachedAt: number;
}

export class StudifyDB extends Dexie {
    episodes!: Table<DbEpisode, string>;
    shows!: Table<DbShow, string>;

    constructor() {
        super("studify");

        this.version(1).stores({
            episodes: "id, showId, publishedAt, cachedAt",
            shows: "id, appleId, title",
        });
    }
}

export const studifyDb = new StudifyDB();

// ─────────────────────────────────────────────────────────────
// CANONICAL ORDER — must match Supabase's ORDER BY exactly.
//   episodes: publishedAt DESC, then id ASC
//   shows:    title       ASC,  then id ASC
// If a layer disagrees, the list visibly reorders on every
// cache → network handoff.
// ─────────────────────────────────────────────────────────────

function compareEpisodes(a: DbEpisode, b: DbEpisode): number {
    const av = a.publishedAt ?? "";
    const bv = b.publishedAt ?? "";
    if (av !== bv) return bv.localeCompare(av);   // newest first
    return a.id.localeCompare(b.id);              // stable tiebreak
}

function compareShows(a: DbShow, b: DbShow): number {
    const t = a.title.localeCompare(b.title);
    return t !== 0 ? t : a.id.localeCompare(b.id);
}

// ── Helpers ──
export async function getEpisodesForShow(showId: string): Promise<DbEpisode[]> {
    const rows = await studifyDb.episodes
        .where("showId")
        .equals(showId)
        .toArray();
    rows.sort(compareEpisodes);
    return rows;
}

export async function getLatestEpisodes(limit = 200): Promise<DbEpisode[]> {
    // Over-fetch so ties at the boundary don't drop rows after the sort.
    const all = await studifyDb.episodes
        .orderBy("publishedAt")
        .reverse()
        .limit(limit * 2)
        .toArray();

    all.sort(compareEpisodes);
    return all.slice(0, limit);
}

export async function putEpisodes(eps: DbEpisode[]) {
    await studifyDb.episodes.bulkPut(eps);
}

export async function putShows(shows: DbShow[]) {
    await studifyDb.shows.bulkPut(shows);
}

export async function getAllShows(): Promise<DbShow[]> {
    const rows = await studifyDb.shows.toArray();
    rows.sort(compareShows);
    return rows;
}

export async function clearStudifyCache() {
    await Promise.all([
        studifyDb.episodes.clear(),
        studifyDb.shows.clear(),
    ]);
}

export async function countEpisodes(): Promise<number> {
    return studifyDb.episodes.count();
}
/**
 * Search episodes in Dexie by title. Case-insensitive substring match.
 * Fast (~2-5 ms for a few thousand rows). Returns up to `limit` rows in
 * canonical order.
 */
export async function searchEpisodesLocal(query: string, limit = 40): Promise<DbEpisode[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    // Dexie has no full-text search on primary index — use filter().
    // For <10k rows this is fast enough (~5ms).
    const all = await studifyDb.episodes
        .filter((e) => e.title?.toLowerCase().includes(q))
        .limit(limit * 3)
        .toArray();

    all.sort(compareEpisodes);
    return all.slice(0, limit);
}