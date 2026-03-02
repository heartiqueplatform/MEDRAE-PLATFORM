"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileModal } from "@/components/UserProfileModal";

export default function AllUsersPopover({ totalUsers }: { totalUsers?: number }) {
    const [open, setOpen] = useState(false);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const fetchAllProfiles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("user_id, name, username, role, avatar_url, is_online, created_at"); // <-- include created_at
        if (!error && data) setAllProfiles(data);
        setLoading(false);
    };

    // Helper to check if user is new (<7 days old)
    const isNewUser = (createdAt: string) => {
        if (!createdAt) return false;
        const createdTime = new Date(createdAt).getTime();
        const now = new Date().getTime();
        return now - createdTime < 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    };

    // Sort users: new users first
    const sortedProfiles = allProfiles.slice().sort((a, b) => {
        const aNew = isNewUser(a.created_at);
        const bNew = isNewUser(b.created_at);
        return Number(bNew) - Number(aNew); // new users first
    });

    return (
        <>
            <Popover
                open={open}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                    if (isOpen) fetchAllProfiles();
                }}
            >
                <PopoverTrigger asChild>
                    {/* Wrap SVG + badge together */}
                    <div className="hidden sm:flex items-center gap-1 cursor-pointer">
                        {/* SVG icon */}
                        <svg
                            xmlns="http://www.w3org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6 text-blue-500"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952
                                4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07
                                M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766
                                l-.001-.109a6.375 6.375 0 0 1 11.964-3.07
                                M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25
                                a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                            />
                        </svg>

                        {/* Badge */}
                        <Badge className="h-5 px-2 text-xs bg-blue-500 text-white">
                            {totalUsers ?? "-"}
                        </Badge>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-72 max-h-80 overflow-y-auto custom-scrollbar p-2 bg-card ">
                    <h4 className="font-semibold text-sm mb-2">All Users</h4>
                    {loading ? (
                        <p className="text-xs text-gray-500">Loading...</p>
                    ) : (
                        <ul className="space-y-2">
                            {sortedProfiles.map((u) => {
                                const newUser = isNewUser(u.created_at);
                                return (
                                    <li
                                        key={u.user_id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded"
                                        onClick={() => setSelectedUserId(u.user_id)}
                                    >
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={u.avatar_url ?? undefined} />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                                {u.name?.split(" ").map((n: string) => n[0]).join("")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate text-sm">
                                            <div className="font-medium flex items-center gap-1">
                                                {u.name}
                                                {newUser && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs bg-green-500 text-white"
                                                    >
                                                        New
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex gap-1 items-center">
                                                {u.username && <span>@{u.username}</span>}
                                                <span>{u.role}</span>
                                            </div>
                                        </div>
                                        {u.is_online && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </PopoverContent>
            </Popover>

            {/* User Profile Modal */}
            {selectedUserId && (
                <UserProfileModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </>
    );
}