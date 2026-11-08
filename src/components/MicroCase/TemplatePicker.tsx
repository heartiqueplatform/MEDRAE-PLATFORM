"use client";

import { motion } from "framer-motion";
import { TEMPLATES, TemplateId } from "./wardCaseTypes";

interface Props {
    selected: TemplateId;
    onSelect: (id: TemplateId) => void;
}

export default function TemplatePicker({ selected, onSelect }: Props) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TEMPLATES.map((t) => {
                const active = selected === t.id;
                return (
                    <motion.button
                        key={t.id}
                        onClick={() => onSelect(t.id)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative flex flex-col items-center justify-center gap-1 rounded-xl p-3 transition-all ${active
                            ? "bg-blue-50 dark:bg-[#0d1c2e] ring-2 ring-blue-500"
                            : "bg-gray-50 dark:bg-[#161b22] hover:bg-gray-100 dark:hover:bg-[#21262d]"
                            }`}
                    >
                        <div
                            className={`${t.accent} w-9 h-9 rounded-lg flex items-center justify-center text-lg`}
                        >
                            {t.emoji}
                        </div>
                        <span
                            className={`text-[11px] font-bold text-center leading-tight ${active
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-gray-700 dark:text-[#e6edf3]"
                                }`}
                        >
                            {t.label}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}