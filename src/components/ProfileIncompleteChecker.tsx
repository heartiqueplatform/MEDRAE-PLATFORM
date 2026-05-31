"use client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const requiredFields = [
    { key: "name", label: "Full Name" },
    { key: "username", label: "Username" },
    { key: "phone", label: "Phone Number" },
    { key: "institution", label: "Institution" },
    { key: "course", label: "Course" },
    { key: "block", label: "Block" },
    { key: "county", label: "County" },
    { key: "nck_number", label: "NCK Number/Exam number" },
    { key: "specialization", label: "Specialization" },
    { key: "workplace", label: "Workplace" },
    { key: "employment_type", label: "Employment Type" },
    { key: "license_status", label: "License Status" },
];

// Storage keys
const STORAGE_KEYS = {
    PROFILE_CACHE: "userProfile",
    LAST_MORNING_TOAST: "lastMorningToast",
    LAST_EVENING_TOAST: "lastEveningToast",
    PROFILE_CHECK_CACHE: "profileCheckCache",
};

export function ProfileIncompleteChecker() {
    const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

    // Check if profile is complete from cache (no Supabase call)
    const checkProfileCompleteness = (profile: any): boolean => {
        if (!profile) return false;

        const incompleteFields = requiredFields.filter(field => {
            const value = profile[field.key];
            return !value || value.toString().trim() === "";
        });

        return incompleteFields.length === 0;
    };

    // Get cached profile without calling Supabase
    const getCachedProfile = () => {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.PROFILE_CACHE);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    };

    // Check if we should show toast based on time of day
    const shouldShowToast = (toastType: 'morning' | 'evening'): boolean => {
        const now = new Date();
        const today = now.toDateString();

        if (toastType === 'morning') {
            const lastMorning = localStorage.getItem(STORAGE_KEYS.LAST_MORNING_TOAST);
            // Show if never shown today
            return lastMorning !== today;
        } else {
            const lastEvening = localStorage.getItem(STORAGE_KEYS.LAST_EVENING_TOAST);
            // Show if never shown today
            return lastEvening !== today;
        }
    };

    // Mark toast as shown
    const markToastShown = (toastType: 'morning' | 'evening') => {
        const today = new Date().toDateString();
        if (toastType === 'morning') {
            localStorage.setItem(STORAGE_KEYS.LAST_MORNING_TOAST, today);
        } else {
            localStorage.setItem(STORAGE_KEYS.LAST_EVENING_TOAST, today);
        }
    };

    // Check if current time is within a specific hour range
    const isTimeForEveningToast = (): boolean => {
        const now = new Date();
        const currentHour = now.getHours();
        // Show evening toast between 8 PM and 9 PM (20:00 - 21:00)
        return currentHour >= 20 && currentHour < 21;
    };

    // Show toast if profile incomplete
    const showIncompleteToast = (profile: any) => {
        if (!profile) return;

        const incompleteFields = requiredFields.filter(field => {
            const value = profile[field.key];
            return !value || value.toString().trim() === "";
        });

        if (incompleteFields.length > 0) {
            const fieldNames = incompleteFields.map(f => f.label).join(", ");
            toast({
                title: "⚠️ Profile Incomplete",
                description: `Please complete: ${fieldNames}`,
                variant: "destructive",
                duration: 5000, // Show for 5 seconds
            });
            return true;
        }
        return false;
    };

    // Handle morning toast (first visit of the day)
    const handleMorningToast = (profile: any) => {
        if (shouldShowToast('morning')) {
            const shown = showIncompleteToast(profile);
            if (shown) {
                markToastShown('morning');
            }
        }
    };

    // Handle evening toast (8 PM)
    const handleEveningToast = (profile: any) => {
        if (isTimeForEveningToast() && shouldShowToast('evening')) {
            const shown = showIncompleteToast(profile);
            if (shown) {
                markToastShown('evening');
            }
        }
    };

    // Fetch profile only once when component mounts (to get fresh data if needed)
    useEffect(() => {
        const fetchProfileOnce = async () => {
            // First, try to get from cache
            let profile = getCachedProfile();

            // If no cache or cache is old (more than 24 hours), fetch fresh
            const lastCheck = localStorage.getItem(STORAGE_KEYS.PROFILE_CHECK_CACHE);
            const shouldRefresh = !lastCheck || (Date.now() - parseInt(lastCheck) > 24 * 60 * 60 * 1000);

            if (!profile || shouldRefresh) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data } = await supabase
                            .from("profiles")
                            .select("*")
                            .eq("user_id", user.id)
                            .single();

                        if (data) {
                            profile = data;
                            localStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(data));
                            localStorage.setItem(STORAGE_KEYS.PROFILE_CHECK_CACHE, Date.now().toString());
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch profile:", error);
                }
            }

            const complete = checkProfileCompleteness(profile);
            setIsProfileComplete(complete);

            // Show morning toast on first visit of the day
            handleMorningToast(profile);

            // Check for evening toast
            handleEveningToast(profile);
        };

        fetchProfileOnce();

        // Set up interval to check for evening toast every minute (only checks time, no Supabase)
        const interval = setInterval(() => {
            if (!isProfileComplete) {
                const profile = getCachedProfile();
                if (profile) {
                    handleEveningToast(profile);
                }
            }
        }, 60000); // Check every minute for 8 PM

        return () => clearInterval(interval);
    }, []); // Empty dependency array - only runs once on mount

    // Listen for profile updates from other components
    useEffect(() => {
        const handleProfileUpdate = (event: CustomEvent) => {
            const updatedProfile = event.detail;
            if (updatedProfile) {
                const complete = checkProfileCompleteness(updatedProfile);
                setIsProfileComplete(complete);
            }
        };

        window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    }, []);

    return null; // This component doesn't render anything
}