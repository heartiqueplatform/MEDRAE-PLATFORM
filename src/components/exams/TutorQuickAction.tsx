// components/exams/TutorQuickAction.tsx

"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    PlusCircle,
    Users,
    FileText,
    GraduationCap,
    CheckCircle,
    ArrowRight,
    BookOpen,
    Copy,
    Check,
    Mail,
    PlayCircle,
    FileSpreadsheet,
    BarChart3,
    HelpCircle,
    X,
    ClipboardList,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

type Step = {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    isCompleted: boolean;
    isActive: boolean;
};

const TutorQuickAction = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = useUser();
    const [showGuide, setShowGuide] = useState(false);
    const [copied, setCopied] = useState(false);
    const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Steps for the guide
    const [steps, setSteps] = useState<Step[]>([
        {
            id: 1,
            title: "Create Assessment",
            description: "Set up your assessment with title, course, duration, and security settings",
            icon: <PlusCircle className="w-5 h-5" />,
            isCompleted: false,
            isActive: true,
        },
        {
            id: 2,
            title: "Add Instructions",
            description: "Write assessment instructions and guidelines for students",
            icon: <FileText className="w-5 h-5" />,
            isCompleted: false,
            isActive: false,
        },
        {
            id: 3,
            title: "Add Questions",
            description: "Create or import questions for your assessment",
            icon: <FileSpreadsheet className="w-5 h-5" />,
            isCompleted: false,
            isActive: false,
        },
        {
            id: 4,
            title: "Share Access Code",
            description: "Share the assessment access key with your students",
            icon: <Users className="w-5 h-5" />,
            isCompleted: false,
            isActive: false,
        },
        {
            id: 5,
            title: "Monitor & Release Results",
            description: "Monitor student progress and release results when ready",
            icon: <BarChart3 className="w-5 h-5" />,
            isCompleted: false,
            isActive: false,
        }
    ]);

    useEffect(() => {
        fetchRecentAssessments();
    }, []);

    const fetchRecentAssessments = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("exam_papers")
                .select("id, title, course, block, created_at, is_released")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false })
                .limit(5);

            if (!error && data) {
                setRecentAssessments(data);
            }
        } catch (err) {
            console.error("Error fetching recent assessments:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAssessment = () => {
        navigate("/tutor/exams");
    };

    const handleContinueAssessment = (assessmentId: string) => {
        navigate(`/tutor/exams/${assessmentId}`);
    };

    const handleViewResults = () => {
        // Navigate to the first recent assessment's results page
        if (recentAssessments.length > 0) {
            navigate(`/tutor/exams/${recentAssessments[0].id}/results`);
        } else {
            toast({
                title: "No Assessments Found",
                description: "Please create an assessment first to view results.",
            });
            navigate("/tutor/exams");
        }
    };
    const handleInviteStudents = () => {
        const appUrl = window.location.origin;
        const message = `📚 *MEDRAE ASSIGNMENT INVITATION*

Hello Students,

You are invited to join the Medrae Assignment Platform.

🔑 *Getting Started:*
1. Click the link below to create your account
2. Complete your profile with your details
3. Enter the assignment access key provided by your tutor
4. Begin your assignment

🌐 *Platform Link:*
${appUrl}

📋 *Important Notes:*
• Use the same email you registered with
• Keep your access key confidential
• Ensure stable internet connection
• Contact your tutor for any issues

*Best of luck with your assignments!* 🎓

---
Medrae - Advancing Nursing Education`;

        // Open WhatsApp without a specific number (user selects contact)
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');

        // Also copy to clipboard as fallback
        navigator.clipboard.writeText(message);

        setCopied(true);
        toast({
            title: "Message Ready!",
            description: "WhatsApp opened with invitation. Message also copied to clipboard.",
        });
        setTimeout(() => setCopied(false), 3000);
    };
    const handleStepClick = (stepId: number) => {
        switch (stepId) {
            case 1:
                navigate("/tutor/exams");
                break;
            case 2:
                if (recentAssessments.length > 0) {
                    navigate(`/tutor/exams/${recentAssessments[0].id}`);
                } else {
                    toast({
                        title: "Create an Assessment First",
                        description: "Please create an assessment before adding instructions.",
                    });
                }
                break;
            case 3:
                if (recentAssessments.length > 0) {
                    navigate(`/tutor/exams/${recentAssessments[0].id}/live`);
                } else {
                    toast({
                        title: "Create an Assessment First",
                        description: "Please create an assessment before adding questions.",
                    });
                }
                break;
            case 4:
                toast({
                    title: "Share Access Code",
                    description: "Each assessment has a unique access key. Share it with your students.",
                });
                break;
            case 5:
                if (recentAssessments.length > 0) {
                    navigate(`/tutor/exams/${recentAssessments[0].id}/results`);
                } else {
                    toast({
                        title: "No Assessments Found",
                        description: "Please create an assessment first to view results.",
                    });
                    navigate("/tutor/exams");
                }
                break;
            default:
                break;
        }
    };

    const getAssessmentStatus = (assessment: any) => {
        if (assessment.is_released) {
            return { label: "Published", color: "bg-emerald-500" };
        }
        return { label: "Draft", color: "bg-amber-500" };
    };

    return (
        <div className="w-full max-w-none sm:max-w-4xl mx-auto space-y-6 px-2 md:px-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Assessment <span className="text-indigo-600">Dashboard</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Create, manage, and monitor your assessments all in one place
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowGuide(!showGuide)}
                        variant="outline"
                        className="gap-2"
                    >
                        <HelpCircle className="w-4 h-4" />
                        {showGuide ? "Hide Guide" : "Show Guide"}
                    </Button>
                    <Button
                        onClick={handleCreateAssessment}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Assessment
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                    <CardContent className="p-4 md:p-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Assessments</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{recentAssessments.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                    <CardContent className="p-4 md:p-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Published</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {recentAssessments.filter(e => e.is_released).length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                    <CardContent className="p-4 md:p-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Drafts</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {recentAssessments.filter(e => !e.is_released).length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                    <CardContent className="p-4 md:p-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Students</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">0</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-xl transition-all cursor-pointer group" onClick={handleCreateAssessment}>
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <ClipboardList className="w-8 h-8 mb-3 opacity-80" />
                                <h3 className="font-bold text-lg">Create Assessment</h3>
                                <p className="text-sm opacity-80 mt-1">Start a new assessment from scratch</p>
                            </div>
                            <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-all cursor-pointer group" onClick={handleViewResults}>
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
                                <h3 className="font-bold text-lg">View Results</h3>
                                <p className="text-sm opacity-80 mt-1">Monitor student performance</p>
                            </div>
                            <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-xl transition-all cursor-pointer group" onClick={handleInviteStudents}>
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <Users className="w-8 h-8 mb-3 opacity-80" />
                                <h3 className="font-bold text-lg">Invite Students</h3>
                                <p className="text-sm opacity-80 mt-1">Share app link with students</p>
                            </div>
                            {copied ? (
                                <Check className="w-5 h-5 text-white" />
                            ) : (
                                <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Guide Section */}
            {showGuide && (
                <Card className="border-0 shadow-xl bg-white dark:bg-muted/30 overflow-hidden">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                                    <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Getting Started Guide</CardTitle>
                                    <CardDescription>Follow these steps to set up your assessment</CardDescription>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowGuide(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${step.isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                                        : "bg-white dark:bg-muted/20 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800"
                                        }`}
                                    onClick={() => handleStepClick(step.id)}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.isActive
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        }`}>
                                        {step.isCompleted ? (
                                            <CheckCircle className="w-4 h-4" />
                                        ) : (
                                            <span className="text-sm font-bold">{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm">{step.title}</h4>
                                            {step.isCompleted && (
                                                <Badge className="bg-emerald-500 text-white text-[8px]">Done</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                </div>
                            ))}
                        </div>

                        <Separator className="my-6" />

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-blue-700 dark:text-blue-300">How Students Access Assessments</h4>
                                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 mt-1">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                                            Share the app link with your students
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                                            Students create accounts using the link
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                                            They enter the assessment access key to start
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                                            You monitor progress and release results
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Assessments */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Recent Assessments</h2>
                    {recentAssessments.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => navigate("/tutor/exams")}>
                            View All
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-8 text-slate-400">Loading assessments...</div>
                ) : recentAssessments.length === 0 ? (
                    <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Assessments Yet</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Create your first assessment to get started
                            </p>
                            <Button onClick={handleCreateAssessment} className="mt-4 gap-2">
                                <PlusCircle className="w-4 h-4" />
                                Create Assessment
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {recentAssessments.map((assessment) => {
                            const status = getAssessmentStatus(assessment);
                            return (
                                <Card
                                    key={assessment.id}
                                    className="border-0 shadow-sm bg-white dark:bg-muted/30 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleContinueAssessment(assessment.id)}
                                >
                                    <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{assessment.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{assessment.course || "No Course"}</span>
                                                    {assessment.block && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                            <span>{assessment.block}</span>
                                                        </>
                                                    )}
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge className={`${status.color} text-white border-0`}>
                                                {status.label}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-indigo-600 hover:text-indigo-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleContinueAssessment(assessment.id);
                                                }}
                                            >
                                                <PlayCircle className="w-4 h-4 mr-1" />
                                                Continue
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Tips */}
            <Card className="border-0 shadow-sm bg-white dark:bg-muted/30">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <Mail className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Need Help?</p>
                                <p className="text-[10px] text-slate-500">Contact support for assistance</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            System Ready
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TutorQuickAction;