"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, ChevronLeft } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export default function ExamInstructions() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [examKey, setExamKey] = useState("");
    const [paperId, setPaperId] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<string>("");
    const [examInfo, setExamInfo] = useState<any>(null);
    const [loadingPage, setLoadingPage] = useState(true);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [keyVerified, setKeyVerified] = useState(false);

    const [secondsLeft, setSecondsLeft] = useState<number | null>(10);
    const [canStart, setCanStart] = useState(false);
    const [existingSession, setExistingSession] = useState<any>(null);

    useEffect(() => {
        const timer = setTimeout(() => setLoadingPage(false), 300);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (secondsLeft === null || secondsLeft <= 0) {
            setCanStart(true);
            return;
        }
        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsLeft]);

    const verifyKey = async () => {
        if (!examKey) return;

        const { data: paper, error } = await supabase
            .from("exam_papers")
            .select("*")
            .eq("exam_key", examKey)
            .single();

        if (error || !paper) {
            setKeyError("Invalid exam key. Please check with your school.");
            return;
        }

        setPaperId(paper.id);
        setExamInfo(paper);
        setKeyVerified(true);
        setKeyError(null);

        if (paper.scheduled_start) {
            const startTime = new Date(paper.scheduled_start).getTime();
            const now = Date.now();
            const diff = Math.floor((startTime - now) / 1000);
            setSecondsLeft(diff > 0 ? diff : 0);
            if (diff <= 0) setCanStart(true);
        }

        const { data: instr, error: instrError } = await supabase
            .from("exam_instructions")
            .select("content")
            .eq("paper_id", paper.id)
            .single();

        setInstructions(instrError || !instr ? "No instructions found for this exam." : instr.content);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) return;

        const { data: sessionData } = await supabase
            .from("exam_sessions")
            .select("*")
            .eq("paper_id", paper.id)
            .eq("user_id", user.id)
            .single();

        if (sessionData) {
            setExistingSession(sessionData);

            const startedAt = new Date(sessionData.started_at).getTime();
            const durationSec = paper.duration * 60;
            const now = Date.now();
            const elapsed = Math.floor((now - startedAt) / 1000);
            const remaining = durationSec - elapsed;
            setSecondsLeft(remaining > 0 ? remaining : 0);
            setCanStart(remaining > 0);

            toast({
                title: "Exam Already Started",
                description: "You have an existing session. You can continue the exam.",
                variant: "destructive",
            });
        }
    };

    const startSession = async () => {
        if (!paperId) return null;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) {
            console.error("User not logged in:", userError);
            return null;
        }

        if (existingSession) return existingSession;

        const { data, error } = await supabase
            .from("exam_sessions")
            .insert([{
                paper_id: paperId,
                user_id: user.id,
                started_at: new Date().toISOString(),
                status: "started",
            }])
            .select()
            .single();

        if (error) {
            console.error("Error starting session:", error);
            return null;
        }

        toast({
            title: "Exam Started",
            description: "Your exam session has begun. Good luck!",
        });

        setExistingSession(data);
        return data;
    };

    const handleStartExam = async () => {
        if (!canStart || !paperId) return;
        const session = await startSession();
        if (session) {
            navigate(`/exam/access/${paperId}?session_id=${session.id}`);
        }
    };

    const formatCountdown = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (loadingPage) return <GlobalLoader message="Setting up exam page..." />;

    return (
        <div className="min-h-screen bg-transparen pt-0 t p-6 flex justify-center items-start">
            <div className="w-full max-w-3xl space-y-2 relative">



                {/* Exam Key Overlay */}
                {!keyVerified && (
                    <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-50 px-4">
                        <Card className="max-w-md w-full p-6 relative">
                            <button
                                onClick={() => navigate(-1)}
                                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                                <X className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                            </button>
                            <CardHeader>
                                <CardTitle className="text-center text-2xl font-bold">Enter Exam Key</CardTitle>
                                <CardDescription className="text-center text-sm text-muted-foreground">
                                    Please enter your school's exam key to access instructions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Input
                                    placeholder="Enter Exam Key"
                                    value={examKey}
                                    onChange={(e) => setExamKey(e.target.value)}
                                />
                                {keyError && <p className="text-red-500 text-sm">{keyError}</p>}
                                <Button className="w-full mt-2" onClick={verifyKey}>
                                    Verify Key
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main Exam Instructions */}
                {keyVerified && examInfo && (
                    <div className="space-y-2">

                        <Card className="border-0 shadow-md ">
                            <CardHeader>
                                {/* Back button */}
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium mb-4"
                                >
                                    <ChevronLeft size={20} /> Back
                                </button>
                                <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                                    {examInfo.title}
                                </CardTitle>
                                <CardDescription className="text-center text-sm text-muted-foreground">
                                    {examInfo.course || "-"} | {examInfo.block || "-"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                                <div><strong>Description:</strong> {examInfo.description || "-"}</div>
                                <div><strong>Duration:</strong> {examInfo.duration} mins</div>
                                <div><strong>Public Exam:</strong> {examInfo.is_public ? "Yes" : "No"}</div>
                                <div><strong>Free Exam:</strong> {examInfo.is_free ? "Yes" : "No"}</div>
                                <div><strong>Active:</strong> {examInfo.is_active ? "Yes" : "No"}</div>
                                <div><strong>Released:</strong> {examInfo.is_released ? "Yes" : "No"}</div>
                                <div><strong>Results Released:</strong> {examInfo.results_released ? "Yes" : "No"}</div>
                                <div><strong>Closed At:</strong> {examInfo.closed_at ? new Date(examInfo.closed_at).toLocaleString() : "-"}</div>
                                <div><strong>Scheduled:</strong> {examInfo.scheduled_start ? new Date(examInfo.scheduled_start).toLocaleString() : "-"} - {examInfo.scheduled_end ? new Date(examInfo.scheduled_end).toLocaleString() : "-"}</div>
                                <div><strong>Max Tab Switch:</strong> {examInfo.max_tab_switch}</div>
                                <div><strong>Auto Submit on Violation:</strong> {examInfo.auto_submit_on_violation ? "Yes" : "No"}</div>
                                <div><strong>Strict Mode:</strong> {examInfo.strict_mode ? "Yes" : "No"}</div>
                                <div><strong>Max Violation Limit:</strong> {examInfo.max_violation_limit}</div>
                                {secondsLeft !== null && secondsLeft > 0 && (
                                    <div className="col-span-full text-center font-bold text-orange-600">
                                        Exam starts in: {formatCountdown(secondsLeft)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Instructions */}
                        <Card className="border-0">
                            <CardHeader>
                                <CardTitle className="text-center text-lg">Exam Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-gray-900 dark:text-gray-50 leading-relaxed">                             {instructions.split("\n").map((line, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 mt-1 text-yellow-500" />
                                    <span>{line}</span>
                                </div>
                            ))}
                                <Button
                                    className={`w-full mt-4 text-white font-bold ${canStart && paperId ? "bg-green-600 hover:bg-green-700" : "bg-red-600 cursor-not-allowed"}`}
                                    onClick={handleStartExam}
                                    disabled={!canStart || !paperId}
                                >
                                    {existingSession ? "Continue Exam" : canStart ? "Begin Exam" : "Please wait..."}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}