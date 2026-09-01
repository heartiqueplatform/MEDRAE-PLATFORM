// src/components/grouppay/SearchFilters.tsx

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SearchFiltersProps {
    search: string;
    school: string;
    sort: string;
    onSearchChange: (value: string) => void;
    onSchoolChange: (value: string) => void;
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
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search groups by name..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* School Filter - Text input */}
                <Input
                    placeholder="Filter by school..."
                    value={school}
                    onChange={(e) => onSchoolChange(e.target.value)}
                />

                {/* Sort - Dropdown */}
                <Select value={sort} onValueChange={onSortChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="most_members">Most Members</SelectItem>
                        <SelectItem value="least_members">Least Members</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}