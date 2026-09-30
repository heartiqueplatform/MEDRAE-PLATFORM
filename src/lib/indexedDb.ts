// src/lib/indexedDb.ts
const DB_NAME = "medrae_offline_db";
// Increase only when adding new stores
const DB_VERSION = 7;
const UNIT_STORE = "units";
const ANSWERS_STORE = "answers";
const NOTES_STORE = "question_notes"; // store aligned with Supabase table

import { supabase } from "./supabaseClient";

// ------------------------------------------
// SAFE openDB
// ------------------------------------------
export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(UNIT_STORE)) {
                db.createObjectStore(UNIT_STORE, { keyPath: "unitId" });
            }
            if (!db.objectStoreNames.contains(ANSWERS_STORE)) {
                db.createObjectStore(ANSWERS_STORE, { keyPath: "unitId" });
            }
            // Always recreate NOTES_STORE because older versions used wrong keyPath
            if (db.objectStoreNames.contains(NOTES_STORE)) {
                db.deleteObjectStore(NOTES_STORE);
            }

            const notesStore = db.createObjectStore(NOTES_STORE, {
                keyPath: ["question_id", "user_id"],
            });

            notesStore.createIndex("pending", "pending", { unique: false });
            notesStore.createIndex("user_id", "user_id", { unique: false });
        };

        request.onsuccess = () => {
            const db = request.result;

            // extra safety: ensure all stores exist
            [UNIT_STORE, ANSWERS_STORE, NOTES_STORE].forEach((storeName) => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.close();
                    const newVersion = db.version + 1;
                    const upgradeReq = indexedDB.open(DB_NAME, newVersion);
                    upgradeReq.onupgradeneeded = () => {
                        const upgradeDb = upgradeReq.result;
                        if (!upgradeDb.objectStoreNames.contains(storeName)) {
                            let keyPath = "id";
                            if (storeName === UNIT_STORE) keyPath = "unitId";
                            else if (storeName === ANSWERS_STORE) keyPath = "unitId";
                            else if (storeName === NOTES_STORE) keyPath = ["question_id", "user_id"];

                            const store = upgradeDb.createObjectStore(storeName, { keyPath });
                            if (storeName === NOTES_STORE) {
                                store.createIndex("pending", "pending", { unique: false });
                                store.createIndex("user_id", "user_id", { unique: false });
                            }
                        }
                    };
                    upgradeReq.onsuccess = () => resolve(upgradeReq.result);
                    upgradeReq.onerror = () => reject(upgradeReq.error);
                }
            });

            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

// ------------------------------------------
// UNITS STORE
// ------------------------------------------
export async function saveUnitOffline(payload: {
    unitId: string;
    quizId: string;
    questions: any[];
    savedAt: number;
    totalCount?: number;
}) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(UNIT_STORE, "readwrite");
        const store = tx.objectStore(UNIT_STORE);
        store.put(payload);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getUnitOffline(unitId: string) {
    const db = await openDB();
    return new Promise<any | null>((resolve, reject) => {
        const tx = db.transaction(UNIT_STORE, "readonly");
        const store = tx.objectStore(UNIT_STORE);
        const req = store.get(unitId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

export async function hasUnitOffline(unitId: string): Promise<boolean> {
    const unit = await getUnitOffline(unitId);
    return !!unit;
}

// ------------------------------------------
// ANSWERS STORE
// ------------------------------------------
export async function saveAnswersOffline(unitId: string, answers: any) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(ANSWERS_STORE, "readwrite");
        const store = tx.objectStore(ANSWERS_STORE);
        store.put({
            unitId,
            answers,
            pending: true,
            savedAt: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAnswersOffline(unitId: string) {
    const db = await openDB();
    return new Promise<any | null>((resolve, reject) => {
        const tx = db.transaction(ANSWERS_STORE, "readonly");
        const store = tx.objectStore(ANSWERS_STORE);
        const req = store.get(unitId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

// ------------------------------------------
// NOTES STORE
// ------------------------------------------
export async function saveNoteOffline(
    question_id: string,
    user_id: string,
    note_text: string,
    is_not_understood: boolean = false
) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, "readwrite");
        const store = tx.objectStore(NOTES_STORE);

        store.put({
            question_id,
            user_id,
            note_text,
            is_not_understood,
            pending: true,
            created_at: Date.now(),
            updated_at: Date.now(),
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getNoteOffline(question_id: string, user_id: string) {
    const db = await openDB();
    return new Promise<any | null>((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, "readonly");
        const store = tx.objectStore(NOTES_STORE);
        const key = [question_id, user_id];

        if (!question_id || !user_id) {
            return resolve(null); // avoid DataError
        }

        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

/**
 * 🚀 Bulk read — fetch all notes for the given question IDs in ONE transaction.
 * Returns a map of question_id → note record. Far faster than N sequential
 * getNoteOffline() calls when loading a quiz with 50+ questions.
 */
export async function getNotesOfflineBulk(
    questionIds: string[],
    user_id: string
): Promise<Record<string, any>> {
    if (!questionIds?.length || !user_id) return {};

    const db = await openDB();
    return new Promise<Record<string, any>>((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, "readonly");
        const store = tx.objectStore(NOTES_STORE);
        const result: Record<string, any> = {};

        // Use a single cursor over the whole store and filter in-memory.
        // This is faster than `getAll` when the store grows large.
        const req = store.openCursor();

        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                const row = cursor.value;
                if (
                    row &&
                    row.user_id === user_id &&
                    questionIds.includes(row.question_id)
                ) {
                    result[row.question_id] = row;
                }
                cursor.continue();
            } else {
                resolve(result);
            }
        };

        req.onerror = () => reject(req.error);
    });
}

export async function getPendingNotes() {
    const db = await openDB();
    return new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, "readonly");
        const store = tx.objectStore(NOTES_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result.filter((n: any) => n.pending));
        req.onerror = () => reject(req.error);
    });
}

export async function markNoteSynced(question_id: string, user_id: string) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(NOTES_STORE, "readwrite");
        const store = tx.objectStore(NOTES_STORE);
        const key = [question_id, user_id];

        if (!question_id || !user_id) {
            return resolve(null); // avoid DataError
        }

        const req = store.get(key);
        req.onsuccess = () => {
            const note = req.result;
            if (note) {
                note.pending = false;
                note.updated_at = Date.now();
                store.put(note);
            }
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
}
// ------------------------------------------
// CLEAR ANSWERS FOR A UNIT (used when the quiz changes)
// ------------------------------------------
export async function clearAnswersOffline(unitId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ANSWERS_STORE, "readwrite");
        tx.objectStore(ANSWERS_STORE).delete(unitId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
// ------------------------------------------
// SYNC NOTES TO SUPABASE
// ------------------------------------------
export async function syncNotesToSupabase() {
    const pendingNotes = await getPendingNotes();

    for (const note of pendingNotes) {
        const { question_id, user_id, note_text, is_not_understood, created_at, updated_at } = note;

        const { data, error } = await supabase
            .from("question_notes")
            .upsert(
                {
                    question_id,
                    user_id,
                    note_text,
                    is_not_understood,
                    created_at: new Date(created_at),
                    updated_at: new Date(updated_at),
                },
                { onConflict: ["question_id", "user_id"] }
            );

        if (!error) {
            await markNoteSynced(question_id, user_id);
        } else {
            console.error("Failed to sync note:", error);
        }
    }
}