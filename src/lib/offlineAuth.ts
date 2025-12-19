// src/lib/offlineAuth.ts
import { openDB } from 'idb';

// Open (or create) the database
const DB_NAME = 'medrae-offline-auth';
const STORE_NAME = 'user';

async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('username', 'username', { unique: true });
            }
        },
    });
}

// Save login info after online login
export async function saveLoginInfo(username: string, token: string, passwordHash: string) {
    const db = await getDB();
    await db.put(STORE_NAME, { id: 1, username, token, passwordHash });
}

// Get saved login info
export async function getLoginInfo() {
    const db = await getDB();
    return db.get(STORE_NAME, 1);
}

// Clear saved login info (on logout)
export async function clearLoginInfo() {
    const db = await getDB();
    return db.clear(STORE_NAME);
}
