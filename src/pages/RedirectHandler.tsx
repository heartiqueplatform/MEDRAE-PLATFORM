import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";

export default function RedirectHandler() {
    const { code } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const handleRedirect = async () => {
            // 1. Look for the code in Supabase
            const { data, error } = await supabase
                .from("links")
                .select("original_url")
                .eq("short_code", code?.toUpperCase())
                .single();

            // Small delay so the user sees your nice loader for a second
            setTimeout(() => {
                if (data && !error) {
                    navigate(data.original_url);
                } else {
                    console.error("Link not found:", error);
                    navigate("/");
                }
            }, 1000);
        };
        handleRedirect();
    }, [code, navigate]);

    // We use a fixed div to "cover" the black space caused by the SidebarProvider
    return (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
            <div className="text-center">
                <GlobalLoader />
                <p className="mt-4 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
                    Verifying Access...
                </p>
            </div>
        </div>
    );
}