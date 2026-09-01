// src/context/UserRoleContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserRoleContextType {
    role: string;
    setRole: (role: string) => void;
    refreshRole: () => Promise<void>;
    isLoading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<string>("student");
    const [isLoading, setIsLoading] = useState(true);

    const refreshRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            // Check localStorage first for speed
            const cachedRole = localStorage.getItem(`userRole_${user.id}`);
            if (cachedRole) {
                setRole(cachedRole);
            }

            // Then verify with database
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching role:", error);
                setIsLoading(false);
                return;
            }

            if (profile?.role) {
                setRole(profile.role);
                localStorage.setItem(`userRole_${user.id}`, profile.role);
                localStorage.setItem("last_known_role", profile.role);
            }
        } catch (error) {
            console.error("Error in refreshRole:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshRole();

        // Listen for role changes from settings
        const handleRoleChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            const newRole = customEvent.detail?.role;
            if (newRole) {
                setRole(newRole);
                // Force reload to refresh all components
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        };

        // Listen for profile updates
        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            const updatedProfile = customEvent.detail;
            if (updatedProfile?.role) {
                setRole(updatedProfile.role);
                if (updatedProfile.user_id) {
                    localStorage.setItem(`userRole_${updatedProfile.user_id}`, updatedProfile.role);
                }
                localStorage.setItem("last_known_role", updatedProfile.role);
            }
        };

        window.addEventListener("roleChanged", handleRoleChange);
        window.addEventListener("profileUpdated", handleProfileUpdate);

        return () => {
            window.removeEventListener("roleChanged", handleRoleChange);
            window.removeEventListener("profileUpdated", handleProfileUpdate);
        };
    }, []);

    return (
        <UserRoleContext.Provider value={{ role, setRole, refreshRole, isLoading }}>
            {children}
        </UserRoleContext.Provider>
    );
}

export function useUserRole() {
    const context = useContext(UserRoleContext);
    if (!context) {
        throw new Error("useUserRole must be used within a UserRoleProvider");
    }
    return context;
}