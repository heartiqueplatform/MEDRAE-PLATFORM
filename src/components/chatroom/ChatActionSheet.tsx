// src/components/chatroom/ChatActionSheet.tsx
"use client";
import { X, Pin, PinOff, Archive, ArchiveRestore } from "lucide-react";
import { Unit } from "./types";

interface Props {
    unit: Unit;
    isArchived: boolean;
    isPinned: boolean;
    onClose: () => void;
    onPin: (unitCode: string) => void;
    onUnpin: (unitCode: string) => void;
    onArchive: (unitCode: string) => void;
    onUnarchive: (unitCode: string) => void;
}

export default function ChatActionSheet({
    unit, isArchived, isPinned,
    onClose, onPin, onUnpin, onArchive, onUnarchive,
}: Props) {
    const run = (fn: () => void) => { fn(); onClose(); };

    return (
        <div
            className="absolute inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="w-full md:max-w-sm bg-white dark:bg-[#161b22] rounded-t-2xl md:rounded-2xl p-2 space-y-1"
                style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                        {unit.title}
                    </p>
                </div>

                {!isArchived && (
                    isPinned ? (
                        <button
                            onClick={() => run(() => onUnpin(unit.unit_code))}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] active:scale-[0.98] transition-all"
                        >
                            <PinOff size={18} className="text-gray-600 dark:text-gray-300" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Unpin</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => run(() => onPin(unit.unit_code))}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] active:scale-[0.98] transition-all"
                        >
                            <Pin size={18} className="text-gray-600 dark:text-gray-300" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pin to top</span>
                        </button>
                    )
                )}

                {isArchived ? (
                    <button
                        onClick={() => run(() => onUnarchive(unit.unit_code))}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] active:scale-[0.98] transition-all"
                    >
                        <ArchiveRestore size={18} className="text-gray-600 dark:text-gray-300" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Unarchive</span>
                    </button>
                ) : (
                    <button
                        onClick={() => run(() => onArchive(unit.unit_code))}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] active:scale-[0.98] transition-all"
                    >
                        <Archive size={18} className="text-gray-600 dark:text-gray-300" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Archive</span>
                    </button>
                )}

                <button
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#21262d] active:scale-[0.98] transition-all"
                >
                    <X size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Cancel</span>
                </button>
            </div>
        </div>
    );
}