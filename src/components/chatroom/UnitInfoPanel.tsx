// src/components/chatroom/UnitInfoPanel.tsx
"use client";
import { Unit, Message } from "./types";
import { Users, MessageCircle, Shield, Info, ChevronRight } from "lucide-react";

interface Props {
    unit: Unit | undefined;
    messages: Message[];
    /** Optional: show collapse button (desktop only). */
    onCollapse?: () => void;
}

export default function UnitInfoPanel({ unit, messages, onCollapse }: Props) {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#161b22] overflow-y-auto relative">
            {/* Header row with collapse button */}
            <div className="shrink-0 px-3 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Room details
                </h3>
                {onCollapse && (
                    <button
                        onClick={onCollapse}
                        aria-label="Hide info panel"
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors active:scale-90"
                    >
                        <ChevronRight size={14} strokeWidth={2} />
                    </button>
                )}
            </div>

            {!unit ? (
                <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                    <Info className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        Select a room to see details
                    </p>
                </div>
            ) : (
                <div className="flex-1 px-3 pb-4 space-y-3">
                    {/* Unit name */}
                    <div>
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-snug break-words">
                            {unit.title}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono break-all">
                            {unit.unit_code}
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                            <MessageCircle size={12} className="text-gray-500 dark:text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium leading-none">Messages</p>
                                <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 tabular-nums mt-0.5">
                                    {messages.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                            <Users size={12} className="text-gray-500 dark:text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium leading-none">Active members</p>
                                <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 tabular-nums mt-0.5">
                                    {new Set(messages.map((m) => m.user_id)).size}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                            <Shield size={12} className="text-gray-500 dark:text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium leading-none">Visibility</p>
                                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                    Public to unit
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                            Shared with everyone in{" "}
                            <span className="font-semibold text-gray-600 dark:text-gray-300">{unit.unit_code}</span>.
                            Stay respectful — cite sources when relevant.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}