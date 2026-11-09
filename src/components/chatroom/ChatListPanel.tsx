// src/components/chatroom/ChatListPanel.tsx
"use client";
import { useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Users, Archive, ChevronDown, ChevronRight, Pin, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Unit, Message, LOCAL_AVATARS, LONG_PRESS_MS, LayoutMode } from "./types";

interface Props {
    visibleUnits: Unit[];
    archivedList: Unit[];
    messagesMap: Record<string, Message[]>;
    lastReadMap: Record<string, number>;
    pinnedUnits: Map<string, number>;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    activeUnit: string | null;
    onOpenUnit: (unit: Unit) => void;
    onOpenActionSheet: (unit: Unit) => void;
    onClose?: () => void;
    layout: LayoutMode;
    showHeaderClose: boolean;
    desktopMode?: "fullscreen" | "floating";
    onToggleDesktopMode?: () => void;
}

export default function ChatListPanel({
    visibleUnits,
    archivedList,
    messagesMap,
    lastReadMap,
    pinnedUnits,
    searchQuery,
    setSearchQuery,
    activeUnit,
    onOpenUnit,
    onOpenActionSheet,
    onClose,
    layout,
    showHeaderClose,
    desktopMode,
    onToggleDesktopMode,
}: Props) {
    const [showArchived, setShowArchived] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);

    const startLongPress = (unit: Unit) => {
        longPressFiredRef.current = false;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true;
            if (navigator.vibrate) navigator.vibrate(20);
            onOpenActionSheet(unit);
        }, LONG_PRESS_MS);
    };
    const cancelLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };
    const handleRowClick = (unit: Unit) => {
        if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
        onOpenUnit(unit);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#161b22]">
            {/* HEADER */}
            <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between gap-2 bg-white dark:bg-[#161b22]">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <h1 className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                        Nurses' Messaging Rooms
                    </h1>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <p className="text-[10.5px] font-medium text-gray-500 dark:text-gray-400 truncate">
                            {visibleUnits.length} units · {visibleUnits.length === 1 ? "peer online" : "peers online"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {desktopMode && onToggleDesktopMode && (
                        <button
                            onClick={onToggleDesktopMode}
                            aria-label={desktopMode === "fullscreen" ? "Minimize chat" : "Maximize chat"}
                            className="hidden md:flex h-8 w-8 rounded-lg bg-gray-100 dark:bg-[#21262d] items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all active:scale-90"
                        >
                            {desktopMode === "fullscreen"
                                ? <Minimize2 size={14} strokeWidth={2} />
                                : <Maximize2 size={14} strokeWidth={2} />}
                        </button>
                    )}
                    {showHeaderClose && onClose && (
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all active:scale-90"
                        >
                            <X size={14} strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>

            {/* SEARCH */}
            <div className="shrink-0 px-3 pb-3 bg-white dark:bg-[#161b22]">
                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
                        strokeWidth={2}
                    />
                    <input
                        type="text"
                        inputMode="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search units…"
                        className="w-full h-9 pl-9 pr-9 rounded-lg bg-gray-100 dark:bg-[#21262d] text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 border-0 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#30363d] transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#30363d] text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* LIST */}
            <ScrollArea className="flex-1 overflow-y-auto px-2">
                <div className="flex flex-col space-y-0.5">
                    {visibleUnits.length === 0 && archivedList.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            {searchQuery ? (
                                <>
                                    <Search size={32} className="mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        No units match "{searchQuery}"
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Users size={32} className="mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No rosters</p>
                                </>
                            )}
                        </div>
                    ) : (
                        visibleUnits.map((unit, index) => {
                            const messages = messagesMap[unit.unit_code] || [];
                            const lastMessage = messages[messages.length - 1];
                            const unread = messages.length - (lastReadMap[unit.unit_code]
                                ? messages.findIndex((m) => m.id === lastReadMap[unit.unit_code]) + 1
                                : 0);
                            const avatarUrl = LOCAL_AVATARS[index % LOCAL_AVATARS.length];
                            const isPinned = pinnedUnits.has(unit.unit_code);
                            const isActive = activeUnit === unit.unit_code && layout === "columns";
                            return (
                                <div
                                    key={unit.unit_code}
                                    onPointerDown={() => startLongPress(unit)}
                                    onPointerUp={cancelLongPress}
                                    onPointerLeave={cancelLongPress}
                                    onPointerCancel={cancelLongPress}
                                    onContextMenu={(e) => { e.preventDefault(); onOpenActionSheet(unit); }}
                                    onClick={() => handleRowClick(unit)}
                                    className={cn(
                                        "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] select-none",
                                        isActive
                                            ? "bg-gray-100 dark:bg-[#21262d]"
                                            : isPinned
                                                ? "bg-blue-50/60 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                : "hover:bg-gray-50 dark:hover:bg-[#21262d]"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d]">
                                            <img src={avatarUrl} alt="group" className="h-full w-full object-cover" draggable={false} />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#161b22] bg-emerald-500" />
                                        {isPinned && (
                                            <div className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-[#161b22]">
                                                <Pin size={8} className="text-white fill-white" strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </div>
                                    {/* min-w-0 makes the truncation work inside a narrow column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h3 title={unit.title} className="font-semibold text-[12.5px] text-gray-800 dark:text-gray-200 truncate">
                                                {unit.title}
                                            </h3>
                                            {lastMessage && (
                                                <span className="text-[9.5px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
                                                    {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate leading-none min-w-0 flex-1">
                                                {lastMessage ? (
                                                    <>
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">
                                                            {lastMessage.sender_name?.split(" ")[0]}:
                                                        </span>
                                                        {lastMessage.content}
                                                    </>
                                                ) : "No messages yet"}
                                            </p>
                                            {unread > 0 && (
                                                <div className="bg-gray-800 dark:bg-[#21262d] text-white text-[9.5px] font-semibold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center shrink-0">
                                                    {unread}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {archivedList.length > 0 && (
                        <div className="mt-4 pt-2">
                            <button
                                onClick={() => setShowArchived((v) => !v)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors"
                            >
                                {showArchived ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Archive size={14} />
                                <span className="text-[12px] font-semibold">Archived ({archivedList.length})</span>
                            </button>
                            {showArchived && archivedList.map((unit) => (
                                <div
                                    key={unit.unit_code}
                                    onPointerDown={() => startLongPress(unit)}
                                    onPointerUp={cancelLongPress}
                                    onPointerLeave={cancelLongPress}
                                    onPointerCancel={cancelLongPress}
                                    onContextMenu={(e) => { e.preventDefault(); onOpenActionSheet(unit); }}
                                    onClick={() => handleRowClick(unit)}
                                    className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#21262d] cursor-pointer transition-all opacity-70 select-none"
                                >
                                    <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#21262d] shrink-0">
                                        <img src={LOCAL_AVATARS[0]} alt="" className="h-full w-full object-cover" draggable={false} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                                            {unit.title}
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Long-press for actions</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="shrink-0 py-2.5 text-center bg-gray-50 dark:bg-[#21262d]/50">
                <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Medrae · Clinical roster</p>
            </div>
        </div>
    );
}