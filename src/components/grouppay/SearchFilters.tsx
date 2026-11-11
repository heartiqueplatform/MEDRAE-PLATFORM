// src/components/grouppay/SearchFilters.tsx

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, School, ArrowUpDown } from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

interface SearchFiltersProps {
    search: string;
    school: string;
    course?: string;
    sort: string;
    onSearchChange: (value: string) => void;
    onSchoolChange: (value: string) => void;
    onCourseChange?: (value: string) => void;
    onSortChange: (value: string) => void;
}

export function SearchFilters({
    search,
    school,
    sort,
    onSearchChange,
    onSchoolChange,
    onSortChange,
}: SearchFiltersProps) {
    return (
        <div className="space-y-2">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                  h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                    placeholder="Search groups by name…"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-11 rounded-xl border-0 outline-none
                               bg-white dark:bg-[#161b22]
                               pl-10 pr-3.5 text-sm
                               text-slate-900 dark:text-white
                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                               focus:ring-2 focus:ring-emerald-500/40"
                    style={{ touchAction: "manipulation" }}
                />
            </div>

            {/* School + Sort */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* School */}
                <div className="relative">
                    <School className="absolute left-3.5 top-1/2 -translate-y-1/2
                                      h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                        placeholder="Filter by school…"
                        value={school}
                        onChange={(e) => onSchoolChange(e.target.value)}
                        className="w-full h-11 rounded-xl border-0 outline-none
                                   bg-white dark:bg-[#161b22]
                                   pl-10 pr-3.5 text-sm
                                   text-slate-900 dark:text-white
                                   placeholder:text-slate-400 dark:placeholder:text-slate-500
                                   focus:ring-2 focus:ring-emerald-500/40"
                        style={{ touchAction: "manipulation" }}
                    />
                </div>

                {/* Sort */}
                <Select
                    value={sort}
                    onValueChange={(v) => {
                        tap();
                        onSortChange(v);
                    }}
                >
                    <SelectTrigger
                        className="relative h-11 rounded-xl border-0
                                   bg-white dark:bg-[#161b22]
                                   text-sm font-semibold
                                   text-slate-900 dark:text-white
                                   pl-10 pr-3
                                   focus:ring-2 focus:ring-emerald-500/40"
                    >
                        <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2
                                               h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent
                        className="rounded-xl
                                   bg-white dark:bg-[#161b22]
                                   border-slate-200/70 dark:border-white/[0.06]"
                    >
                        <SelectItem value="newest" className="text-[13px] font-semibold">
                            Newest first
                        </SelectItem>
                        <SelectItem value="oldest" className="text-[13px] font-semibold">
                            Oldest first
                        </SelectItem>
                        <SelectItem value="most_members" className="text-[13px] font-semibold">
                            Most members
                        </SelectItem>
                        <SelectItem value="least_members" className="text-[13px] font-semibold">
                            Least members
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}