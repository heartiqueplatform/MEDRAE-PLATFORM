// src/staff-cpd/admin/editor/ModuleTitleInput.tsx
import { useRef, useState } from "react";
import { useUpdateModule } from "../../lib/admin-hooks";

export function ModuleTitleInput({ module: m, activityId }: { module: any; activityId: string }) {
    const update = useUpdateModule();
    const [local, setLocal] = useState(m.title);

    const lastIdRef = useRef(m.id);
    if (lastIdRef.current !== m.id) {
        lastIdRef.current = m.id;
        setLocal(m.title);
    }

    const commit = () => {
        const trimmed = local.trim();
        if (!trimmed || trimmed === m.title) return;
        update.mutate({ id: m.id, activity_id: activityId, patch: { title: trimmed } });
    };

    return (
        <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                    setLocal(m.title);
                    (e.target as HTMLInputElement).blur();
                }
            }}
            className="flex-1 h-9 rounded-lg bg-transparent px-2 text-[13px] font-bold
                       text-slate-900 dark:text-white
                       outline-none focus:bg-slate-50 dark:focus:bg-white/[0.06]
                       transition-colors max-w-md"
        />
    );
}