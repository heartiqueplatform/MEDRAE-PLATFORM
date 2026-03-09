// src/hooks/useUnitQuestionCount.ts
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export type UnitQuestionCount = {
  unit: string;
  unit_code: string;
  count: number;
};

export function useUnitQuestionCount() {
  const [data, setData] = useState<UnitQuestionCount[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("unitQuestionCounts");
      if (cached) return JSON.parse(cached);
    }
    return [];
  });
  const [loading, setLoading] = useState(data.length === 0); // loading only if no cached data
  const channelRef = useRef<any>(null);

  const fetchCounts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("quiz_question_counts").select("*");
    if (error) console.error("Error fetching unit counts:", error.message);
    else {
      setData(data as UnitQuestionCount[]);
      if (typeof window !== "undefined") {
        localStorage.setItem("unitQuestionCounts", JSON.stringify(data));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Fetch if no cached data
    if (data.length === 0) fetchCounts();

    // Real-time subscription
    channelRef.current = supabase
      .channel("quiz_question_counts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_question_counts" },
        (payload: any) => {
          setData((prev) => {
            const updated = prev.map((u) =>
              u.unit_code === payload.new.unit_code ? payload.new : u
            );
            // update cache
            if (typeof window !== "undefined") {
              localStorage.setItem("unitQuestionCounts", JSON.stringify(updated));
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const incrementCount = (unitCode: string) => {
    setData((prev) => {
      const updated = prev.map((u) =>
        u.unit_code?.trim().toLowerCase() === unitCode.trim().toLowerCase()
          ? { ...u, count: u.count + 1 }
          : u
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("unitQuestionCounts", JSON.stringify(updated));
      }
      return updated;
    });
  };

  return { data, loading, incrementCount, refreshCounts: fetchCounts };
}