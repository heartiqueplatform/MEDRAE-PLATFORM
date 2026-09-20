import Dexie, { Table } from "dexie";
import { supabase } from "@/lib/supabaseClient";

// ============================================================
// TYPES
// ============================================================

export interface MicroCaseCardRecord {
    id: string;
    title?: string;
    scenario: string;
    question: string;
    answer: string;
    explanation?: string;
    related_unit?: string;
    difficulty?: string;
    tags?: string;
    fetched_at: number;
}

export interface MicroCaseStatsRecord {
    cardId: string;
    views_count: number;
    likes_count: number;
    saves_count: number;
    reports_count: number;
    synced_at: number;
    // pending = we made local changes not yet confirmed by server
    // confirmed = server value as far as we know
    source: "server" | "local";
}

export interface MicroCaseUserStateRecord {
    key: string; // `${userId}_${cardId}` — compound key
    userId: string;
    cardId: string;
    liked: boolean;
    saved: boolean;
    reported: boolean;
    reportReason?: string | null;
    synced_at: number;
}

export interface MicroCaseOutboxRecord {
    id?: number; // autoincrement
    type:
    | "like"
    | "unlike"
    | "save"
    | "unsave"
    | "report"
    | "view";
    userId: string;
    cardId: string;
    payload?: any;
    attempts: number;
    created_at: number;
    last_error?: string;
}

export interface MicroCaseMetaRecord {
    key: string;
    value: any;
}

// ============================================================
// DATABASE
// ============================================================

class MicroCaseDB extends Dexie {
    cards!: Table<MicroCaseCardRecord, string>;
    cardStats!: Table<MicroCaseStatsRecord, string>;
    userCardState!: Table<MicroCaseUserStateRecord, string>;
    outbox!: Table<MicroCaseOutboxRecord, number>;
    meta!: Table<MicroCaseMetaRecord, string>;

    constructor() {
        super("medrae-micro-cases-v2");

        // v1 — original schema (assumed users may already have this)
        // If your users never had v1 with only `cards`, you can bump
        // straight to v2 and skip this line.
        this.version(1).stores({
            cards: "id, fetched_at",
        });

        // v2 — adds stats, user state, outbox, meta.
        // Bumping the version forces Dexie to run this upgrade block on
        // existing databases where those stores are missing.
        this.version(2).stores({
            cards: "id, fetched_at",
            cardStats: "cardId, synced_at",
            userCardState: "key, userId, cardId",
            outbox: "++id, userId, cardId, type, created_at",
            meta: "key",
        });
    }
}

export const microCaseDb = new MicroCaseDB();

// ============================================================
// HELPERS — READ (used by components)
// ============================================================

/** Get all cards in the local DB (fast, from disk) */
export async function getAllLocalCards(): Promise<MicroCaseCardRecord[]> {
    return microCaseDb.cards.toArray();
}

/** Pick a random card. Uses a random offset query — scales to any count. */
export async function pickRandomLocalCard(
    excludeIds: string[] = []
): Promise<MicroCaseCardRecord | null> {
    const total = await microCaseDb.cards.count();
    if (total === 0) return null;

    // Try up to 5 random picks to honor excludeIds without scanning everything
    for (let i = 0; i < 5; i++) {
        const offset = Math.floor(Math.random() * total);
        const card = await microCaseDb.cards.offset(offset).first();
        if (card && !excludeIds.includes(card.id)) return card;
    }
    // Fallback: linear scan (only if the DB is tiny and excludes hit repeatedly)
    const all = await microCaseDb.cards.toArray();
    const filtered = all.filter((c) => !excludeIds.includes(c.id));
    return filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : null;
}

/** Get stats for a card. Returns null if we've never seen it. */
export async function getLocalStats(
    cardId: string
): Promise<MicroCaseStatsRecord | null> {
    return (await microCaseDb.cardStats.get(cardId)) ?? null;
}

/** Get this user's like/save/report state for a card. */
export async function getLocalUserState(
    userId: string,
    cardId: string
): Promise<MicroCaseUserStateRecord | null> {
    return (await microCaseDb.userCardState.get(`${userId}_${cardId}`)) ?? null;
}

// ============================================================
// HELPERS — WRITE (used by components, called synchronously from UI)
// ============================================================

/**
 * Toggle a like. Writes to Dexie immediately, queues an outbox entry,
 * and returns the new state. Caller does NOT await Supabase.
 */
