"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileModal } from "@/components/UserProfileModal";

const USERS_CACHE_KEY = "all_users_cache_v4";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 5 * 60 * 1000;  // 5 minutes

// Memory cache
let memoryCache: {
    data: any[];
    timestamp: number;
} | null = null;

let fetchInProgress = false;

const isNewUser = (createdAt: string) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
};

/**
 * Get cached users. Returns data only if it's still fresh (within TTL).
 * Used to decide *whether to refetch* — not whether to render.
 */
const getCachedUsers = (): any[] | null => {
    // Check memory cache first
    if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
        return memoryCache.data;
    }

    // Check localStorage
    try {
        const cached = localStorage.getItem(USERS_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                memoryCache = { data, timestamp };
                return data;
            }
        }
    } catch {
        // Ignore
    }
    return null;
};

/**
 * Get cached users IGNORING TTL — for instant paint.
 * Age only decides *whether to refetch*, never *whether to render*.
 */
const getCachedUsersAny = (): any[] | null => {
    if (memoryCache) return memoryCache.data;
    try {
        const raw = localStorage.getItem(USERS_CACHE_KEY);
        if (!raw) return null;
        const { data } = JSON.parse(raw);
        if (Array.isArray(data)) {
            memoryCache = { data, timestamp: Date.now() };
            return data;
        }
    } catch {
        // Ignore
    }
    return null;
};

const saveUsersToCache = (users: any[]) => {
    try {
        const timestamp = Date.now();
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify({ data: users, timestamp }));
        memoryCache = { data: users, timestamp };
    } catch (error) {
        console.error("Failed to cache users:", error);
    }
};

