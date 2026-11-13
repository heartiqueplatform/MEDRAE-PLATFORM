// src/staff-cpd/admin/editor/QuestionPicker.tsx
import { useState } from "react";
import { useAdminQuestions } from "../../lib/admin-hooks";

const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

export function QuestionPicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question bank…" className={InputBase + " !h-9"} />

            <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1.5">
                {items.map((item) => (
                    <button key={item.id} onClick={() => onPick(item.id)}
                        className="w-full text-left rounded-xl bg-white dark:bg-[#161b22] p-2.5 active:bg-slate-100 dark:active:bg-white/[0.08] transition-colors"
                        style={{ touchAction: "manipulation" }}>
                        <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">{item.question}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                            {item.question_type.replace("_", " ")}
                        </p>
                    </button>
                ))}
                {!items.length && !q.isLoading && (
                    <p className="text-[11px] text-slate-400 text-center py-4">No questions match.</p>
                )}
            </div>

            <div className="flex justify-end">
                <button onClick={onCancel} className={SecondaryBtn + " !h-9"} style={{ touchAction: "manipulation" }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}