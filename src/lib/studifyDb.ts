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

        // Compound + single-column indexes we actually use
        this.version(1).stores({
            episodes: "id, showId, publishedAt, cachedAt",
            shows: "id, appleId, title",
        });
    }
}

export const studifyDb = new StudifyDB();

// ── Helpers ──
export async function getEpisodesForShow(showId: string): Promise<DbEpisode[]> {
    const rows = await studifyDb.episodes
        .where("showId")
        .equals(showId)
        .toArray();
    // Sort newest-first, treating missing dates as oldest
    return rows.sort((a, b) => {
        const av = a.publishedAt ?? "";
        const bv = b.publishedAt ?? "";
        return bv.localeCompare(av);
    });
}

export async function getLatestEpisodes(limit = 200): Promise<DbEpisode[]> {
    // publishedAt is stored as ISO string — lexicographic = chronological
    const all = await studifyDb.episodes
        .orderBy("publishedAt")
        .reverse()
        .limit(limit)
        .toArray();
    return all;
}

export async function putEpisodes(eps: DbEpisode[]) {
    // bulkPut is one transaction — way faster than loop
    await studifyDb.episodes.bulkPut(eps);
}

export async function putShows(shows: DbShow[]) {
    await studifyDb.shows.bulkPut(shows);
}

export async function getAllShows(): Promise<DbShow[]> {
    return studifyDb.shows.toArray();
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