// src/staff-cpd/components/ContentTypeChip.tsx
import React from "react";
import {
    PlayCircle, Headphones, FileText, BookOpen, ExternalLink, CheckCircle2,
} from "lucide-react";
import { CONTENT_LABEL, type CpdContentItem } from "../lib";

const CHIP_ICON: Record<string, React.ComponentType<any>> = {
    video: PlayCircle, podcast: Headphones, article: FileText, pdf: FileText,
    text: FileText, case_study: BookOpen, external_resource: ExternalLink,
    webinar: ExternalLink, quiz: CheckCircle2, assessment: CheckCircle2,
};
const CHIP_TONES: Record<string, string> = {
    video: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
    podcast: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400",
    article: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    pdf: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
    text: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    case_study: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    external_resource: "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-400",
    webinar: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400",
    quiz: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    assessment: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
};

export function ContentTypeChip({ type }: { type: CpdContentItem["content_type"] }) {
    const Icon = CHIP_ICON[type] ?? FileText;
    const tone = CHIP_TONES[type] ?? "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";
    return (
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${tone}`}>
            <Icon className="h-2.5 w-2.5" /> {CONTENT_LABEL[type]}
        </span>
    );
}