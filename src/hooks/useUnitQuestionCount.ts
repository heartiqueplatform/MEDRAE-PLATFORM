import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UnitQuestionCount = {
  unit: string;
  unit_code: string;
  count: number;
};

export function useUnitQuestionCount() {
  const [data, setData] = useState<UnitQuestionCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("quiz_question_counts").select("*");
    if (error) console.error("Error fetching unit counts:", error.message);
    else setData(data as UnitQuestionCount[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();

    const subscription = supabase
      .channel("quiz_question_counts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_question_counts" },
        (payload) => {
          setData((prev) =>
          prev.map((u) =>
             u.unit_code === payload.new.unit_code ? payload.new : u
          )
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const incrementCount = (unitCode: string) => {
    setData((prev) =>
      prev.map((u) =>
        u.unit_code?.trim().toLowerCase() === unitCode.trim().toLowerCase()
          ? { ...u, count: u.count + 1 }
          : u
      )
    );
  };

  return { data, loading, incrementCount, refreshCounts: fetchCounts };
}
