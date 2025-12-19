// src/lib/offlineAuth.ts
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'medrae-offline-auth';
const STORE_NAME = 'user';

let dbPromise: Promise<IDBPDatabase> | null = null;

// Singleton DB instance
function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('username', 'username', { unique: true });
                }
            },
        }).catch((err) => {
            console.error('Failed to open DB', err);
            dbPromise = null; // reset so next attempt can retry
            throw err;
        });
    }
    return dbPromise;
}

// Check if offline storage is available
export async function isOfflineStorageAvailable(): Promise<boolean> {
    try {
        // Try IndexedDB
        const db = await getDB();
        await db.put(STORE_NAME, { id: 999, test: true });
        await db.delete(STORE_NAME, 999);
        return true;
    } catch (err) {
        console.warn('IndexedDB not available, falling back to localStorage', err);
    }

    // Try localStorage as a last resort
    try {
        localStorage.setItem('__offline_test__', '1');
        localStorage.removeItem('__offline_test__');
        return true;
    } catch {
        console.error('Offline storage not available');
        return false;
    }
}

// Save login info after online login
export async function saveLoginInfo(
    username: string,
    token: string,
    passwordHash: string
) {
    try {
        const db = await getDB();
        await db.put(STORE_NAME, { id: 1, username, token, passwordHash });
    } catch (err) {
        console.error('Failed to save login info in IndexedDB', err);
        try {
            localStorage.setItem(
                'offline-login',
                JSON.stringify({ username, token, passwordHash })
            );
        } catch {
            console.error('LocalStorage fallback also failed');
        }
    }
}

// Get saved login info
export async function getLoginInfo() {
    try {
        const db = await getDB();
        const info = await db.get(STORE_NAME, 1);
        if (info) return info;

        // fallback to localStorage
        const fallback = localStorage.getItem('offline-login');
        return fallback ? JSON.parse(fallback) : null;
    } catch (err) {
        console.error('Failed to get login info from IndexedDB', err);
        const fallback = localStorage.getItem('offline-login');
        return fallback ? JSON.parse(fallback) : null;
    }
}

// Clear saved login info (on logout)
export async function clearLoginInfo() {
    try {
        const db = await getDB();
        await db.clear(STORE_NAME);
    } catch {
        // ignore, fallback will handle clearing
    }
    try {
        localStorage.removeItem('offline-login');
    } catch {
        // ignore
    }
}
