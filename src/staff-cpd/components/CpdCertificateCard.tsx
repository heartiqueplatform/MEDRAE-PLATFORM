// src/staff-cpd/components/CpdCertificateCard.tsx
import { Award, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { type CpdCertificate, fmtDate } from "../lib";

export function CpdCertificateCard({ certificate }: { certificate: CpdCertificate }) {
    return (
        <Link
            to={`/cpd/certificates/${certificate.id}`}
            className="block rounded-2xl bg-white dark:bg-[#161b22] p-3 active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" strokeWidth={2.4} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Certificate
                    </p>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {certificate.certificate_number}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" /> Issued {fmtDate(certificate.issued_at)}
                        </span>
                    </div>
                    <p className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                        {certificate.verification_code}
                    </p>
                </div>

                <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0 mt-1" />
            </div>
        </Link>
    );
}