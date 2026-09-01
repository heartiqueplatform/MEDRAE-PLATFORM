"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Info, ShieldCheck, User, School, BookOpen, Hash, GraduationCap } from "lucide-react";

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
            <div className="max-w-xl mx-auto mt-10 space-y-4 px-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto mt-4 md:mt-6 space-y-4 md:space-y-6 px-0 md:px-4">
            {/* Header Section - Mobile Native */}
            <div className="text-center space-y-1 md:space-y-2 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Examination Gateway
                </h1>
                <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest font-medium">
                    Official Institutional Session
                </p>
            </div>

            {/* Instructions Card - Mobile Native */}
            <Card className="border-0  rounded-none md:rounded-xl shadow-none md:shadow-sm dark:bg-muted/30 mx-4 md:mx-0">
                <CardContent className="p-3 md:p-4">
                    <div className="flex items-start gap-2 md:gap-3">

                        <div className="space-y-3 md:space-y-4 w-full">
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    Critical Examination Instructions
                                </p>
                            </div>

                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-2 md:gap-y-3 text-[11px] md:text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Identity Verification:</strong> Ensure your Full Name and Email match your official government or school ID.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Academic Records:</strong> Verify that your Institution, Course, and Block/Class are accurate for proper credit.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Exam Number:</strong> Cross-check your NCK/Exam Number with your institution's official records.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Mandatory Authorization:</strong> A valid Exam Key from your tutor is required to unlock this session.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Official Tracking:</strong> All activity is logged and recorded for official institutional exam tracking.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Session Scope:</strong> This portal is for formal exams only. Do not use for practice or self-study.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Data Integrity:</strong> Any changes made here are permanent and will be reflected in your final certificate.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Proctoring Ready:</strong> Ensure you have a stable connection; session interruptions are flagged automatically.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Candidate form - Mobile Native */}
            <Card className="border-0 rounded-none md:rounded-xl shadow-none md:shadow-md dark:bg-muted/30 mx-4 md:mx-0">
                <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
                    <CardTitle className="text-base md:text-lg font-medium">Identity Verification</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                        Please ensure all fields accurately reflect your institutional registration.
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4 md:space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {/* Full Name */}
                        <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                            <Label htmlFor="name" className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Full Candidate Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                <Input
                                    id="name"
                                    className="pl-9 md:pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl text-sm"
                                    value={userData.name || ""}
                                    placeholder="Enter your full official name"
                                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Institution */}
                        <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="institution" className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Institution</Label>
                            <div className="relative">
                                <School className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                <Input
                                    id="institution"
                                    className="pl-9 md:pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl text-sm"
                                    value={userData.institution || ""}
                                    placeholder="University/College"
                                    onChange={(e) => setUserData({ ...userData, institution: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Exam Number */}
                        <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="exam_number" className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Exam Number (NCK)</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                <Input
                                    id="exam_number"
                                    className="pl-9 md:pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl text-sm"
                                    value={userData.nck_number || ""}
                                    placeholder="Official Index No."
                                    onChange={(e) => setUserData({ ...userData, nck_number: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Course */}
                        <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="course" className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Course of Study</Label>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                <Input
                                    id="course"
                                    className="pl-9 md:pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl text-sm"
                                    value={userData.course || ""}
                                    placeholder="Major / Program"
                                    onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Block / Class */}
                        <div className="space-y-1.5 md:space-y-2">
                            <Label htmlFor="class" className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Block / Class</Label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                <Input
                                    id="class"
                                    className="pl-9 md:pl-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl text-sm"
                                    value={userData.block_class || ""}
                                    placeholder="e.g. Year 3 - Group B"
                                    onChange={(e) => setUserData({ ...userData, block_class: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 md:pt-4">
                        <Button
                            className="w-full bg-grey-100 dark:bg-grey-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 text-black font-semibold py-5 md:py-6 transition-all rounded-lg md:rounded-xl text-sm md:text-base"
                            onClick={handleProceed}
                        >
                            Verify Details & Continue
                        </Button>
                        <p className="mt-3 md:mt-4 text-[8px] md:text-[10px] text-center text-slate-400 uppercase tracking-tighter">
                            Authorized Access Only • Security Logged System
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}