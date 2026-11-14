// src/staff-cpd/admin/QuestionsPage.tsx
import { useCallback, useMemo, useState } from "react";
import {
    Plus, Trash2, Search, HelpCircle, Check, Circle, Type,
    Pencil, X, Save,
} from "lucide-react";
import {
    useAdminQuestions,
    useCreateQuestion,
    useUpdateQuestionWithOptions,
    useArchiveQuestion,
} from "../lib/admin-hooks";
import { CpdEmptyState } from "../components";
import { tap } from "../pages/shared";
import SelectField from "@/components/ui/SelectField";

const TYPE_TONES: Record<string, string> = {
    multiple_choice: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
    multiple_select: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400",
    true_false: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    short_answer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
};
const getTypeTone = (t?: string) =>
    TYPE_TONES[t ?? ""] ?? "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300";

const QUESTION_TYPE_OPTIONS = [
    { value: "multiple_choice", label: "Multiple Choice" },
    { value: "multiple_select", label: "Multiple Select" },
    { value: "true_false", label: "True / False" },
    { value: "short_answer", label: "Short Answer" },
];

const isChoiceType = (t: string) =>
    t === "multiple_choice" || t === "multiple_select" || t === "true_false";

const InputBase =
    "w-full h-11 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const TextareaBase =
    "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const PrimaryBtn =
    "h-11 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold " +
    "flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const SecondaryBtn =
    "h-11 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 " +
    "text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const IconBtn =
    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 " +
    "active:scale-[0.92] transition-transform";

const DangerBtn = `${IconBtn} bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400`;

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

type OptionDraft = { option_text: string; is_correct: boolean };

