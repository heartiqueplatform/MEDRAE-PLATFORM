"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateInfo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const localKey = "candidateInfo";

    // 1. Load from localStorage first
    const cached = localStorage.getItem(localKey);
    if (cached) {
      setUserData(JSON.parse(cached));
      setLoading(false); // show immediately
    }

    // 2. Fetch latest from Supabase silently
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No auth user found");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUserData(data);
        localStorage.setItem(localKey, JSON.stringify(data)); // cache latest
      }
    };

    fetchUserData();
  }, []);

  const handleStart = () => {
    navigate("/quiz-simulation/instructions");
  };

  if (loading && !userData) {
    return (
      <div className="max-w-xl mx-auto mt-10 space-y-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center mt-10 text-red-500">
        Could not load your user data.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Confirm Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input disabled value={userData.full_name || ""} placeholder="Full Name" />
          <Input disabled value={userData.institution || ""} placeholder="Institution" />
          <Input disabled value={userData.course || ""} placeholder="Course" />
          <Input disabled value={userData.block_class || ""} placeholder="Block / Class" />
          <Input disabled value={userData.nck_number || ""} placeholder="NCK Number" />
          <Button className="w-full mt-4" onClick={handleStart}>
            Proceed to Instructions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
