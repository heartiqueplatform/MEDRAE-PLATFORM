// src/components/school-wars/InstitutionPicker.tsx
"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { institutions } from "@/components/forms/institutions.data";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function InstitutionPicker({
    value,
    onChange,
    hasError,
}: {
    value: string;
    onChange: (v: string) => void;
    hasError?: boolean;
}) {
    const [query, setQuery] = useState("");
    const selected = institutions.find((i) => i.value === value);

    const grouped = useMemo(() => {
        const term = query.trim().toLowerCase();
        const filtered = term
            ? institutions.filter(
                (i) =>
                    i.label.toLowerCase().includes(term) ||
                    i.value.toLowerCase().includes(term)
            )
            : institutions;

        const tags = [
            { tag: "kmtc", title: "KMTC Campuses", items: filtered.filter((i) => i.tag === "kmtc") },
            { tag: "university", title: "Universities", items: filtered.filter((i) => i.tag === "university") },
            { tag: "hospital", title: "Hospital / Mission / Nursing Colleges", items: filtered.filter((i) => i.tag === "hospital") },
            { tag: "other", title: "Other Colleges", items: filtered.filter((i) => i.tag === "other") },
        ];
        return tags.filter((t) => t.items.length > 0);
    }, [query]);

    return (
        <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger
                className={`text-xs md:text-sm h-10 md:h-11 w-full bg-white dark:bg-[#1f2630] ${hasError ? "border-destructive" : ""
                    }`}
            >
                <SelectValue placeholder="Search or choose institution">
                    {selected?.label ?? ""}
                </SelectValue>
            </SelectTrigger>

            <SelectContent className="max-h-[340px] p-0">
                <div className="sticky -top-2 z-10 bg-popover border-b border-border p-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Search e.g. 'KMTC Nakuru'"
                            className="w-full pl-9 pr-8 py-2.5 rounded-none bg-transparent border-0 text-xs md:text-sm outline-none focus:ring-0"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
                            >
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="py-1">
                    {grouped.length === 0 ? (
                        <div className="p-6 text-center text-xs md:text-sm text-muted-foreground">
                            No institution matches "{query}"
                        </div>
                    ) : (
                        grouped.map((group) => (
                            <div key={group.tag}>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50">
                                    {group.title} ({group.items.length})
                                </div>
                                {group.items.map((inst) => (
                                    <SelectItem key={inst.value} value={inst.value} className="text-xs md:text-sm">
                                        {inst.label}
                                    </SelectItem>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </SelectContent>
        </Select>
    );
}