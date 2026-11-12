// src/staff-cpd/admin/RedemptionsPage.tsx
import { useState } from "react";
import {
    Coins, CheckCircle2, XCircle, Loader2, Clock, AlertCircle, Phone,
    Receipt, Send,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import {
    useAdminRedemptions, type RedemptionRow,
} from "@/staff-cpd/lib/contributor-hooks";
import { useMedraeCoinConfig } from "@/staff-cpd/lib/admin-hooks";
import { playSound } from "@/lib/soundManager";

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

const Sk = "rounded bg-slate-100 dark:bg-white/[0.06] animate-pulse";

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const TextareaBase =
    "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

type Filter = "pending" | "approved" | "paid" | "rejected" | "all";

export default function RedemptionsPage() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState<Filter>("pending");
    const { data: rows = [], isLoading } = useAdminRedemptions(filter);
    const { data: coinConfig } = useMedraeCoinConfig();

    const [actingId, setActingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

    // NEW: mark-paid inline form
    const [payingId, setPayingId] = useState<string | null>(null);
    const [mpesaRef, setMpesaRef] = useState<Record<string, string>>({});

    const refresh = () =>
        qc.invalidateQueries({ queryKey: ["medrae", "redemptions"] });

    const callRpc = async (fn: string, args: Record<string, any>) => {
        const { error } = await supabase.rpc(fn, args);
        if (error) throw error;
    };

    const handleApprove = async (row: RedemptionRow) => {
        if (actingId) return;
        tap("success");
        setActingId(row.id);
        try {
            await callRpc("medrae_approve_redemption", { p_redemption_id: row.id });
            await refresh();
        } catch (e: any) {
            alert(e?.message ?? "Approve failed.");
        } finally {
            setActingId(null);
        }
    };

    const handleMarkPaid = async (row: RedemptionRow) => {
        if (actingId) return;
        const ref = (mpesaRef[row.id] ?? "").trim();
        if (!ref) {
            tap("warning");
            alert("Enter the M-Pesa reference (e.g. QK47XYZ12A) before marking paid.");
            return;
        }
        tap("success");
        setActingId(row.id);
        try {
            await callRpc("medrae_mark_redemption_paid", {
                p_redemption_id: row.id,
                p_mpesa_reference: ref,
            });
            await refresh();
            setPayingId(null);
        } catch (e: any) {
            alert(e?.message ?? "Mark-paid failed.");
        } finally {
            setActingId(null);
        }
    };

    const handleReject = async (row: RedemptionRow) => {
        if (actingId) return;
        const reason = (rejectReason[row.id] ?? "").trim();
        if (!reason) { tap("warning"); alert("Provide a rejection reason."); return; }
        tap("warning");
        setActingId(row.id);
        try {
            await callRpc("medrae_reject_redemption", {
                p_redemption_id: row.id,
                p_reason: reason,
            });
            await refresh();
            setRejectingId(null);
        } catch (e: any) {
            alert(e?.message ?? "Reject failed.");
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="px-4 pt-4 pb-16 space-y-3 max-w-[880px] mx-auto">
            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <Coins className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            Coin Redemptions
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Approve, mark paid, or reject contributor cash-out requests
                        </p>
                    </div>
                </div>
            </section>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(["pending", "approved", "paid", "rejected", "all"] as const).map((s) => {
                    const active = filter === s;
                    return (
                        <button key={s} onClick={() => { tap(); setFilter(s); }}
                            className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-bold capitalize
                                        active:scale-[0.97] transition-transform
                                        ${active ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}
                            style={{ touchAction: "manipulation" }}>
                            {s}
                        </button>
                    );
                })}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                            <div className={`h-10 w-full rounded-xl ${Sk}`} />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center">
                    <Clock className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                        No {filter} redemptions
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {filter === "pending" ? "New requests will appear here." : "Nothing here yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map((r) => {
                        const acting = actingId === r.id;
                        const kesEquiv = (r.coins_amount * (coinConfig?.coin_to_kes_rate ?? r.coin_to_kes_rate)).toFixed(2);
                        return (
                            <div key={r.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start gap-2.5">
                                    <div className="h-10 w-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 text-[13px] font-bold">
                                        {(r.profile?.name ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            {r.profile?.name ?? r.user_id.slice(0, 8)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            {r.profile?.email ?? "—"}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {new Date(r.requested_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Amount
                                    </p>
                                    <p className="text-[16px] font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                                        {r.coins_amount.toLocaleString()} MC
                                        <span className="text-[12px] text-amber-600 dark:text-amber-400 ml-2">
                                            ≈ KSh {kesEquiv}
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Rate at request: 1 MC = KSh {Number(r.coin_to_kes_rate).toFixed(4)}
                                    </p>
                                    {r.mpesa_phone && (
                                        <p className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 dark:text-white mt-1">
                                            <Phone className="h-3 w-3" /> {r.mpesa_phone}
                                        </p>
                                    )}
                                </div>

                                {/* Approved — payout in-flight notice */}
                                {r.status === "approved" && (
                                    <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3 flex items-start gap-2">
                                        <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug">
                                            Approved — coins held. Send <b>KSh {kesEquiv}</b> to <b>{r.mpesa_phone}</b> via M-Pesa,
                                            then record the reference below.
                                        </p>
                                    </div>
                                )}

                                {/* Rejected — reason */}
                                {r.review_notes && r.status === "rejected" && (
                                    <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                                            Rejection reason
                                        </p>
                                        <p className="text-[11px] text-rose-700 dark:text-rose-300">{r.review_notes}</p>
                                    </div>
                                )}

                                {/* Paid — receipt */}
                                {r.status === "paid" && r.mpesa_reference && (
                                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                M-Pesa receipt
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                                            {r.mpesa_reference}
                                        </p>
                                        {r.mpesa_sent_at && (
                                            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                                                Sent {new Date(r.mpesa_sent_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Actions — pending */}
                                {r.status === "pending" && (
                                    <div className="pt-1 border-t border-slate-100 dark:border-white/[0.04] space-y-2">
                                        {rejectingId === r.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={rejectReason[r.id] ?? ""}
                                                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                                    placeholder="Reason for rejection (required)"
                                                    rows={2}
                                                    className={TextareaBase}
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setRejectingId(null)}
                                                        className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold active:scale-[0.97] transition-transform"
                                                        style={{ touchAction: "manipulation" }}>
                                                        Cancel
                                                    </button>
                                                    <button onClick={() => handleReject(r)}
                                                        disabled={acting || !(rejectReason[r.id] ?? "").trim()}
                                                        className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                                                        style={{ touchAction: "manipulation" }}>
                                                        {acting ? <div className="h-3.5 w-14 rounded bg-white/30 animate-pulse" />
                                                            : <><XCircle className="h-3.5 w-3.5" /> Reject</>}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => setRejectingId(r.id)}
                                                    className="flex-1 h-10 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}>
                                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                                </button>
                                                <button onClick={() => handleApprove(r)} disabled={acting}
                                                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                                                    style={{ touchAction: "manipulation" }}>
                                                    {acting ? <div className="h-3.5 w-14 rounded bg-white/30 animate-pulse" />
                                                        : <><CheckCircle2 className="h-3.5 w-3.5" /> Approve</>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions — approved (mark paid with reference) */}
                                {r.status === "approved" && (
                                    <div className="pt-1 border-t border-slate-100 dark:border-white/[0.04] space-y-2">
                                        {payingId === r.id ? (
                                            <>
                                                <div>
                                                    <Label>M-Pesa transaction reference</Label>
                                                    <input
                                                        type="text"
                                                        value={mpesaRef[r.id] ?? ""}
                                                        onChange={(e) => setMpesaRef((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                                        placeholder="e.g. QK47XYZ12A"
                                                        className={InputBase + " font-mono"}
                                                        autoFocus
                                                    />
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                                                        Copy from the M-Pesa SMS. Visible to the contributor in their history.
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setPayingId(null)}
                                                        className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold active:scale-[0.97] transition-transform"
                                                        style={{ touchAction: "manipulation" }}>
                                                        Cancel
                                                    </button>
                                                    <button onClick={() => handleMarkPaid(r)}
                                                        disabled={acting || !(mpesaRef[r.id] ?? "").trim()}
                                                        className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                                                        style={{ touchAction: "manipulation" }}>
                                                        {acting ? <div className="h-3.5 w-20 rounded bg-white/30 animate-pulse" />
                                                            : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm paid</>}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <button onClick={() => setPayingId(r.id)} disabled={acting}
                                                className="w-full h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                                                style={{ touchAction: "manipulation" }}>
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Mark as paid (I've sent M-Pesa)
                                            </button>
                                        )}
                                    </div>
                                )}

                                {(r.status === "paid" || r.status === "rejected") && r.reviewed_at && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                                        {r.status === "paid" ? "Marked paid" : "Rejected"}{" "}
                                        {new Date(r.reviewed_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}