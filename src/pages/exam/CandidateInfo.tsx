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
            <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8">
                <div className="max-w-2xl mx-auto space-y-3">
                    <Skeleton className="h-8 w-2/3 mx-auto" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-12 w-full mt-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-background px-2 py-4 md:px-4 md:py-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">

                {/* HEADER */}
                <div className="text-center space-y-1 px-2 pt-2 md:pt-0">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Examination Gateway
                    </h1>
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">
                        Official Institutional Session
                    </p>
                </div>

                {/* INSTRUCTIONS CARD — flat, no border, no shadow */}
                <Card className="border-0 shadow-none rounded-2xl bg-white dark:bg-muted/30 overflow-hidden">
                    <CardContent className="p-4 md:p-5">
                        <div className="space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2 pb-2">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    Critical Examination Instructions
                                </p>
                            </div>

                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-2.5 md:gap-y-3 text-[11px] md:text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Identity Verification:</strong> Ensure your Full Name and Email match your official government or school ID.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Academic Records:</strong> Verify that your Institution, Course, and Block/Class are accurate for proper credit.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Exam Number:</strong> Cross-check your NCK/Exam Number with your institution's official records.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Mandatory Authorization:</strong> A valid Exam Key from your tutor is required to unlock this session.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Official Tracking:</strong> All activity is logged and recorded for official institutional exam tracking.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Session Scope:</strong> This portal is for formal exams only. Do not use for practice or self-study.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Data Integrity:</strong> Any changes made here are permanent and will be reflected in your final certificate.
                                    </span>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-2">
                                    <span className="mt-1.5 h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>
                                        <strong className="text-slate-900 dark:text-slate-200">Proctoring Ready:</strong> Ensure you have a stable connection; session interruptions are flagged automatically.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* CANDIDATE FORM — flat, no border, no shadow */}
                <Card className="border-0 shadow-none rounded-2xl bg-white dark:bg-muted/30">
                    <CardHeader className="px-4 md:px-5 pt-5 pb-2">
                        <CardTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                            Identity Verification
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            Please ensure all fields accurately reflect your institutional registration.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 md:px-5 pb-5 space-y-4 md:space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            {/* Full Name */}
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="name" className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Full Candidate Name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                    <Input
                                        id="name"
                                        className="pl-9 md:pl-10 bg-slate-100/70 dark:bg-slate-800/50 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={userData.name || ""}
                                        placeholder="Enter your full official name"
                                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Institution */}
                            <div className="space-y-1.5">
                                <Label htmlFor="institution" className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Institution
                                </Label>
                                <div className="relative">
                                    <School className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                    <Input
                                        id="institution"
                                        className="pl-9 md:pl-10 bg-slate-100/70 dark:bg-slate-800/50 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={userData.institution || ""}
                                        placeholder="University/College"
                                        onChange={(e) => setUserData({ ...userData, institution: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Exam Number */}
                            <div className="space-y-1.5">
                                <Label htmlFor="exam_number" className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Exam Number (NCK)
                                </Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                    <Input
                                        id="exam_number"
                                        className="pl-9 md:pl-10 bg-slate-100/70 dark:bg-slate-800/50 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={userData.nck_number || ""}
                                        placeholder="Official Index No."
                                        onChange={(e) => setUserData({ ...userData, nck_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Course */}
                            <div className="space-y-1.5">
                                <Label htmlFor="course" className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Course of Study
                                </Label>
                                <div className="relative">
                                    <BookOpen className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                    <Input
                                        id="course"
                                        className="pl-9 md:pl-10 bg-slate-100/70 dark:bg-slate-800/50 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={userData.course || ""}
                                        placeholder="Major / Program"
                                        onChange={(e) => setUserData({ ...userData, course: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Block / Class */}
                            <div className="space-y-1.5">
                                <Label htmlFor="class" className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Block / Class
                                </Label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-2.5 h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                                    <Input
                                        id="class"
                                        className="pl-9 md:pl-10 bg-slate-100/70 dark:bg-slate-800/50 border-0 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={userData.block_class || userData.block || ""}
                                        placeholder="e.g. Year 3 - Group B"
                                        onChange={(e) => setUserData({ ...userData, block_class: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full h-12 md:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 transition-all rounded-xl text-sm md:text-base border-0"
                                onClick={handleProceed}
                            >
                                Verify Details & Continue
                            </Button>
                            <p className="mt-3 text-[9px] md:text-[10px] text-center text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-semibold">
                                Authorized Access Only • Security Logged System
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}