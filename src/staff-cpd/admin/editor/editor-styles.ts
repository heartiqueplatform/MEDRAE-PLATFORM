// src/staff-cpd/admin/editor/editor-styles.ts
import type { ReactNode } from "react";

export const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
export const TextareaBase = "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";
export const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
export const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
export const DangerBtn = "h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-[0.92] transition-transform";

export function Label({ children }: { children: ReactNode }) {
    return (
        <label className= "block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1" >
        { children }
        </label>
    );
}

