import { GraduationCap, UserCheck, X } from "lucide-react";
import { signInWithGoogle } from "./googleAuthService";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function GoogleRoleModal({
    open,
    onClose,
}: Props) {
    if (!open) return null;

    const handleRoleSelect = async (
        role: "student" | "tutor"
    ) => {
        try {
            await signInWithGoogle(role);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">
                            Continue with Google
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Choose your account type
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center"
                    >
                        <X className="w-4 h-4 text-slate-600" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-4">

                    {/* STUDENT */}
                    <button
                        onClick={() => handleRoleSelect("student")}
                        className="w-full rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all p-5 text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <GraduationCap className="w-7 h-7 text-blue-600" />
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    Student
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Join as a learner and access study resources
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* TUTOR */}
                    <button
                        onClick={() => handleRoleSelect("tutor")}
                        className="w-full rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all p-5 text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                <UserCheck className="w-7 h-7 text-emerald-600" />
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    Tutor
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Teach students and share your expertise
                                </p>
                            </div>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
}