// components/tutor/StudentPickerSheet.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { StudentPickerRow, type PickableStudent } from "./StudentPickerRow";
import { tap, tapSuccess, tapError } from "@/lib/tutor/tap";
import { InstitutionPicker } from "@/components/school-wars/InstitutionPicker";
import { cacheInvalidate } from "@/lib/tutor/cache";
import { CenteredModal } from "@/components/ui/CenteredModal";

const PAGE_SIZE = 20;

interface StudentPickerSheetProps {
    open: boolean;
    institution: string | null;
    /** student_ids already in the target class — shown disabled */
    alreadyInClass: Set<string>;
    selected: PickableStudent[];
    onSelectedChange: (next: PickableStudent[]) => void;
    /** Called after the tutor sets their institution, so the parent can refresh profile */
    onInstitutionChanged?: (slug: string) => void;
    onClose: () => void;
}

const SELECT_COLS =
    "user_id, name, username, institution, course, block, avatar_url";

export function StudentPickerSheet({
    open,
    institution,
    alreadyInClass,
    selected,
    onSelectedChange,
    onInstitutionChanged,
    onClose,
}: StudentPickerSheetProps) {
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [rows, setRows] = useState<PickableStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // institution setup state — also acts as the freshest source for the fetch
    const [pickedInstitution, setPickedInstitution] = useState("");
    const [savingInstitution, setSavingInstitution] = useState(false);
    const [showInstitutionPanel, setShowInstitutionPanel] = useState(false);

    const cursorRef = useRef<string | null>(null);
    const loadingRef = useRef(false);
    const hasLoadedOnceRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const reqIdRef = useRef(0);

    // 🔑 Freshest institution: prefer locally-saved value, else parent prop.
    const effectiveInstitution = pickedInstitution || institution || null;

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const loadPage = useCallback(
        async (reset = false) => {
            if (loadingRef.current) return;
            if (!reset && (done || !hasLoadedOnceRef.current)) return;

            const activeInst = effectiveInstitution;
            if (!activeInst) {
                setShowInstitutionPanel(true);
                setDone(true);
                return;
            }

            const myReq = ++reqIdRef.current;
            loadingRef.current = true;
            setLoading(true);

            try {
                // TODO(rpc): search_students(q, institution, cursor, limit)
                let q = supabase
                    .from("profiles")
                    .select(SELECT_COLS)
                    .eq("role", "student")
                    .eq("institution", activeInst)
                    .order("user_id", { ascending: true })
                    .limit(PAGE_SIZE);

                if (debounced) {
                    q = q.or(`name.ilike.%${debounced}%,username.ilike.%${debounced}%`);
                }
                if (!reset && cursorRef.current) {
                    q = q.gt("user_id", cursorRef.current);
                }

                const { data, error } = await q;
                if (error) throw error;
                if (myReq !== reqIdRef.current) return;

                const page = (data || []) as PickableStudent[];

                if (reset && page.length === 0 && !debounced) {
                    setShowInstitutionPanel(true);
                }

                setRows((prev) => {
                    const seen = new Set(prev.map((r) => r.user_id));
                    const merged = reset
                        ? page
                        : [...prev, ...page.filter((r) => !seen.has(r.user_id))];
                    return merged;
                });

                hasLoadedOnceRef.current = true;

                if (page.length < PAGE_SIZE) {
                    setDone(true);
                    cursorRef.current = null;
                } else {
                    cursorRef.current = page[page.length - 1].user_id;
                }
            } catch (e: any) {
                if (myReq === reqIdRef.current) {
                    setError(e?.message || "Failed to load students");
                    setDone(true);
                }
            } finally {
                if (myReq === reqIdRef.current) {
                    loadingRef.current = false;
                    setLoading(false);
                }
            }
        },
        [effectiveInstitution, debounced, done]
    );

    // reset when opened / query / institution changes
    useEffect(() => {
        if (!open) return;
        setRows([]);
        setDone(false);
        setError(null);
        cursorRef.current = null;
        hasLoadedOnceRef.current = false;
        loadPage(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, debounced, effectiveInstitution]);

    // infinite scroll — re-observes after every page append so it keeps
    // pulling while the sentinel is still visible
    // infinite scroll — attach to the nearest scrollable ancestor of the
    // sentinel (CenteredModal's body), not the window. Falls back to window.
    useEffect(() => {
        if (!open || showInstitutionPanel) return;
        const el = sentinelRef.current;
        if (!el) return;

        // find the scroll container: walk up until overflow-y is auto/scroll
        let scroller: HTMLElement | Window = window;
        let node: HTMLElement | null = el.parentElement;
        while (node) {
            const style = getComputedStyle(node);
            const oy = style.overflowY;
            if (oy === "auto" || oy === "scroll") {
                scroller = node;
                break;
            }
            node = node.parentElement;
        }

        const check = () => {
            const rect = el.getBoundingClientRect();
            const viewportH =
                scroller instanceof Window
                    ? window.innerHeight
                    : (scroller as HTMLElement).getBoundingClientRect().bottom;
            // trigger when sentinel is within 200px of the viewport bottom
            if (rect.top <= viewportH + 200) {
                loadPage(false);
            }
        };

        // run once on mount in case page 1 didn't fill the modal
        check();

        const target: EventTarget =
            scroller instanceof Window ? window : (scroller as HTMLElement);
        target.addEventListener("scroll", check, { passive: true });

        return () => {
            target.removeEventListener("scroll", check);
        };
    }, [open, showInstitutionPanel, loadPage, rows.length]);
    const toggle = (s: PickableStudent) => {
        const exists = selected.some((x) => x.user_id === s.user_id);
        if (exists) {
            onSelectedChange(selected.filter((x) => x.user_id !== s.user_id));
        } else {
            onSelectedChange([...selected, s]);
        }
    };

    // Rows that can actually be selected (not already in class)
    const selectableRows = rows.filter((r) => !alreadyInClass.has(r.user_id));
    const allVisibleSelected =
        selectableRows.length > 0 &&
        selectableRows.every((r) => selected.some((x) => x.user_id === r.user_id));

    const toggleSelectAll = () => {
        tap();
        if (allVisibleSelected) {
            // deselect only the currently visible ones
            const visibleIds = new Set(selectableRows.map((r) => r.user_id));
            onSelectedChange(selected.filter((x) => !visibleIds.has(x.user_id)));
        } else {
            // merge visible selectable rows into the existing selection
            const selectedIds = new Set(selected.map((x) => x.user_id));
            const additions = selectableRows.filter((r) => !selectedIds.has(r.user_id));
            onSelectedChange([...selected, ...additions]);
        }
    };

    const handleSaveInstitution = async () => {
        if (!pickedInstitution) {
            toast.error("Pick a school first");
            tapError();
            return;
        }
        setSavingInstitution(true);
        try {
            const {
                data: { user },
                error: userErr,
            } = await supabase.auth.getUser();
            if (userErr || !user) throw new Error("Not signed in");

            const { error: saveErr } = await supabase
                .from("profiles")
                .update({ institution: pickedInstitution })
                .eq("user_id", user.id);
            if (saveErr) throw saveErr;

            cacheInvalidate("class:");
            tapSuccess();
            toast.success("Institution set");
            setShowInstitutionPanel(false);
            // 🔑 keep pickedInstitution — it drives `effectiveInstitution` so the reload fires here
            onInstitutionChanged?.(pickedInstitution);
            // The reset effect (deps include effectiveInstitution) will re-fire loadPage(true)
        } catch (e: any) {
            tapError();
            toast.error(e?.message || "Couldn't save");
        } finally {
            setSavingInstitution(false);
        }
    };

    const headerSubtitle = showInstitutionPanel
        ? "Set your institution to continue"
        : `${selected.length} selected`;

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title="Select students"
            subtitle={headerSubtitle}
        >
            <div className="flex flex-col">
                {/* Search — hidden while institution panel is showing */}
                {!showInstitutionPanel && (
                    <div className="px-4 pb-2 flex items-center gap-2">
                        <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex-1 min-w-0">
                            <Search className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2.5} />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name or username…"
                                className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 min-w-0"
                                style={{ touchAction: "manipulation" }}
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-200 dark:active:bg-white/10"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label="Clear"
                                >
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {selectableRows.length > 0 && (
                            <button
                                onClick={toggleSelectAll}
                                className={`shrink-0 h-10 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider
                                            active:scale-[0.97] transition-transform
                                            ${allVisibleSelected
                                        ? "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400"
                                        : "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {allVisibleSelected ? "Clear" : "Select all"}
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="px-4 pb-3 space-y-3">
                    {showInstitutionPanel && (
                        <div className="rounded-2xl bg-slate-50 dark:bg-[#0d1117] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Set your institution
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {institution
                                            ? "No students found — try another school or keep this one"
                                            : "Pick your school to see its students"}
                                    </p>
                                </div>
                            </div>

                            <InstitutionPicker
                                value={pickedInstitution}
                                onChange={setPickedInstitution}
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveInstitution}
                                    disabled={!pickedInstitution || savingInstitution}
                                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {savingInstitution ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        "Save & search"
                                    )}
                                </button>
                                {institution && (
                                    <button
                                        onClick={() => {
                                            tap();
                                            setShowInstitutionPanel(false);
                                        }}
                                        className="px-3 h-10 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/5"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {!showInstitutionPanel && rows.length === 0 && !loading && !error && (
                        <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                            {debounced ? "No students match your search" : "No students found"}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs px-3 py-2">
                            {error}
                        </div>
                    )}

                    {!showInstitutionPanel && (
                        <>
                            <div className="space-y-2">
                                {rows.map((s) => (
                                    <StudentPickerRow
                                        key={s.user_id}
                                        student={s}
                                        selected={selected.some((x) => x.user_id === s.user_id)}
                                        disabled={alreadyInClass.has(s.user_id)}
                                        onToggle={toggle}
                                    />
                                ))}
                            </div>

                            <div ref={sentinelRef} className="h-8" />

                            {loading && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </CenteredModal>
    );
}