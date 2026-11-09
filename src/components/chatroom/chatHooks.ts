// src/components/chatroom/chatHooks.ts
"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import { getCached, setCached, invalidateCached, fetchCached, purgeOldCacheVersions } from "./chatCache";
import { Message, Unit, CK, TTL } from "./types";

export function useChatData(currentUserId: string | undefined) {
    const [userUnits, setUserUnits] = useState<Unit[]>([]);
    const [activeScreen, setActiveScreen] = useState<"list" | "chat">("list");
    const [activeUnit, setActiveUnit] = useState<string | null>(null);
    const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
    const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
    const [archivedUnits, setArchivedUnits] = useState<Set<string>>(new Set());
    const [pinnedUnits, setPinnedUnits] = useState<Map<string, number>>(new Map());
    const [searchQuery, setSearchQuery] = useState("");
    const [unitsLoaded, setUnitsLoaded] = useState(false);

    const messagesLoadedRef = useRef<Set<string>>(new Set());

    const vibrate = (ms = 30) => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
    };

    // ── Load units (cached first, then network) ────────────────
    // ✅ image_url is now included so chat avatars can use the SAME
    //    image as the Medrae Quizzes page — instant recognition + cached
    //    by the browser, so no extra network hit.
    const loadUserUnits = useCallback(async () => {
        if (unitsLoaded) return;
        const cached = getCached<Unit[]>(CK.UNITS);
        if (cached?.length) {
            setUserUnits(cached);
            setUnitsLoaded(true);
        }
        try {
            const units = await fetchCached<Unit[]>(
                CK.UNITS,
                async () => {
                    const { data, error } = await supabase
                        .from("quizzes")
                        .select("id, unit_code, unit, image_url")
                        .order("unit", { ascending: true });
                    if (error) throw error;
                    return (data || []).map((u: any) => ({
                        id: u.id,
                        unit_code: u.unit_code,
                        title: u.unit || u.unit_code,
                        image_url: u.image_url || null,
                    }));
                },
                { ttl: TTL.UNITS, revalidate: true }
            );
            if (units?.length) setUserUnits(units);
            setUnitsLoaded(true);
        } catch (err) {
            console.warn("[chat] units fetch failed:", err);
            setUnitsLoaded(true);
        }
    }, [unitsLoaded]);

    // ── Load pin/archive state ─────────────────────────────────
    const loadUserUnitState = useCallback(async () => {
        if (!currentUserId) return;
        const cachedA = getCached<string[]>(CK.ARCHIVED);
        const cachedP = getCached<Record<string, number>>(CK.PINNED);
        if (cachedA) setArchivedUnits(new Set(cachedA));
        if (cachedP) setPinnedUnits(new Map(Object.entries(cachedP)));

        try {
            const rows = await fetchCached<any[]>(
                `state_${currentUserId}`,
                async () => {
                    const { data, error } = await supabase
                        .from("chat_archives")
                        .select("unit_code, archived_at, pinned_at")
                        .eq("user_id", currentUserId);
                    if (error) throw error;
                    return data || [];
                },
                { ttl: TTL.STATE, revalidate: true }
            );
            const archived: string[] = [];
            const pinned: Record<string, number> = {};
            rows.forEach((r) => {
                if (r.archived_at) archived.push(r.unit_code);
                if (r.pinned_at) pinned[r.unit_code] = new Date(r.pinned_at).getTime();
            });
            setArchivedUnits(new Set(archived));
            setPinnedUnits(new Map(Object.entries(pinned)));
            setCached(CK.ARCHIVED, archived, TTL.STATE);
            setCached(CK.PINNED, pinned, TTL.STATE);
        } catch (err) {
            console.warn("[chat] state fetch failed:", err);
        }
    }, [currentUserId]);

    // ── Load messages for a unit ───────────────────────────────
    const loadMessages = useCallback(async (unitCode: string) => {
        if (messagesLoadedRef.current.has(unitCode)) return;
        messagesLoadedRef.current.add(unitCode);

        const cached = getCached<Message[]>(`${CK.MESSAGES_PREFIX}${unitCode}`);
        if (cached?.length) {
            setMessagesMap((p) => ({ ...p, [unitCode]: cached }));
            const cachedLast = getCached<number>(`${CK.LAST_READ_PREFIX}${unitCode}`);
            if (cachedLast) setLastReadMap((p) => ({ ...p, [unitCode]: cachedLast }));
        }

        try {
            const messages = await fetchCached<Message[]>(
                `${CK.MESSAGES_PREFIX}${unitCode}`,
                async () => {
                    const { data, error } = await supabase
                        .from("unit_messages")
                        .select(`*, profiles!fk_unit_messages_user(name, avatar_url)`)
                        .eq("unit_code", unitCode)
                        .order("created_at", { ascending: true });
                    if (error) throw error;
                    const mapped: Message[] = (data || []).map((m: any) => ({
                        id: m.id,
                        unit_code: m.unit_code,
                        user_id: m.user_id,
                        content: m.content,
                        created_at: m.created_at,
                        sender_name: m.profiles?.name || "Unknown",
                        avatar_url: m.profiles?.avatar_url || null,
                        replyToId: m.reply_to_id || null,
                        deleted: m.deleted || false,
                    }));
                    mapped.forEach((msg) => {
                        if (msg.replyToId) {
                            const r = mapped.find((x) => x.id === msg.replyToId);
                            if (r) msg.replyToContent = r.content;
                        }
                    });
                    return mapped;
                },
                { ttl: TTL.MESSAGES, revalidate: true }
            );
            if (messages) {
                setMessagesMap((p) => ({ ...p, [unitCode]: messages }));
                setCached(`${CK.MESSAGES_PREFIX}${unitCode}`, messages, TTL.MESSAGES);
            }
        } catch (err) {
            console.warn("[chat] messages fetch failed:", err);
        }
    }, []);

    // ── Open a unit ────────────────────────────────────────────
    const openUnit = useCallback((unitCode: string) => {
        setActiveUnit(unitCode);
        setActiveScreen("chat");
        loadMessages(unitCode);
        const messages = messagesMap[unitCode] || [];
        if (messages.length > 0) {
            const lastId = messages[messages.length - 1].id;
            setLastReadMap((p) => ({ ...p, [unitCode]: lastId }));
            setCached(`${CK.LAST_READ_PREFIX}${unitCode}`, lastId, TTL.MESSAGES);
        }
    }, [loadMessages, messagesMap]);

    const backToList = useCallback(() => {
        setActiveScreen("list");
        setActiveUnit(null);
    }, []);

    // ── Realtime channel ───────────────────────────────────────
    useEffect(() => {
        if (activeScreen !== "chat" || !activeUnit) return;
        const channel = supabase
            .channel(`active-messages-${activeUnit}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "unit_messages", filter: `unit_code=eq.${activeUnit}` },
                async (payload) => {
                    const msgData = payload.new as any;
                    if ((messagesMap[activeUnit] || []).some((m) => m.id === msgData.id)) return;
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("name, avatar_url")
                        .eq("user_id", msgData.user_id)
                        .maybeSingle();
                    let replyToContent: string | undefined;
                    if (msgData.reply_to_id) {
                        const r = (messagesMap[activeUnit] || []).find((m) => m.id === msgData.reply_to_id);
                        replyToContent = r ? r.content : "Referenced Data";
                    }
                    const newMessage: Message = {
                        id: msgData.id,
                        unit_code: msgData.unit_code,
                        user_id: msgData.user_id,
                        content: msgData.content,
                        created_at: msgData.created_at,
                        sender_name: profile?.name || "Unknown",
                        avatar_url: profile?.avatar_url || null,
                        replyToId: msgData.reply_to_id || null,
                        replyToContent,
                    };
                    setMessagesMap((prev) => {
                        const updated = { ...prev, [activeUnit]: [...(prev[activeUnit] || []), newMessage] };
                        setCached(`${CK.MESSAGES_PREFIX}${activeUnit}`, updated[activeUnit], TTL.MESSAGES);
                        return updated;
                    });
                    playSound("notification", false);
                }
            )
            .subscribe();
        const onVis = () => { if (document.hidden) supabase.removeChannel(channel); };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [activeUnit, activeScreen, messagesMap]);

    // ── Send message ───────────────────────────────────────────
    const sendMessage = useCallback(async (unitCode: string, content: string, replyToId?: number | null) => {
        if (!currentUserId || !content.trim()) return;
        const unit = userUnits.find((u) => u.unit_code === unitCode);
        if (!unit) return;
        const { data, error } = await supabase
            .from("unit_messages")
            .insert([{
                unit_id: unit.id,
                unit_code: unit.unit_code,
                user_id: currentUserId,
                content: content.trim(),
                reply_to_id: replyToId || null,
            }])
            .select();
        if (error) { alert(`DB Error: ${error.message}`); return; }
        vibrate(40);
    }, [currentUserId, userUnits]);

    // ── Edit message ───────────────────────────────────────────
    const editMessage = useCallback(async (unitCode: string, id: number, newContent: string) => {
        const { error } = await supabase.from("unit_messages").update({ content: newContent }).eq("id", id);
        if (error) return;
        setMessagesMap((prev) => {
            const updated = { ...prev };
            if (updated[unitCode]) {
                updated[unitCode] = updated[unitCode].map((m) => m.id === id ? { ...m, content: newContent } : m);
                setCached(`${CK.MESSAGES_PREFIX}${unitCode}`, updated[unitCode], TTL.MESSAGES);
            }
            return updated;
        });
    }, []);

    // ── Delete message ─────────────────────────────────────────
    const deleteMessage = useCallback(async (unitCode: string, id: number) => {
        const { error } = await supabase
            .from("unit_messages")
            .update({ content: "This message was deleted", deleted: true })
            .eq("id", id);
        if (error) return;
        setMessagesMap((prev) => {
            const updated = { ...prev };
            if (updated[unitCode]) {
                updated[unitCode] = updated[unitCode].map((m) => m.id === id
                    ? { ...m, content: "This message was deleted", deleted: true }
                    : m);
                setCached(`${CK.MESSAGES_PREFIX}${unitCode}`, updated[unitCode], TTL.MESSAGES);
            }
            return updated;
        });
    }, []);

    // ── Pin / Unpin ────────────────────────────────────────────
    const pinUnit = useCallback(async (unitCode: string) => {
        if (!currentUserId) return;
        const now = Date.now();
        setPinnedUnits((prev) => {
            const n = new Map(prev); n.set(unitCode, now);
            setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
            return n;
        });
        vibrate();
        try {
            const { error } = await supabase.from("chat_archives").upsert(
                { user_id: currentUserId, unit_code: unitCode, pinned_at: new Date(now).toISOString(), archived_at: null },
                { onConflict: "user_id,unit_code" }
            );
            if (error) throw error;
            invalidateCached(`state_${currentUserId}`);
        } catch (err) {
            console.error("[chat] pin failed:", err);
            setPinnedUnits((prev) => {
                const n = new Map(prev); n.delete(unitCode);
                setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
                return n;
            });
        }
    }, [currentUserId]);

    const unpinUnit = useCallback(async (unitCode: string) => {
        if (!currentUserId) return;
        setPinnedUnits((prev) => {
            const n = new Map(prev); n.delete(unitCode);
            setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
            return n;
        });
        vibrate();
        try {
            await supabase.from("chat_archives").update({ pinned_at: null })
                .match({ user_id: currentUserId, unit_code: unitCode });
            const { data: check } = await supabase.from("chat_archives")
                .select("archived_at").match({ user_id: currentUserId, unit_code: unitCode }).maybeSingle();
            if (check && check.archived_at == null) {
                await supabase.from("chat_archives").delete()
                    .match({ user_id: currentUserId, unit_code: unitCode });
            }
            invalidateCached(`state_${currentUserId}`);
        } catch (err) {
            console.error("[chat] unpin failed:", err);
            setPinnedUnits((prev) => {
                const n = new Map(prev); n.set(unitCode, Date.now());
                setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
                return n;
            });
        }
    }, [currentUserId]);

    // ── Archive / Unarchive ────────────────────────────────────
    const archiveUnit = useCallback(async (unitCode: string) => {
        if (!currentUserId) return;
        const wasPinned = pinnedUnits.has(unitCode);
        setArchivedUnits((prev) => {
            const n = new Set(prev); n.add(unitCode);
            setCached(CK.ARCHIVED, Array.from(n), TTL.STATE);
            return n;
        });
        setPinnedUnits((prev) => {
            if (!prev.has(unitCode)) return prev;
            const n = new Map(prev); n.delete(unitCode);
            setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
            return n;
        });
        vibrate();
        try {
            const { error } = await supabase.from("chat_archives").upsert(
                { user_id: currentUserId, unit_code: unitCode, archived_at: new Date().toISOString(), pinned_at: null },
                { onConflict: "user_id,unit_code" }
            );
            if (error) throw error;
            invalidateCached(`state_${currentUserId}`);
        } catch (err) {
            console.error("[chat] archive failed:", err);
            setArchivedUnits((prev) => {
                const n = new Set(prev); n.delete(unitCode);
                setCached(CK.ARCHIVED, Array.from(n), TTL.STATE);
                return n;
            });
            if (wasPinned) {
                setPinnedUnits((prev) => {
                    const n = new Map(prev); n.set(unitCode, Date.now());
                    setCached(CK.PINNED, Object.fromEntries(n), TTL.STATE);
                    return n;
                });
            }
        }
    }, [currentUserId, pinnedUnits]);

    const unarchiveUnit = useCallback(async (unitCode: string) => {
        if (!currentUserId) return;
        setArchivedUnits((prev) => {
            const n = new Set(prev); n.delete(unitCode);
            setCached(CK.ARCHIVED, Array.from(n), TTL.STATE);
            return n;
        });
        vibrate();
        try {
            await supabase.from("chat_archives").update({ archived_at: null })
                .match({ user_id: currentUserId, unit_code: unitCode });
            const { data: check } = await supabase.from("chat_archives")
                .select("pinned_at").match({ user_id: currentUserId, unit_code: unitCode }).maybeSingle();
            if (check && check.pinned_at == null) {
                await supabase.from("chat_archives").delete()
                    .match({ user_id: currentUserId, unit_code: unitCode });
            }
            invalidateCached(`state_${currentUserId}`);
        } catch (err) {
            console.error("[chat] unarchive failed:", err);
            setArchivedUnits((prev) => {
                const n = new Set(prev); n.add(unitCode);
                setCached(CK.ARCHIVED, Array.from(n), TTL.STATE);
                return n;
            });
        }
    }, [currentUserId]);

    // ── Init ───────────────────────────────────────────────────
    // ── Init ───────────────────────────────────────────────────
    useEffect(() => {
        // ✅ Purge stale cache from older app versions on boot
        purgeOldCacheVersions();
        loadUserUnits();
    }, [loadUserUnits]);
    useEffect(() => { loadUserUnitState(); }, [loadUserUnitState]);

    // ── Derived lists ──────────────────────────────────────────
    const visibleUnits = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = userUnits.filter((u) => {
            if (archivedUnits.has(u.unit_code)) return false;
            if (!q) return true;
            return (u.title || "").toLowerCase().includes(q)
                || (u.unit_code || "").toLowerCase().includes(q);
        });
        const pinned: Unit[] = [];
        const unpinned: Unit[] = [];
        filtered.forEach((u) => (pinnedUnits.has(u.unit_code) ? pinned : unpinned).push(u));
        pinned.sort((a, b) =>
            (pinnedUnits.get(b.unit_code) ?? 0) - (pinnedUnits.get(a.unit_code) ?? 0)
        );
        return [...pinned, ...unpinned];
    }, [userUnits, archivedUnits, pinnedUnits, searchQuery]);

    const archivedList = useMemo(
        () => userUnits.filter((u) => archivedUnits.has(u.unit_code)),
        [userUnits, archivedUnits]
    );

    return {
        // state
        userUnits, messagesMap, lastReadMap, archivedUnits, pinnedUnits,
        searchQuery, setSearchQuery,
        activeScreen, activeUnit,
        visibleUnits, archivedList,
        // actions
        openUnit, backToList,
        sendMessage, editMessage, deleteMessage,
        pinUnit, unpinUnit, archiveUnit, unarchiveUnit,
    };
}