export async function toggleLike(userId: string, cardId: string) {
    const key = `${userId}_${cardId}`;
    const state = (await microCaseDb.userCardState.get(key)) ?? {
        key, userId, cardId,
        liked: false, saved: false, reported: false,
        synced_at: 0,
    };
    const newLiked = !state.liked;

    await microCaseDb.transaction("rw", microCaseDb.userCardState, microCaseDb.cardStats, microCaseDb.outbox, async () => {
        await microCaseDb.userCardState.put({
            ...state,
            liked: newLiked,
            synced_at: Date.now(),
        });
        // Bump the local count optimistically
        const stats = (await microCaseDb.cardStats.get(cardId)) ?? {
            cardId, views_count: 0, likes_count: 0, saves_count: 0, reports_count: 0,
            synced_at: 0, source: "local" as const,
        };
        await microCaseDb.cardStats.put({
            ...stats,
            likes_count: Math.max(0, stats.likes_count + (newLiked ? 1 : -1)),
            source: "local",
        });
        // Queue the write
        await microCaseDb.outbox.add({
            type: newLiked ? "like" : "unlike",
            userId,
            cardId,
            attempts: 0,
            created_at: Date.now(),
        });
    });

    return newLiked;
}

export async function toggleSave(userId: string, cardId: string) {
    const key = `${userId}_${cardId}`;
    const state = (await microCaseDb.userCardState.get(key)) ?? {
        key, userId, cardId,
        liked: false, saved: false, reported: false,
        synced_at: 0,
    };
    const newSaved = !state.saved;

    await microCaseDb.transaction("rw", microCaseDb.userCardState, microCaseDb.cardStats, microCaseDb.outbox, async () => {
        await microCaseDb.userCardState.put({
            ...state,
            saved: newSaved,
            synced_at: Date.now(),
        });
        const stats = (await microCaseDb.cardStats.get(cardId)) ?? {
            cardId, views_count: 0, likes_count: 0, saves_count: 0, reports_count: 0,
            synced_at: 0, source: "local" as const,
        };
        await microCaseDb.cardStats.put({
            ...stats,
            saves_count: Math.max(0, stats.saves_count + (newSaved ? 1 : -1)),
            source: "local",
        });
        await microCaseDb.outbox.add({
            type: newSaved ? "save" : "unsave",
            userId,
            cardId,
            attempts: 0,
            created_at: Date.now(),
        });
    });

    return newSaved;
}

export async function submitReport(userId: string, cardId: string, reason: string) {
    const key = `${userId}_${cardId}`;
    const state = (await microCaseDb.userCardState.get(key)) ?? {
        key, userId, cardId,
        liked: false, saved: false, reported: false,
        synced_at: 0,
    };

    await microCaseDb.transaction("rw", microCaseDb.userCardState, microCaseDb.cardStats, microCaseDb.outbox, async () => {
        await microCaseDb.userCardState.put({
            ...state,
            reported: true,
            reportReason: reason,
            synced_at: Date.now(),
        });
        const stats = (await microCaseDb.cardStats.get(cardId)) ?? {
            cardId, views_count: 0, likes_count: 0, saves_count: 0, reports_count: 0,
            synced_at: 0, source: "local" as const,
        };
        await microCaseDb.cardStats.put({
            ...stats,
            reports_count: stats.reports_count + 1,
            source: "local",
        });
        await microCaseDb.outbox.add({
            type: "report",
            userId,
            cardId,
            payload: { reason },
            attempts: 0,
            created_at: Date.now(),
        });
    });
}

/** Records a view locally — only flushes to server once per card per hour */
export async function recordView(userId: string, cardId: string) {
    const metaKey = `view_${userId}_${cardId}`;
    const last = await microCaseDb.meta.get(metaKey);
    const hourMs = 60 * 60 * 1000;
    if (last && Date.now() - last.value < hourMs) return;

    await microCaseDb.transaction("rw", microCaseDb.meta, microCaseDb.cardStats, microCaseDb.outbox, async () => {
        await microCaseDb.meta.put({ key: metaKey, value: Date.now() });
        const stats = (await microCaseDb.cardStats.get(cardId)) ?? {
            cardId, views_count: 0, likes_count: 0, saves_count: 0, reports_count: 0,
            synced_at: 0, source: "local" as const,
        };
        await microCaseDb.cardStats.put({
            ...stats,
            views_count: stats.views_count + 1,
            source: "local",
        });
        await microCaseDb.outbox.add({
            type: "view",
            userId,
            cardId,
            attempts: 0,
            created_at: Date.now(),
        });
    });
}