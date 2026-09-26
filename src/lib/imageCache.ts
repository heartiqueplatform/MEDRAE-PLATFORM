// IndexedDB-based cache for image blobs (survives page reloads, ~hundreds of MB)
const DB_NAME = 'medrae-image-cache';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const META_STORE = 'meta';

interface CacheMeta {
    id: string;
    url: string;
    cachedAt: number;
    size: number;
    lastAccessed: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    return dbPromise;
}

// Convert image URL → stable cache key
function urlToKey(url: string): string {
    // Strip Cloudinary transformation params so different sizes share cache
    return url.split('/upload/')[1] || url;
}

export async function getCachedImage(url: string): Promise<Blob | null> {
    try {
        const db = await getDB();
        const key = urlToKey(url);

        return new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const metaStore = tx.objectStore(META_STORE);

            const req = store.get(key);
            req.onsuccess = () => {
                const blob = req.result;
                if (blob) {
                    // Update lastAccessed for LRU eviction
                    const metaReq = metaStore.get(key);
                    metaReq.onsuccess = () => {
                        const meta = metaReq.result;
                        if (meta) {
                            meta.lastAccessed = Date.now();
                            metaStore.put(meta);
                        }
                    };
                    resolve(blob);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

export async function cacheImage(url: string, blob: Blob): Promise<void> {
    try {
        const db = await getDB();
        const key = urlToKey(url);

        return new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
            tx.objectStore(STORE_NAME).put(blob, key);
            tx.objectStore(META_STORE).put({
                id: key,
                url,
                cachedAt: Date.now(),
                size: blob.size,
                lastAccessed: Date.now(),
            } as CacheMeta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch {
        // Silent fail — cache is best-effort
    }
}

// LRU eviction — keep cache under a size limit (default 100MB)
export async function pruneCache(maxBytes = 100 * 1024 * 1024): Promise<void> {
    try {
        const db = await getDB();
        const tx = db.transaction(META_STORE, 'readonly');
        const all = await new Promise<CacheMeta[]>((resolve) => {
            const req = tx.objectStore(META_STORE).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });

        const total = all.reduce((sum, m) => sum + (m.size || 0), 0);
        if (total <= maxBytes) return;

        // Sort oldest-accessed first
        all.sort((a, b) => a.lastAccessed - b.lastAccessed);

        let freed = 0;
        const toDelete: string[] = [];
        for (const meta of all) {
            if (total - freed <= maxBytes * 0.8) break; // free down to 80%
            toDelete.push(meta.id);
            freed += meta.size || 0;
        }

        const delTx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
        toDelete.forEach((id) => {
            delTx.objectStore(STORE_NAME).delete(id);
            delTx.objectStore(META_STORE).delete(id);
        });
    } catch {
        // Silent
    }
}

export async function clearImageCache(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();
}
// ─────────────────────────────────────────────────────────────
// Delete a single image from the cache (by URL or cache key)
// Used by UnitPics when a user removes an uploaded picture so
// we don't keep orphaned blobs around after deletion.
// ─────────────────────────────────────────────────────────────
export async function deleteCachedImage(url: string): Promise<void> {
    try {
        const db = await getDB();
        const key = urlToKey(url);

        return new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
            tx.objectStore(STORE_NAME).delete(key);
            tx.objectStore(META_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
    } catch {
        // Silent fail — cache is best-effort
    }
}