"use client";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

// 1. Define fields based on user roles
const baseFields = [
    { key: "name", label: "Full Name" },
    { key: "username", label: "Username" },
    { key: "phone", label: "Phone Number" },
    { key: "county", label: "County" },
];

const studentFields = [
    { key: "institution", label: "Institution" },
    { key: "course", label: "Course" },
    { key: "block", label: "Year/Block" },
    { key: "nck_number", label: "Exam Number" },
];

const professionalFields = [
    { key: "specialization", label: "Specialization" },
    { key: "workplace", label: "Workplace" },
    { key: "employment_type", label: "Employment Type" },
    { key: "license_status", label: "License Status" },
];

const STORAGE_KEYS = {
    PROFILE_CACHE: "userProfile",
    LAST_MORNING_TOAST: "lastMorningToast",
    LAST_EVENING_TOAST: "lastEveningToast",
};

export function ProfileIncompleteChecker() {
    const [profile, setProfile] = useState<any>(null);

    // Helper to determine which fields are required based on the role
    const getRequiredFields = (role: string) => {
        const lowerRole = role?.toLowerCase() || "";
        if (lowerRole === "student" || lowerRole === "student_user") {
            return [...baseFields, ...studentFields];
        } else if (lowerRole === "nurse" || lowerRole === "professional") {
            return [...baseFields, ...professionalFields];
        }
        return baseFields; // Default fallback
    };

    // Core logic: Check which fields are actually missing
    const getMissingFields = (userData: any) => {
        if (!userData) return [];
        const fieldsToCheck = getRequiredFields(userData.role);

        return fieldsToCheck.filter(field => {
            const value = userData[field.key];
            return value === undefined || value === null || value.toString().trim() === "";
        });
    };

    const fetchAndCheckProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (data && !error) {
            setProfile(data);
            localStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(data));

            const missing = getMissingFields(data);

            // Only trigger toast if there are actually missing fields
            if (missing.length > 0) {
                handleTimedToasts(data, missing);
            }
        }
    };

    const handleTimedToasts = (userData: any, missing: any[]) => {
        const today = new Date().toDateString();
        const now = new Date();
        const fieldNames = missing.map(f => f.label).join(", ");

        const triggerToast = () => {
            toast({
                title: "⚠️ Profile Incomplete",
                description: `Missing: ${fieldNames}. Please update your profile in Settings.`,
                variant: "destructive",
                duration: 8000,
            });
        };

        // Morning Toast (Once a day)
        if (localStorage.getItem(STORAGE_KEYS.LAST_MORNING_TOAST) !== today) {
            triggerToast();
            localStorage.setItem(STORAGE_KEYS.LAST_MORNING_TOAST, today);
        }
        // Evening Toast (After 8 PM, once a day)
        else if (now.getHours() >= 20 && localStorage.getItem(STORAGE_KEYS.LAST_EVENING_TOAST) !== today) {
            triggerToast();
            localStorage.setItem(STORAGE_KEYS.LAST_EVENING_TOAST, today);
        }
    };

    useEffect(() => {
        // Initial check on load
        fetchAndCheckProfile();

        // Listen for local updates from Settings page
        const handleProfileUpdate = (event: any) => {
            const updatedData = event.detail;
            setProfile(updatedData);
            localStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify(updatedData));
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);

        // Refresh data every 10 minutes to stay in sync with DB
        const interval = setInterval(fetchAndCheckProfile, 600000);

        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
            clearInterval(interval);
        };
    }, []);

    return null;
}