// src/hooks/useUserProfile.ts
import { useEffect, useState, useRef } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export function useUserProfile() {
  const user = useUser();
  const [profile, setProfile] = useState<any>(() => {
    // 1️⃣ Try loading from localStorage immediately
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("userProfile");
      if (cached) return JSON.parse(cached);
    }
    return null;
  });
  const [loading, setLoading] = useState(!profile); // no loader if cached
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      // Skip fetching if profile already cached
      if (profile) return setLoading(false);

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        if (typeof window !== "undefined") {
          localStorage.setItem("userProfile", JSON.stringify(data));
        }
      } else if (error) {
        console.error("❌ Error fetching profile:", error.message);
      }

      setLoading(false);
    };

    fetchProfile();

    // 2️⃣ Optional: Subscribe to real-time changes on this user's profile
    channelRef.current = supabase
      .channel("user-profile-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new);
          if (typeof window !== "undefined") {
            localStorage.setItem("userProfile", JSON.stringify(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user]);

  return { profile, loading };
}