// src/components/grouppay/SearchFilters.tsx

import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, School, ArrowUpDown } from 'lucide-react';

interface SearchFiltersProps {
    search: string;
    school: string;
    course?: string;                 // ✅ NEW (optional — accepts what index.tsx passes)
    sort: string;
    onSearchChange: (value: string) => void;
    onSchoolChange: (value: string) => void;
    onCourseChange?: (value: string) => void;  // ✅ NEW (optional)
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
        <div className="space-y-3">
            {/* Primary search — larger, focused, borderless */}
            <div className="relative">
                <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4
                        text-muted-foreground pointer-events-none"
                />
                <Input
                    placeholder="Search groups by name..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-11 h-12 md:h-11 rounded-xl border-0
                        bg-slate-50 dark:bg-slate-900/50
                        focus-visible:ring-2 focus-visible:ring-green-500/40
                        text-sm md:text-base
                        placeholder:text-muted-foreground"
                />
            </div>

            {/* Secondary filters — school + sort, side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {/* School filter */}
                <div className="relative">
                    <School
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4
                            text-muted-foreground pointer-events-none"
                    />
                    <Input
                        placeholder="Filter by school..."
                        value={school}
                        onChange={(e) => onSchoolChange(e.target.value)}
                        className="pl-11 h-11 rounded-xl border-0
                            bg-slate-50 dark:bg-slate-900/50
                            focus-visible:ring-2 focus-visible:ring-green-500/40
                            text-sm"
                    />
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                    <ArrowUpDown
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4
                            text-muted-foreground pointer-events-none z-10"
                    />
                    <Select value={sort} onValueChange={onSortChange}>
                        <SelectTrigger
                            className="pl-11 h-11 rounded-xl border-0
                                bg-slate-50 dark:bg-slate-900/50
                                focus:ring-2 focus:ring-green-500/40
                                text-sm"
                        >
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="border-0 rounded-xl shadow-lg">
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="most_members">Most Members</SelectItem>
                            <SelectItem value="least_members">Least Members</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}