// src/hooks/useUserProfile.ts
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export function useUserProfile() {
  const user = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error) setProfile(data);
      else console.error("❌ Error fetching profile:", error.message);

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  return { profile, loading };
}
