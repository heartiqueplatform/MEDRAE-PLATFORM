// src/components/mistakes/InstitutionFilter.tsx
"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ChevronRight } from "lucide-react";
import { InstitutionPicker } from "@/components/school-wars/InstitutionPicker";
import { prettyLabel } from "@/lib/school-wars/schoolWarsCache";
import {
    readCachedInstitution,
    writeCachedInstitution,
} from "@/lib/mistakes/mistakesCache";

interface Props {
    value: string | null;
    onChange: (slug: string | null) => void;
}

export function InstitutionFilter({ value, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<string>("");

    useEffect(() => {
        const cached = readCachedInstitution();
        if (cached && !value) onChange(cached);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const label = value ? prettyLabel(value, value) : "All institutions";

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 text-left"
            >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-0.5">
                        Filter by institution
                    </p>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                        {label}
                    </p>
                </div>
                <ChevronRight
                    className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""
                        }`}
                />
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    <InstitutionPicker value={picked} onChange={setPicked} />
                    <div className="flex gap-2">
                        <button
                            disabled={!picked}
                            onClick={() => {
                                writeCachedInstitution(picked);
                                onChange(picked);
                                setPicked("");
                                setOpen(false);
                            }}
                            className="flex-1 h-9 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-bold disabled:opacity-50"
                        >
                            Apply filter
                        </button>
                        <button
                            onClick={() => {
                                writeCachedInstitution(null);
                                onChange(null);
                                setPicked("");
                                setOpen(false);
                            }}
                            className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[12px] font-bold"
                        >
                            All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}