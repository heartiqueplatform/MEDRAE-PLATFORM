"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient"; // adjust path if needed

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRoleAndRedirect = async () => {
      try {
        // 1. Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          // 🔹 Not logged in → stay on Index (only redirect if not already there)
          if (location.pathname !== "/") {
            navigate("/");
          }
          return;
        }

        // 2. If logged in, fetch role
        let role = localStorage.getItem("userRole") || "student";

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role) {
          role = profile.role;
          localStorage.setItem("userRole", role); // sync localStorage
        }

        // 3. Redirect to dashboard by role
        navigate(`/dashboard/${role}`);
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/"); // fallback → send to index
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center 
                      bg-white dark:bg-gray-900 transition-colors duration-300 z-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-gray-900 dark:text-gray-100 text-lg">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return null;
}
