import { supabase } from "@/lib/supabaseClient";

const LIST_CACHE_KEY = 'medrae_unit_images_v1';
const LIST_TTL = 1000 * 60 * 60 * 6; // 6 hours
const MAX_AGE_HOURS = 24;

export interface UnitImage {
    id: string;
    unit_code: string;
    image_url: string;
    caption: string;
    user_id?: string;
    created_at?: string;
    cloudinary_public_id?: string;
}

interface CachedList {
    data: UnitImage[];
    fetchedAt: number;
    count: number;
    latestCreatedAt: string | null;
}

function readListCache(): CachedList | null {
    try {
        const raw = localStorage.getItem(LIST_CACHE_KEY);
        if (!raw) return null;
        const parsed: CachedList = JSON.parse(raw);
        if (Date.now() - parsed.fetchedAt > LIST_TTL) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeListCache(data: UnitImage[]) {
    try {
        const latest = data[0]?.created_at || null;
        localStorage.setItem(
            LIST_CACHE_KEY,
            JSON.stringify({
                data,
                fetchedAt: Date.now(),
                count: data.length,
                latestCreatedAt: latest,
            } as CachedList)
        );
    } catch {
        // localStorage full or disabled — ignore
    }
}

export function getCachedList(): UnitImage[] | null {
    return readListCache()?.data ?? null;
}

// Cheap check — just count + latest timestamp. No egress for full rows.
async function isCacheStale(cached: CachedList): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('unit_images')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) return false; // assume fresh on error
        const latest = data?.[0]?.created_at ?? null;
        return latest !== cached.latestCreatedAt;
    } catch {
        return false;
    }
}

export async function fetchUnitImages(
    forceRefresh = false
): Promise<UnitImage[]> {
    const cached = readListCache();

    // 1. Fresh cache → return immediately, no network
    if (!forceRefresh && cached) {
        // 2. Cheap staleness check (only 1 row fetched, ~200 bytes)
        const stale = await isCacheStale(cached);
        if (!stale) return cached.data;
    }

    // 3. Full fetch
    const { data, error } = await supabase
        .from('unit_images')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        // Return stale cache on error if we have it
        return cached?.data ?? [];
    }

    const result = data ?? [];
    writeListCache(result);
    return result;
}

export function invalidateListCache() {
    localStorage.removeItem(LIST_CACHE_KEY);
}