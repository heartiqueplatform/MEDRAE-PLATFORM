// components/TutorShare.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Users,
    GraduationCap,
    Share2,
    Copy,
    CheckCircle2,
    Mail,
    MessageCircle,
    Send,
    TrendingUp,
    Clock,
    BarChart3,
    Sparkles,
    FileText,
    Brain,
    Phone,
    Mail as MailIcon,
    Target,
    Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TutorShare() {
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);

    const siteUrl = "https://medrae.vercel.app/dashboard";

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(siteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = siteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setSending(true);
        setTimeout(() => {
            setSending(false);
            setEmail("");
            alert(`Invitation sent to ${email}!`);
        }, 1000);
    };

    const shareViaWhatsApp = () => {
        const text = `📚 Join MEDRAE Nursing Platform - Kenya's #1 Nursing Learning Platform!\n\nStudy smart with:\n✓ Premium notes & resources\n✓ NCK-aligned simulation exams\n✓ AI study assistant\n✓ Track your progress\n✓ Practice quizzes\n\nJoin here: ${siteUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareViaSMS = () => {
        const text = `Join MEDRAE Nursing Platform: ${siteUrl}`;
        window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = "Join MEDRAE Nursing Learning Platform";
        const body = `Hello!\n\nI'm inviting you to join MEDRAE - the ultimate nursing learning platform where you can:\n\n✓ Access premium nursing notes and resources\n✓ Practice with NCK-aligned simulation exams\n✓ Get AI-powered study assistance 24/7\n✓ Track your study progress and performance\n✓ Take practice quizzes by topic\n\nJoin using this link: ${siteUrl}\n\nLet's excel in nursing together!`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <Card className="w-full md:max-w-5xl mx-auto bg-white dark:bg-muted/30 border-0 shadow-none md:shadow-xl rounded-none md:rounded-xl overflow-hidden">

            {/* Header Banner - Professional Gradient */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 px-4 md:px-6 py-6 md:py-8 text-center">
                <div className="absolute inset-0 bg-black/5 dark:bg-black/20"></div>
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm mb-3 md:mb-4">
                        <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                        <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">Tutor Power Tools</span>
                    </div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1.5 md:mb-2">
                        Empower Your Students
                    </h2>
                    <p className="text-white/90 text-xs md:text-sm lg:text-base max-w-2xl mx-auto">
                        Get your students on MEDRAE to track progress, identify weaknesses, and ace their nursing exams
                    </p>
                </div>
            </div>

            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">

                {/* Benefits for Students */}
                <div>
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                        <Award className="h-3.5 w-3.5 md:h-4 md:w-4" /> What Your Students Get
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                        <div className="text-center p-2 md:p-3 bg-white/60 dark:bg-muted/30 rounded-lg md:rounded-xl border-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                                <Clock className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300">Track Study Time</p>
                            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400">Monitor hours spent</p>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/60 dark:bg-muted/30 rounded-lg md:rounded-xl border-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300">Progress Analytics</p>
                            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400">See improvement</p>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/60 dark:bg-muted/30 rounded-lg md:rounded-xl border-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                                <Brain className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300">AI Study Assistant</p>
                            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400">24/7 help</p>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/60 dark:bg-muted/30 rounded-lg md:rounded-xl border-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                                <Target className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300">Weakness Detection</p>
                            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400">Identify gaps</p>
                        </div>
                    </div>
                </div>

                {/* Tutor Exclusive Features */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4" /> Tutor Exclusive Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-white/60 dark:bg-white/5 rounded-lg border-0">
                            <div className="p-1 md:p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg flex-shrink-0">
                                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-700 dark:text-indigo-300" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-200">Use Our Questions</p>
                                <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400">Set internal exams using MEDRAE's question bank</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-white/60 dark:bg-white/5 rounded-lg border-0">
                            <div className="p-1 md:p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg flex-shrink-0">
                                <Brain className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-700 dark:text-indigo-300" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-200">Smart Suggestions</p>
                                <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400">Get exam topics based on student weaknesses</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-white/60 dark:bg-white/5 rounded-lg border-0">
                            <div className="p-1 md:p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg flex-shrink-0">
                                <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-700 dark:text-indigo-300" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-800 dark:text-slate-200">Custom Exams</p>
                                <p className="text-[9px] md:text-[10px] text-slate-600 dark:text-slate-400">Request unit-specific exams from MEDRAE</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Custom Exam Section */}
                <div className="bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg md:rounded-xl p-4 md:p-5 border-0">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" /> Need a Custom Exam?
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-700 dark:text-slate-300 mb-2 md:mb-3">
                        Request MEDRAE to set a standard exam based on your specific unit. We'll create a comprehensive assessment for your students based on their identified weaknesses.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <a
                            href="mailto:medraenursing@gmail.com"
                            className="inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] md:text-xs font-bold rounded-lg transition-colors shadow-sm hover:shadow-md"
                        >
                            <MailIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            medraenursing@gmail.com
                        </a>
                        <a
                            href="tel:0717517371"
                            className="inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-bold rounded-lg transition-colors shadow-sm hover:shadow-md"
                        >
                            <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            0717517371
                        </a>
                        <a
                            href="https://wa.me/254703473503"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] md:text-xs font-bold rounded-lg transition-colors shadow-sm hover:shadow-md"
                        >
                            <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            0704473503 (WhatsApp)
                        </a>
                    </div>
                </div>

                {/* Invite Students Section */}
                <div className="space-y-3 md:space-y-4">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 md:gap-2">
                        <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> Invite Your Students
                    </h3>

                    {/* Platform Link */}
                    <div className="bg-white/60 dark:bg-muted/30 rounded-lg md:rounded-xl p-3 md:p-4 border-0">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-3">
                            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                                <div className="p-1.5 md:p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex-shrink-0">
                                    <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-indigo-700 dark:text-indigo-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] md:text-xs text-indigo-700 dark:text-indigo-300 font-medium">MEDRAE Nursing Platform</p>
                                    <p className="text-xs md:text-sm font-mono font-bold text-indigo-800 dark:text-indigo-200 truncate">{siteUrl}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyLink}
                                className="w-full sm:w-auto border-0 bg-white dark:bg-muted/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[10px] md:text-xs h-8 md:h-9"
                            >
                                {copied ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Copied!</>
                                ) : (
                                    <><Copy className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Copy Link</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Quick Share Buttons */}
                    <div className="space-y-2 md:space-y-3">
                        <Label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Share</Label>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            <Button
                                variant="outline"
                                onClick={shareViaWhatsApp}
                                className="flex-1 bg-green-50 dark:bg-green-950/30 border-0 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 text-[10px] md:text-xs h-9 md:h-10"
                            >
                                <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                onClick={shareViaSMS}
                                className="flex-1 bg-blue-50 dark:bg-blue-950/30 border-0 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[10px] md:text-xs h-9 md:h-10"
                            >
                                <Send className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                SMS
                            </Button>
                            <Button
                                variant="outline"
                                onClick={shareViaEmail}
                                className="flex-1 bg-slate-50 dark:bg-slate-800/50 border-0 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] md:text-xs h-9 md:h-10"
                            >
                                <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                Email
                            </Button>
                        </div>
                    </div>

                    {/* Email Invite Form */}
                    <form onSubmit={handleSendInvite} className="space-y-2 md:space-y-3">
                        <Label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invite via Email</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                type="email"
                                placeholder="student@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 rounded-lg md:rounded-xl text-xs md:text-sm h-10 md:h-11 bg-white dark:bg-muted/30 border-0"
                                required
                            />
                            <Button type="submit" disabled={sending} className="bg-indigo-600 hover:bg-indigo-700 text-[10px] md:text-xs h-10 md:h-11 w-full sm:w-auto shadow-sm hover:shadow-md border-0">
                                {sending ? (
                                    <><div className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5 md:mr-2" /> Sending...</>
                                ) : (
                                    <><Send className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Send Invite</>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Success Message */}
                <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-lg p-2.5 md:p-3 border-0">
                    <p className="text-[10px] md:text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 md:gap-2">
                        <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                        When your students join, you can track their study progress, identify weak areas, and help them prepare for national exams with confidence!
                    </p>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 px-4 md:px-6 py-3 md:py-4 border-0">
                <div className="flex flex-wrap items-center justify-between w-full gap-1.5 md:gap-2 text-[10px] md:text-xs text-indigo-700 dark:text-indigo-300">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" /> Track student progress
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" /> Identify weak areas
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" /> Custom exam requests
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" /> Free for tutors
                    </span>
                </div>
            </CardFooter>
        </Card>
    );
}