export default function AllUsersPopover({
    totalUsers: propTotalUsers,
    onTotalUsersChange,
}: {
    totalUsers?: number;
    onTotalUsersChange?: (n: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [allProfiles, setAllProfiles] = useState<any[]>(() => {
        // ✅ Paint from disk instantly — any age, not just fresh.
        // This is what stops the badge from jumping on remount.
        if (typeof window !== "undefined") {
            const cached = getCachedUsersAny();
            if (cached) return cached;
        }
        return [];
    });
    const [loading, setLoading] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // ✅ Initialize totalCount from the best available source.
    // Priority: prop → cached array length → 0
    const [totalCount, setTotalCount] = useState(() => {
        if (typeof propTotalUsers === "number" && propTotalUsers > 0) {
            return propTotalUsers;
        }
        if (typeof window !== "undefined") {
            const cached = getCachedUsersAny();
            if (cached) return cached.length;
        }
        return 0;
    });

    const isMounted = useRef(true);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    // Prevent infinite loops: only push to parent when the value actually changes
    const lastReportedCount = useRef<number | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // ✅ Propagate total count to the parent only when it changes.
    // This is what keeps Header's badge in sync with the drawer.
    useEffect(() => {
        if (totalCount > 0 && lastReportedCount.current !== totalCount) {
            lastReportedCount.current = totalCount;
            onTotalUsersChange?.(totalCount);
        }
    }, [totalCount, onTotalUsersChange]);

    // Fetch all users
    const fetchAllProfiles = useCallback(async (forceRefresh = false) => {
        if (!isMounted.current) return;

        // ✅ Always paint from disk first — any age — so the badge
        // shows the last-known count instantly instead of flashing.
        const anyCache = getCachedUsersAny();
        if (anyCache && anyCache.length > 0) {
            if (isMounted.current) {
                setAllProfiles(anyCache);
                setTotalCount(anyCache.length);
            }
        }

        // ✅ TTL-gated cache check: if fresh AND not forced, skip network.
        if (!forceRefresh) {
            const fresh = getCachedUsers();
            if (fresh && fresh.length > 0) {
                return;
            }
        }

        if (fetchInProgress) return;
        fetchInProgress = true;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, name, username, role, avatar_url, is_online, created_at")
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (data && isMounted.current) {
                setAllProfiles(data);
                setTotalCount(data.length);
                saveUsersToCache(data);
            }
        } catch (err) {
            console.error("Error fetching profiles:", err);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
            fetchInProgress = false;
        }
    }, []);

    // Handle popover open/close
    const handleOpenChange = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            const cached = getCachedUsers();
            if (cached && cached.length > 0) {
                // Paint cache instantly
                setAllProfiles(cached);
                setTotalCount(cached.length);
                // Silent background refresh
                fetchAllProfiles(true);
            } else {
                fetchAllProfiles(false);
            }
        }
    }, [fetchAllProfiles]);

    // ✅ Background poll — keeps the badge live without opening the drawer.
    // Refresh every 5 min while the tab is visible, and on focus.
    useEffect(() => {
        if (!isMounted.current) return;

        const poll = () => {
            if (document.hidden) return;
            if (!isMounted.current) return;
            fetchAllProfiles(true);
        };

        const id = setInterval(poll, POLL_INTERVAL);
        window.addEventListener("focus", poll);

        // Also fire once shortly after mount so the badge refreshes
        // even if the user never opens the drawer.
        const initial = setTimeout(poll, 3000);

        return () => {
            clearInterval(id);
            clearTimeout(initial);
            window.removeEventListener("focus", poll);
        };
    }, [fetchAllProfiles]);

    // Handle search with debounce (client-side filtering)
    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value);
    }, []);

    // Filter profiles based on search term (client-side, super fast)
    const filteredProfiles = useMemo(() => {
        if (!searchTerm.trim()) return allProfiles;

        const term = searchTerm.toLowerCase().trim();
        return allProfiles.filter(user =>
            user.name?.toLowerCase().includes(term) ||
            user.username?.toLowerCase().includes(term) ||
            user.role?.toLowerCase().includes(term)
        );
    }, [allProfiles, searchTerm]);

    // Sort profiles (new users first)
    const sortedProfiles = useMemo(() => {
        return filteredProfiles.slice().sort((a, b) => {
            const aNew = isNewUser(a.created_at);
            const bNew = isNewUser(b.created_at);
            return Number(bNew) - Number(aNew);
        });
    }, [filteredProfiles]);

    return (
        <>
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <div className="hidden sm:flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6 text-blue-500"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                        </svg>
                        {/* ✅ Single source of truth — tabular-nums + min-w prevents width jumps */}
                        <Badge className="h-5 px-2 text-xs bg-blue-500 text-white tabular-nums min-w-[2rem] text-center justify-center">
                            {totalCount > 0 ? totalCount : "-"}
                        </Badge>
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    className="w-80 max-h-96 overflow-y-auto custom-scrollbar p-2 bg-card"
                >
                    {/* Search Input */}
                    <div className="mb-3 sticky -top-2 bg-card z-10 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            onChange={(e) => handleSearch(e.target.value)}
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <span className="absolute right-3 top-2 text-xs text-gray-400">
                                {sortedProfiles.length} results
                            </span>
                        )}
                    </div>

                    <h4 className="font-semibold text-sm mb-2 flex justify-between items-center">
                        <span>All Users</span>
                        <span className="text-xs font-normal text-muted-foreground">
                            {totalCount > 0 && `${sortedProfiles.length} of ${totalCount}`}
                        </span>
                    </h4>

                    {loading && allProfiles.length === 0 ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-2 animate-pulse">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1">
                                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                        <div className="h-2 w-16 bg-gray-100 dark:bg-gray-800 rounded mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sortedProfiles.length > 0 ? (
                        <ul className="space-y-2">
                            {sortedProfiles.map((u) => {
                                const newUser = isNewUser(u.created_at);
                                return (
                                    <li
                                        key={u.user_id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded transition-colors"
                                        onClick={() => setSelectedUserId(u.user_id)}
                                    >
                                        <Avatar className="h-6 w-6 flex-shrink-0">
                                            <AvatarImage src={u.avatar_url ?? undefined} loading="lazy" />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                                {u.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate text-sm min-w-0">
                                            <div className="font-medium flex items-center gap-1 flex-wrap">
                                                <span className="truncate">{u.name || "Anonymous"}</span>
                                                {newUser && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-green-500 text-white px-1.5 py-0"
                                                    >
                                                        New
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex gap-1 items-center">
                                                {u.username && <span className="truncate">@{u.username}</span>}
                                                <span className="truncate">{u.role || "Student"}</span>
                                            </div>
                                        </div>
                                        {u.is_online && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-4">
                            {searchTerm ? "No users found matching your search" : "No users available"}
                        </p>
                    )}

                    {loading && allProfiles.length > 0 && (
                        <div className="text-center py-2">
                            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            <span className="text-xs text-gray-400 ml-2">Refreshing...</span>
                        </div>
                    )}

                    {!loading && allProfiles.length > 0 && (
                        <p className="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                            {totalCount} total users • Updated {new Date(memoryCache?.timestamp || Date.now()).toLocaleTimeString()}
                        </p>
                    )}
                </PopoverContent>
            </Popover>

            {/* User Profile Modal */}
            {selectedUserId && (
                <UserProfileModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </>
    );
}