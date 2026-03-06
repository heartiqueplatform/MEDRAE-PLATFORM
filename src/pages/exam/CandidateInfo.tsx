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
    const [userData, setUserData] = useState<any>({
        name: "",
        email: "",
        institution: "",
        course: "",
        block: "",
        nck_number: "",
    });

    // Load cached data or fetch from Supabase
    useEffect(() => {
        const localKey = "candidateInfo";
        const cached = localStorage.getItem(localKey);

        if (cached) {
            setUserData(JSON.parse(cached));
            setLoading(false);
        }

        const fetchUserData = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error("No auth user found");
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) {
                console.error("Error fetching user:", error.message);
            } else {
                setUserData(data);
                localStorage.setItem(localKey, JSON.stringify(data));
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleProceed = async () => {
        localStorage.setItem("candidateInfo", JSON.stringify(userData));

        let paperId = "no-paper";
        try {
            const { data, error } = await supabase
                .from("exam_papers")
                .select("id")
                .limit(1)
                .single();

            if (data && data.id) {
                paperId = data.id;
            }
        } catch (err) {
            console.error("Error fetching paper:", err);
        }

        navigate(`/exam/instructions/${paperId}`);
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto mt-10 space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto mt-0 space-y-2">
            {/* Hand-coded instructions */}
            <Card className="border-0 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 p-4 pt-0">
                <CardContent className="space-y-2">
                    <p className="font-semibold">Important Instructions:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Please review and ensure your <strong>Full Name</strong> and <strong>Email</strong> match your official ID.</li>
                        <li>Verify that your <strong>Institution</strong>, <strong>Course</strong>, and <strong>Block/Class</strong> are correct.</li>
                        <li>Check that your <strong>Exam Number</strong> is accurate and matches your institution's records.</li>
                        <li>This page is for <strong>institutional exams only</strong>. You must have a valid <strong>Exam Key</strong> provided by your tutor to continue.</li>
                        <li>Changes made here will be recorded and used for <strong>official exam tracking</strong>.</li>
                        <li>Do not proceed if the exam is personal, practice, or self-study; use your designated personal study pages for those.</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Candidate form */}
            <Card className="border-0 bg-background text-foreground">
                <CardHeader>
                    <CardTitle className="text-center">Confirm and Edit Your Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Input
                        value={userData.name}
                        placeholder="Full Name"
                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                        className="bg-input text-foreground border"
                    />
                    <Input
                        value={userData.institution}
                        placeholder="Institution"
                        onChange={(e) => setUserData({ ...userData, institution: e.target.value })}
                        className="bg-input text-foreground border"
                    />
                    <Input
                        value={userData.course}
                        placeholder="Course"
                        onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                        className="bg-input text-foreground border"
                    />
                    <Input
                        value={userData.block_class}
                        placeholder="Block / Class"
                        onChange={(e) => setUserData({ ...userData, block_class: e.target.value })}
                        className="bg-input text-foreground border"
                    />
                    <Input
                        value={userData.nck_number}
                        placeholder="Exam Number"
                        onChange={(e) => setUserData({ ...userData, nck_number: e.target.value })}
                        className="bg-input text-foreground border"
                    />

                    <Button className="w-full mt-4" onClick={handleProceed}>
                        Proceed to Instructions
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}