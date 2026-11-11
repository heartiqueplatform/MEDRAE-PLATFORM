// src/staff-cpd/admin/QuestionsPage.tsx
import { useState } from "react";
import {
    Plus, Trash2, Search, HelpCircle, Check, Circle, Type,
} from "lucide-react";
import { useAdminQuestions, useCreateQuestion } from "../lib/admin-hooks";
import { CpdEmptyState } from "../components";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Type tones                                                        */
/* ------------------------------------------------------------------ */

const TYPE_TONES: Record<string, string> = {
    multiple_choice: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
    multiple_select: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400",
    true_false: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    short_answer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
};

const getTypeTone = (t?: string) =>
    TYPE_TONES[t ?? ""] ?? "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const TextareaBase =
    "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const PrimaryBtn =
    "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function QuestionsPage() {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const create = useCreateQuestion();
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    const [qText, setQText] = useState("");
    const [qType, setQType] = useState("multiple_choice");
    const [options, setOptions] = useState([
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
    ]);

    const addOption = () => {
        tap();
        setOptions(o => [...o, { option_text: "", is_correct: false }]);
    };
    const removeOption = (i: number) => {
        tap("warning");
        setOptions(o => o.filter((_, idx) => idx !== i));
    };

    const showOptions =
        qType === "multiple_choice" || qType === "multiple_select" || qType === "true_false";

    const save = async () => {
        tap("success");
        await create.mutateAsync({
            question: qText,
            question_type: qType as any,
            options: options.filter(o => o.option_text.trim()),
        });
        setQText("");
        setOptions([
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
        ]);
    };

    return (
        <div className="px-4 pt-4 pb-16 space-y-3 max-w-[880px] mx-auto">

            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                        <HelpCircle className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            Question Bank
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Reusable questions across all CPD assessments
                        </p>
                    </div>
                </div>
            </section>

            {/* New question card */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    New Question
                </p>

                <div>
                    <Label>Question text</Label>
                    <textarea
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        placeholder="Type your question…"
                        rows={3}
                        className={TextareaBase}
                    />
                </div>

                <div>
                    <Label>Question type</Label>
                    <select
                        value={qType}
                        onChange={(e) => { tap(); setQType(e.target.value); }}
                        className={InputBase + " sm:w-56"}
                        style={{ touchAction: "manipulation" }}
                    >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="multiple_select">Multiple Select</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                    </select>
                </div>

                {showOptions && (
                    <div className="space-y-2">
                        <Label>Answer options</Label>
                        {options.map((o, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-2 rounded-xl p-2 transition-colors
                                            ${o.is_correct
                                        ? "bg-emerald-50 dark:bg-emerald-400/10"
                                        : "bg-slate-50 dark:bg-[#0d1117]"
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        tap();
                                        setOptions(prev =>
                                            prev.map((x, idx) =>
                                                idx === i ? { ...x, is_correct: !x.is_correct } : x
                                            )
                                        );
                                    }}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                                                active:scale-[0.92] transition-transform
                                                ${o.is_correct
                                            ? "bg-emerald-500 text-white"
                                            : "bg-white dark:bg-[#161b22] text-slate-400 ring-1 ring-slate-200 dark:ring-white/[0.06]"
                                        }`}
                                    aria-label={o.is_correct ? "Marked correct" : "Mark as correct"}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {o.is_correct ? (
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : (
                                        <Circle className="w-3 h-3" strokeWidth={2.5} />
                                    )}
                                </button>

                                <input
                                    value={o.option_text}
                                    onChange={(e) =>
                                        setOptions(prev =>
                                            prev.map((x, idx) =>
                                                idx === i ? { ...x, option_text: e.target.value } : x
                                            )
                                        )
                                    }
                                    placeholder={`Option ${i + 1}`}
                                    className={InputBase + " !h-9 flex-1"}
                                />

                                {options.length > 2 && (
                                    <button
                                        onClick={() => removeOption(i)}
                                        aria-label="Remove option"
                                        className="h-8 w-8 rounded-lg
                                                   bg-rose-50 dark:bg-rose-400/10
                                                   text-rose-600 dark:text-rose-400
                                                   flex items-center justify-center shrink-0
                                                   active:scale-[0.92] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={addOption}
                            className={SecondaryBtn + " w-full !h-9"}
                            style={{ touchAction: "manipulation" }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add option
                        </button>
                    </div>
                )}

                <button
                    onClick={save}
                    disabled={!qText || create.isPending}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {create.isPending ? "Saving…" : "Save Question"}
                </button>
            </section>

            {/* Search */}
            <div className="relative">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions…"
                    className={InputBase + " pl-9"}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2
                                   h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* List */}
            {q.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    ))}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map((qq: any) => (
                            <div
                                key={qq.id}
                                className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${getTypeTone(qq.question_type)}`}>
                                            <Type className="h-3.5 w-3.5" strokeWidth={2.4} />
                                        </div>
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug">
                                            {qq.question}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                                      text-[9px] font-bold capitalize ${getTypeTone(qq.question_type)}`}>
                                        {qq.question_type.replace("_", " ")}
                                    </span>
                                </div>

                                {/* Options */}
                                {qq.options?.length > 0 && (
                                    <div className="space-y-1">
                                        {qq.options.map((o: any) => (
                                            <div
                                                key={o.id}
                                                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5
                                                            ${o.is_correct
                                                        ? "bg-emerald-50 dark:bg-emerald-400/10"
                                                        : "bg-slate-50 dark:bg-[#0d1117]"
                                                    }`}
                                            >
                                                {o.is_correct ? (
                                                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500
                                                                     flex items-center justify-center shrink-0">
                                                        <Check className="h-2 w-2 text-white" strokeWidth={3.5} />
                                                    </span>
                                                ) : (
                                                    <span className="h-3.5 w-3.5 rounded-full
                                                                     ring-1 ring-slate-300 dark:ring-white/[0.15] shrink-0" />
                                                )}
                                                <span className={`text-[11px] font-medium ${o.is_correct
                                                    ? "text-emerald-700 dark:text-emerald-400"
                                                    : "text-slate-600 dark:text-slate-400"
                                                    }`}>
                                                    {o.option_text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {q.hasNextPage && (
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => { tap(); q.fetchNextPage(); }}
                                disabled={q.isFetchingNextPage}
                                className={SecondaryBtn}
                                style={{ touchAction: "manipulation" }}
                            >
                                {q.isFetchingNextPage ? "Loading…" : "Load more"}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <CpdEmptyState
                    title="No questions yet"
                    hint="Add your first question above to build the bank."
                    icon={HelpCircle}
                />
            )}
        </div>
    );
}