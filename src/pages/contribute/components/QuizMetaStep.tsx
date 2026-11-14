// src/pages/contribute/components/QuizMetaStep.tsx

"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { DraftQuiz } from "../types";

interface Props {
    draft: DraftQuiz;
    onChange: (patch: Partial<DraftQuiz>) => void;
}

const COURSES = ["BSN", "KRCHN", "KRN", "NCK", "Other"];
const QUIZ_TYPES = [
    { value: "mcq", label: "MCQ (Multiple Choice)" },
    { value: "short", label: "Short Answer" },
    { value: "guide", label: "Guide / Study Notes" },
] as const;

export function QuizMetaStep({ draft, onChange }: Props) {
    return (
        <div className="space-y-4">
            {/* Info banner */}
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10
                            border border-blue-100 dark:border-blue-500/20 p-3">
                <p className="text-[11.5px] text-blue-800 dark:text-blue-300 leading-snug">
                    💡 <strong>Tip:</strong> Quizzes with <strong>50+ questions</strong> earn a
                    one-time <strong>+100 coin</strong> milestone bonus. Keep the title descriptive
                    so students can find it.
                </p>
            </div>

            {/* Title */}
            <Field label="Quiz title" required>
                <Input
                    value={draft.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="e.g. Cardiovascular System — NCK Prep"
                    maxLength={120}
                    className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm
                               focus-visible:ring-2 focus-visible:ring-blue-500/40"
                />
                <p className="text-[10px] text-right text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                    {draft.title.length}/120
                </p>
            </Field>

            {/* Description */}
            <Field label="Description">
                <Textarea
                    value={draft.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Briefly describe what students will learn"
                    rows={3}
                    maxLength={400}
                    className="rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm resize-none
                               focus-visible:ring-2 focus-visible:ring-blue-500/40"
                />
            </Field>

            {/* Course + Type row */}
            <div className="grid grid-cols-2 gap-2">
                <Field label="Course" required>
                    <Select
                        value={draft.course}
                        onValueChange={(v) => onChange({ course: v })}
                    >
                        <SelectTrigger className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm">
                            <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                            {COURSES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field label="Quiz type" required>
                    <Select
                        value={draft.quiz_type}
                        onValueChange={(v) => onChange({ quiz_type: v as any })}
                    >
                        <SelectTrigger className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QUIZ_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </div>

            {/* Unit + Topic row */}
            <div className="grid grid-cols-2 gap-2">
                <Field label="Unit name" required>
                    <Input
                        value={draft.unit}
                        onChange={(e) => onChange({ unit: e.target.value })}
                        placeholder="e.g. Cardiology"
                        maxLength={80}
                        className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm
                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    />
                </Field>
                <Field label="Unit code">
                    <Input
                        value={draft.unit_code}
                        onChange={(e) => onChange({ unit_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. CARD01"
                        maxLength={16}
                        className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm font-mono
                                   focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    />
                </Field>
            </div>

            {/* Topic */}
            <Field label="Topic">
                <Input
                    value={draft.topic}
                    onChange={(e) => onChange({ topic: e.target.value })}
                    placeholder="e.g. Heart failure, Arrhythmias"
                    maxLength={100}
                    className="h-11 rounded-xl border-0 bg-slate-50 dark:bg-[#0d1117] text-sm
                               focus-visible:ring-2 focus-visible:ring-blue-500/40"
                />
            </Field>

            {/* Free toggle */}
            <div className="flex items-center justify-between gap-3 rounded-2xl
                            bg-slate-50 dark:bg-[#0d1117] p-3">
                <div className="flex-1 min-w-0">
                    <Label htmlFor="is-free" className="text-[12px] font-bold text-slate-900 dark:text-white">
                        Make this quiz free
                    </Label>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Free quizzes are visible to all students, including free tier.
                    </p>
                </div>
                <Switch
                    id="is-free"
                    checked={draft.is_free}
                    onCheckedChange={(v) => onChange({ is_free: v })}
                    className="data-[state=checked]:bg-emerald-600"
                />
            </div>
        </div>
    );
}

function Field({
    label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10.5px] font-bold uppercase tracking-wider
                              text-slate-500 dark:text-slate-400">
                {label}
                {required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            {children}
        </div>
    );
}