function OptionsEditor({
    options, setOptions,
}: {
    options: OptionDraft[];
    setOptions: React.Dispatch<React.SetStateAction<OptionDraft[]>>;
}) {
    const addOption = useCallback(() => {
        tap();
        setOptions((o) => [...o, { option_text: "", is_correct: false }]);
    }, [setOptions]);

    const removeOption = useCallback((i: number) => {
        tap("warning");
        setOptions((o) => o.filter((_, idx) => idx !== i));
    }, [setOptions]);

    const toggleCorrect = useCallback((i: number) => {
        tap();
        setOptions((prev) =>
            prev.map((x, idx) => idx === i ? { ...x, is_correct: !x.is_correct } : x)
        );
    }, [setOptions]);

    const updateText = useCallback((i: number, value: string) => {
        setOptions((prev) =>
            prev.map((x, idx) => idx === i ? { ...x, option_text: value } : x)
        );
    }, [setOptions]);

    return (
        <div className="space-y-2">
            <Label>Answer options</Label>
            {options.map((o, i) => (
                <div
                    key={i}
                    className={`flex items-center gap-2 rounded-xl p-2 transition-colors ${o.is_correct
                        ? "bg-emerald-50 dark:bg-emerald-400/10"
                        : "bg-slate-50 dark:bg-[#0d1117]"}`}
                >
                    <button
                        type="button"
                        onClick={() => toggleCorrect(i)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                                    active:scale-[0.92] transition-transform ${o.is_correct
                                ? "bg-emerald-500 text-white"
                                : "bg-white dark:bg-[#161b22] text-slate-400 ring-1 ring-slate-200 dark:ring-white/[0.06]"}`}
                        aria-label={o.is_correct ? "Marked correct" : "Mark as correct"}
                        style={{ touchAction: "manipulation" }}
                    >
                        {o.is_correct ? (
                            <Check className="w-4 h-4" strokeWidth={3} />
                        ) : (
                            <Circle className="w-3.5 h-3.5" strokeWidth={2.5} />
                        )}
                    </button>

                    <input
                        value={o.option_text}
                        onChange={(e) => updateText(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className={InputBase + " !h-10 flex-1"}
                        style={{ touchAction: "manipulation" }}
                    />

                    {options.length > 2 && (
                        <button
                            type="button"
                            onClick={() => removeOption(i)}
                            aria-label="Remove option"
                            className={DangerBtn}
                            style={{ touchAction: "manipulation" }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={addOption}
                className={SecondaryBtn + " w-full"}
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="h-3.5 w-3.5" />
                Add option
            </button>
        </div>
    );
}

export default function QuestionsPage() {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const create = useCreateQuestion();
    const update = useUpdateQuestionWithOptions();
    const archive = useArchiveQuestion();
    const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

    const [qText, setQText] = useState("");
    const [qType, setQType] = useState("multiple_choice");
    const [options, setOptions] = useState<OptionDraft[]>([
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
    ]);

    const showOptions = isChoiceType(qType);

    const resetNew = useCallback(() => {
        setQText("");
        setQType("multiple_choice");
        setOptions([
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
        ]);
    }, []);

    const save = useCallback(async () => {
        if (!qText.trim()) return;
        tap("success");
        await create.mutateAsync({
            question: qText,
            question_type: qType as any,
            options: options.filter((o) => o.option_text.trim()),
        });
        resetNew();
    }, [qText, qType, options, create, resetNew]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [eText, setEText] = useState("");
    const [eType, setEType] = useState("multiple_choice");
    const [eOptions, setEOptions] = useState<OptionDraft[]>([]);

    const startEdit = useCallback((qq: any) => {
        tap();
        setEditingId(qq.id);
        setEText(qq.question ?? "");
        setEType(qq.question_type ?? "multiple_choice");
        const opts: OptionDraft[] = (qq.options ?? []).map((o: any) => ({
            option_text: o.option_text ?? "",
            is_correct: !!o.is_correct,
        }));
        setEOptions(
            isChoiceType(qq.question_type) && opts.length < 2
                ? [...opts, ...Array.from({ length: 2 - opts.length }, () => ({ option_text: "", is_correct: false }))]
                : opts
        );
    }, []);

    const cancelEdit = useCallback(() => {
        tap();
        setEditingId(null);
    }, []);

    const saveEdit = useCallback(async (id: string) => {
        if (!eText.trim()) return;
        tap("success");
        await update.mutateAsync({
            id,
            patch: { question: eText, question_type: eType as any },
            options: isChoiceType(eType)
                ? eOptions
                    .filter((o) => o.option_text.trim())
                    .map((o, i) => ({
                        option_text: o.option_text,
                        is_correct: o.is_correct,
                        position: i,
                    }))
                : [],
        });
        setEditingId(null);
    }, [eText, eType, eOptions, update]);

    const deleteQuestion = useCallback((id: string) => {
        if (!confirm("Archive this question? It won't appear in the bank anymore."))
            return;
        tap("warning");
        archive.mutate(id);
    }, [archive]);

    return (
        // ✅ Gutter restored — matches the rest of the CPD section
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
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
                        style={{ touchAction: "manipulation" }}
                    />
                </div>

                <div>
                    <Label>Question type</Label>
                    <SelectField
                        value={qType}
                        onValueChange={(v) => { tap(); setQType(v); }}
                        options={QUESTION_TYPE_OPTIONS}
                        placeholder="Question type"
                    />
                </div>

                {showOptions && (
                    <OptionsEditor options={options} setOptions={setOptions} />
                )}

                <button
                    onClick={save}
                    disabled={!qText.trim() || create.isPending}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {create.isPending ? "Saving…" : "Save Question"}
                </button>
            </section>

            <div className="relative">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions…"
                    className={InputBase + " pl-10"}
                    style={{ touchAction: "manipulation" }}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {q.isLoading && !items.length ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <QuestionSkeleton key={i} />
                    ))}
                </div>
            ) : items.length ? (
                <>
                    <div className="space-y-2">
                        {items.map((qq: any) => {
                            const isEditing = editingId === qq.id;
                            return (
                                <div
                                    key={qq.id}
                                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${getTypeTone(qq.question_type)}`}>
                                                <Type className="h-3.5 w-3.5" strokeWidth={2.4} />
                                            </div>
                                            {!isEditing ? (
                                                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug">
                                                    {qq.question}
                                                </p>
                                            ) : (
                                                <textarea
                                                    value={eText}
                                                    onChange={(e) => setEText(e.target.value)}
                                                    rows={3}
                                                    className={TextareaBase}
                                                    style={{ touchAction: "manipulation" }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!isEditing ? (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(qq)}
                                                        className={IconBtn + " text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-white/[0.06]"}
                                                        aria-label="Edit question"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteQuestion(qq.id)}
                                                        className={DangerBtn}
                                                        aria-label="Archive question"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className={IconBtn + " text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-white/[0.06]"}
                                                        aria-label="Cancel edit"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => saveEdit(qq.id)}
                                                        disabled={!eText.trim() || update.isPending}
                                                        className="h-10 px-3 rounded-xl bg-blue-600 text-white text-[11px] font-bold
                                                                   flex items-center gap-1 disabled:opacity-50
                                                                   active:scale-[0.97] transition-transform"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        <Save className="h-3.5 w-3.5" />
                                                        Save
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {!isEditing && (
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getTypeTone(qq.question_type)}`}>
                                            {qq.question_type.replace("_", " ")}
                                        </span>
                                    )}

                                    {isEditing && (
                                        <div className="space-y-2">
                                            <div>
                                                <Label>Question type</Label>
                                                <SelectField
                                                    value={eType}
                                                    onValueChange={setEType}
                                                    options={QUESTION_TYPE_OPTIONS}
                                                    placeholder="Question type"
                                                />
                                            </div>
                                            {isChoiceType(eType) && (
                                                <OptionsEditor options={eOptions} setOptions={setEOptions} />
                                            )}
                                        </div>
                                    )}

                                    {!isEditing && qq.options?.length > 0 && (
                                        <div className="space-y-1">
                                            {qq.options.map((o: any) => (
                                                <div
                                                    key={o.id}
                                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${o.is_correct
                                                        ? "bg-emerald-50 dark:bg-emerald-400/10"
                                                        : "bg-slate-50 dark:bg-[#0d1117]"}`}
                                                >
                                                    {o.is_correct ? (
                                                        <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                            <Check className="h-2 w-2 text-white" strokeWidth={3.5} />
                                                        </span>
                                                    ) : (
                                                        <span className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-300 dark:ring-white/[0.15] shrink-0" />
                                                    )}
                                                    <span className={`text-[11px] font-medium ${o.is_correct
                                                        ? "text-emerald-700 dark:text-emerald-400"
                                                        : "text-slate-600 dark:text-slate-400"}`}>
                                                        {o.option_text}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {q.hasNextPage && (
                        <div className="flex justify-center pt-2 pb-4">
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

function QuestionSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2 animate-pulse">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                    <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 w-4/5 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                        <div className="h-3 w-2/3 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                </div>
                <div className="flex gap-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
                </div>
            </div>
            <div className="h-5 w-24 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
        </div>
    );
}