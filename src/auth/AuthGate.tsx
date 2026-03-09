"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { WifiOff, HeartPulse } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user } = useAuth(); // ✅ get user from global context
    const [loading, setLoading] = useState(true);

    // 🔐 Wait until user is loaded
    useEffect(() => {
        if (user !== undefined) setLoading(false); // user is either null or object
    }, [user]);

    // ⏳ Show nothing while auth is loading
    if (loading) return null;

    return <>{children}</>;
}