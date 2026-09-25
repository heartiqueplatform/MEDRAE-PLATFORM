// src/staff-cpd/admin/QuestionsPage.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Plus, Trash2, Search, HelpCircle, Check, Circle, Sparkles, Type,
} from "lucide-react";
import { useAdminQuestions, useCreateQuestion } from "../lib/admin-hooks";

// Question type tones — soft-tint pills matching the admin suite
const TYPE_TONES: Record<string, string> = {
    multiple_choice: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    multiple_select: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    true_false: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    short_answer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const getTypeTone = (t?: string) =>
    TYPE_TONES[t ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

// Shared input styling — matches the rest of the admin suite
const inputCls =
    "h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner";

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

    const addOption = () => setOptions(o => [...o, { option_text: "", is_correct: false }]);
    const removeOption = (i: number) => setOptions(o => o.filter((_, idx) => idx !== i));

    const showOptions =
        qType === "multiple_choice" || qType === "multiple_select" || qType === "true_false";

    const save = async () => {
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
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                                <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    Question <span className="text-violet-600">Bank</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Reusable questions that can be attached to any CPD assessment.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* NEW QUESTION CARD */}
                <div className="px-[4px] md:px-0">
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-white" strokeWidth={2.6} />
                                </div>
                                <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                    New Question
                                </CardTitle>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4 md:px-6 pb-4 md:pb-6">
                            {/* Question text */}
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Question text
                                </label>
                                <Textarea
                                    value={qText}
                                    onChange={(e) => setQText(e.target.value)}
                                    placeholder="Type your question…"
                                    rows={3}
                                    className="mt-1.5 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner resize-y"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Question type
                                </label>
                                <Select value={qType} onValueChange={setQType}>
                                    <SelectTrigger className={`mt-1.5 w-full sm:w-56 ${inputCls}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-0 shadow-xl">
                                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                        <SelectItem value="multiple_select">Multiple Select</SelectItem>
                                        <SelectItem value="true_false">True / False</SelectItem>
                                        <SelectItem value="short_answer">Short Answer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Options */}
                            {showOptions && (
                                <div className="space-y-2.5">
                                    <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Answer options
                                    </label>

                                    {options.map((o, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-2 md:gap-3 rounded-xl p-2 md:p-2.5 transition-all ${o.is_correct
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/30"
                                                : "bg-gray-50 dark:bg-gray-900/50"
                                                }`}
                                        >
                                            {/* Correct toggle */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOptions(prev =>
                                                        prev.map((x, idx) =>
                                                            idx === i ? { ...x, is_correct: !x.is_correct } : x
                                                        )
                                                    )
                                                }
                                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${o.is_correct
                                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                                    : "bg-white dark:bg-gray-800 text-gray-400 hover:text-emerald-600 ring-1 ring-gray-200 dark:ring-gray-700"
                                                    }`}
                                                aria-label={o.is_correct ? "Marked correct" : "Mark as correct"}
                                            >
                                                {o.is_correct ? (
                                                    <Check className="w-4 h-4" strokeWidth={3} />
                                                ) : (
                                                    <Circle className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                )}
                                            </button>

                                            <Input
                                                value={o.option_text}
                                                onChange={(e) =>
                                                    setOptions(prev =>
                                                        prev.map((x, idx) =>
                                                            idx === i ? { ...x, option_text: e.target.value } : x
                                                        )
                                                    )
                                                }
                                                placeholder={`Option ${i + 1}`}
                                                className="flex-1 h-10 md:h-11 rounded-lg md:rounded-xl bg-white dark:bg-gray-800 border-2 border-transparent text-sm font-medium focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                            />

                                            {options.length > 2 && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeOption(i)}
                                                    className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4 text-rose-600" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={addOption}
                                        className="h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all w-full sm:w-auto"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                                    </Button>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                                <Button
                                    onClick={save}
                                    disabled={!qText || create.isPending}
                                    className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5 disabled:opacity-40 disabled:shadow-none flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    {create.isPending ? "Saving…" : "Save Question"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SEARCH */}
                <div className="px-[4px] md:px-0">
                    <div className="relative w-full group">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search questions…"
                            className={`w-full pl-9 md:pl-11 pr-4 ${inputCls}`}
                        />
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    </div>
                </div>

                {/* LIST */}
                {q.isLoading ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {items.map((qq: any) => (
                            <Card
                                key={qq.id}
                                className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl p-0"
                            >
                                <CardContent className="p-4 md:p-5 space-y-3">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeTone(qq.question_type)}`}>
                                                <Type className="w-4 h-4" strokeWidth={2.4} />
                                            </div>
                                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                                {qq.question}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${getTypeTone(qq.question_type)}`}
                                        >
                                            {qq.question_type.replace("_", " ")}
                                        </span>
                                    </div>

                                    {/* Options */}
                                    {qq.options?.length > 0 && (
                                        <div className="space-y-1.5 pl-0.5">
                                            {qq.options.map((o: any) => (
                                                <div
                                                    key={o.id}
                                                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${o.is_correct
                                                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                                                        : "bg-gray-50 dark:bg-gray-900/50"
                                                        }`}
                                                >
                                                    {o.is_correct ? (
                                                        <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                                                        </span>
                                                    ) : (
                                                        <span className="w-4 h-4 rounded-full ring-1 ring-gray-300 dark:ring-gray-600 flex-shrink-0" />
                                                    )}
                                                    <span
                                                        className={`text-xs md:text-sm font-medium ${o.is_correct
                                                            ? "text-emerald-700 dark:text-emerald-300"
                                                            : "text-gray-600 dark:text-gray-400"
                                                            }`}
                                                    >
                                                        {o.option_text}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {q.hasNextPage && (
                            <div className="flex justify-center pt-3">
                                <Button
                                    variant="outline"
                                    onClick={() => q.fetchNextPage()}
                                    disabled={q.isFetchingNextPage}
                                    className="h-11 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-6"
                                >
                                    {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <div className="text-center py-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20 mb-3">
                                <HelpCircle className="w-6 h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                No questions yet
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Add your first question above to build the bank.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}