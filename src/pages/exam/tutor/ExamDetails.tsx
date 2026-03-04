"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft } from "lucide-react"; // Lucide icon

const TutorExamDetails = () => {
    const { paper_id } = useParams();
    const navigate = useNavigate();

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch existing instructions on mount
    useEffect(() => {
        if (!paper_id) return;

        const fetchInstruction = async () => {
            const { data, error } = await supabase
                .from("exam_instructions")
                .select("content")
                .eq("paper_id", paper_id)
                .single(); // get the single row if exists

            if (error && error.code !== "PGRST116") { // ignore "no rows" error
                console.error(error);
                return;
            }

            if (data?.content) setContent(data.content);
        };

        fetchInstruction();
    }, [paper_id]);

    const handleSaveInstruction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!paper_id) {
            alert("Invalid paper ID");
            return;
        }

        setLoading(true);

        // Upsert instead of insert: create new or update existing
        const { error } = await supabase
            .from("exam_instructions")
            .upsert([
                {
                    paper_id,
                    content,
                },
            ], { onConflict: ["paper_id"] });

        setLoading(false);

        if (error) {
            console.error(error);
            alert("Error saving instructions");
            return;
        }

        navigate(`/tutor/exams/${paper_id}/live`);
    };

    const handleBack = () => {
        const confirmBack = window.confirm(
            "Warning: Going back will discard any progress and the tutor will have to start all over again. Are you sure you want to leave this page?"
        );
        if (!confirmBack) return;
        navigate("/tutor/exams"); // Go back to exam list page
    };

    return (
        <div className="min-h-screen bg-transparent pt-0 p-6 flex justify-center items-start">
            <div className="w-full max-w-4xl bg-white/20 dark:bg-gray-800/20 p-6 rounded-2xl shadow-lg backdrop-blur-md">

                {/* Back button */}
                <button
                    onClick={handleBack}
                    className="flex items-center text-gray-900 dark:text-white mb-4 hover:text-green-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back to Exam List
                </button>

                <h1 className="text-3xl font-semibold mb-6 text-gray-900 dark:text-white">
                    Add Exam Instructions
                </h1>

                <form onSubmit={handleSaveInstruction} className="space-y-4">
                    <textarea
                        placeholder={`Example:

School: ________
Class/Grade: ________
Subject: ________
Date: ________
Duration: ________
Instructions: Please read carefully...`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        rows={10}
                        className="w-full p-4 rounded-lg bg-white/70 dark:bg-gray-700/70 focus:ring-2 focus:ring-green-500 outline-none placeholder-gray-500 resize-none"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? "Saving..." : "Save & Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TutorExamDetails;