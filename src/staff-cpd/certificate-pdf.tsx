// src/staff-cpd/certificate-pdf.tsx
import { useEffect } from "react";
import type { CpdCertificate, CpdCompletion, CpdActivity } from "./lib";
import { fmtDate, fmtHours, fmtPoints } from "./lib";

// ─────────────────────────────────────────────────────────────
// Props — everything the certificate needs
// ─────────────────────────────────────────────────────────────
export interface CertificateRecipient {
    name: string | null;
    nck_number: string | null;
    specialization: string | null;
    institution: string | null;
    county: string | null;
}

export interface CpdCertificatePdfProps {
    certificate: CpdCertificate;
    completion: CpdCompletion | null;
    activity: CpdActivity | null;
    recipient: CertificateRecipient | null;
    /** Trigger the browser print dialog on mount */
    autoPrint?: boolean;
}

// ─────────────────────────────────────────────────────────────
// The print-only stylesheet — injected into <head> once
// ─────────────────────────────────────────────────────────────
const PRINT_CSS_ID = "cpd-certificate-print-css";
const PRINT_CSS = `
  /* Default: hide the print layer in the browser UI */
  .cpd-cert-print-layer { display: none; }

  @media print {
    /* Hide everything else */
    body * { visibility: hidden !important; }
    .cpd-cert-print-layer,
    .cpd-cert-print-layer * { visibility: visible !important; }

    .cpd-cert-print-layer {
      display: block !important;
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: #ffffff !important;
      color: #000000 !important;
    }

    @page {
      size: A4 landscape;
      margin: 0;
    }

    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

function ensurePrintCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById(PRINT_CSS_ID)) return;
    const style = document.createElement("style");
    style.id = PRINT_CSS_ID;
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
// The visible certificate — rendered inside .cpd-cert-print-layer
// ─────────────────────────────────────────────────────────────
export function CpdCertificatePdf({
    certificate,
    completion,
    activity,
    recipient,
    autoPrint = false,
}: CpdCertificatePdfProps) {
    useEffect(() => {
        ensurePrintCss();
    }, []);

    useEffect(() => {
        if (!autoPrint) return;
        const t = setTimeout(() => {
            window.print();
        }, 350);
        return () => clearTimeout(t);
    }, [autoPrint]);

    const fullName = recipient?.name?.trim() || "Nurse";
    const nck = recipient?.nck_number?.trim() || null;
    const institution = recipient?.institution?.trim() || null;
    const county = recipient?.county?.trim() || null;
    const specialization = recipient?.specialization?.trim() || null;

    const issuedOn = fmtDate(certificate.issued_at);
    const completedOn = completion?.completed_at ? fmtDate(completion.completed_at) : issuedOn;
    const hours = fmtHours(completion?.learning_hours_completed ?? activity?.learning_hours ?? 0);
    const points = fmtPoints(completion?.points_awarded ?? activity?.configured_cpd_points ?? 0);
    const score = completion?.assessment_score != null
        ? `${Math.round(completion.assessment_score)}%`
        : null;

    return (
        <div className="cpd-cert-print-layer">
            {/* Full A4 landscape, edge-to-edge */}
            <div
                style={{
                    width: "297mm",
                    height: "210mm",
                    padding: "14mm 18mm",
                    boxSizing: "border-box",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontFamily:
                        "'Inter','Helvetica Neue',Arial,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Outer decorative border */}
                <div
                    style={{
                        position: "absolute",
                        inset: "10mm",
                        border: "1.5pt solid #e5e7eb",
                        borderRadius: "3mm",
                        pointerEvents: "none",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        inset: "12mm",
                        border: "0.5pt solid #f1f5f9",
                        borderRadius: "2mm",
                        pointerEvents: "none",
                    }}
                />

                {/* ── TOP: logo + brand ─────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "center", gap: "6mm", position: "relative", zIndex: 1 }}>
                    <img
                        src="/pwa-512x512.png"
                        alt="Medrae Nursing"
                        crossOrigin="anonymous"
                        style={{
                            height: "20mm",
                            width: "20mm",
                            objectFit: "contain",
                            borderRadius: "3mm",
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: "22pt",
                                fontWeight: 900,
                                letterSpacing: "-0.02em",
                                lineHeight: 1,
                            }}
                        >
                            <span style={{ color: "#dc2626" }}>MEDRAE</span>{" "}
                            <span style={{ color: "#0f172a" }}>NURSING</span>
                        </div>
                        <div
                            style={{
                                fontSize: "8.5pt",
                                color: "#64748b",
                                fontWeight: 600,
                                letterSpacing: "0.15em",
                                marginTop: "1.5mm",
                                textTransform: "uppercase",
                            }}
                        >
                            Kenya Nursing Network
                        </div>
                    </div>
                </div>

                {/* ── HEADING ───────────────────────────────────────── */}
                <div style={{ textAlign: "center", marginTop: "10mm", position: "relative", zIndex: 1 }}>
                    <div
                        style={{
                            display: "inline-block",
                            padding: "1.5mm 6mm",
                            borderTop: "1pt solid #dc2626",
                            borderBottom: "1pt solid #dc2626",
                            fontSize: "9pt",
                            fontWeight: 700,
                            letterSpacing: "0.35em",
                            textTransform: "uppercase",
                            color: "#dc2626",
                        }}
                    >
                        Certificate of Completion
                    </div>

                    <div
                        style={{
                            fontSize: "10.5pt",
                            color: "#475569",
                            fontWeight: 500,
                            marginTop: "4mm",
                        }}
                    >
                        Continuing Professional Development
                    </div>
                </div>

                {/* ── RECIPIENT ────────────────────────────────────── */}
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "8mm",
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            fontSize: "9pt",
                            color: "#64748b",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                        }}
                    >
                        This certificate is proudly presented to
                    </div>

                    <div
                        style={{
                            fontSize: "28pt",
                            fontWeight: 800,
                            marginTop: "4mm",
                            lineHeight: 1.1,
                            letterSpacing: "-0.01em",
                            color: "#0f172a",
                        }}
                    >
                        {fullName}
                    </div>

                    {/* Credentials row — only render if any credential exists */}
                    {(nck || institution || county || specialization) && (
                        <div
                            style={{
                                fontSize: "9.5pt",
                                color: "#475569",
                                marginTop: "3mm",
                                display: "flex",
                                justifyContent: "center",
                                gap: "4mm",
                                flexWrap: "wrap",
                            }}
                        >
                            {nck && (
                                <span>
                                    <b style={{ color: "#0f172a" }}>NCK:</b> {nck}
                                </span>
                            )}
                            {specialization && (
                                <span>
                                    <b style={{ color: "#0f172a" }}>Specialization:</b> {specialization}
                                </span>
                            )}
                            {institution && (
                                <span>
                                    <b style={{ color: "#0f172a" }}>Institution:</b> {institution}
                                </span>
                            )}
                            {county && (
                                <span>
                                    <b style={{ color: "#0f172a" }}>County:</b> {county}
                                </span>
                            )}
                        </div>
                    )}

                    <div
                        style={{
                            fontSize: "10pt",
                            color: "#64748b",
                            marginTop: "7mm",
                            lineHeight: 1.6,
                        }}
                    >
                        for the successful completion of the CPD activity
                    </div>

                    <div
                        style={{
                            fontSize: "16pt",
                            fontWeight: 700,
                            marginTop: "2mm",
                            color: "#dc2626",
                            lineHeight: 1.2,
                        }}
                    >
                        {activity?.title ?? "CPD Activity"}
                    </div>

                    {activity?.category && (
                        <div
                            style={{
                                display: "inline-block",
                                marginTop: "2.5mm",
                                padding: "1mm 4mm",
                                background: "#f1f5f9",
                                color: "#334155",
                                borderRadius: "999px",
                                fontSize: "8.5pt",
                                fontWeight: 600,
                                letterSpacing: "0.05em",
                            }}
                        >
                            {activity.category}
                        </div>
                    )}
                </div>

                {/* ── STATS STRIP ───────────────────────────────────── */}
                <div
                    style={{
                        marginTop: "8mm",
                        display: "grid",
                        gridTemplateColumns: score
                            ? "1fr 1fr 1fr 1fr"
                            : "1fr 1fr 1fr",
                        gap: "0",
                        border: "1pt solid #e2e8f0",
                        borderRadius: "2mm",
                        overflow: "hidden",
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <StatCell label="Learning Hours" value={hours} />
                    <StatCell label="CPD Points" value={points} highlight />
                    {score && <StatCell label="Assessment Score" value={score} />}
                    <StatCell label="Completed On" value={completedOn} noBorder />
                </div>

                {/* ── FOOTER ────────────────────────────────────────── */}
                <div
                    style={{
                        marginTop: "auto",
                        paddingTop: "6mm",
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            gap: "8mm",
                        }}
                    >
                        {/* Left: certificate metadata */}
                        <div style={{ fontSize: "8.5pt", color: "#475569", lineHeight: 1.7 }}>
                            <div>
                                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Certificate No.</span>{" "}
                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                    {certificate.certificate_number}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Verification Code</span>{" "}
                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                    {certificate.verification_code}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Verify at</span>{" "}
                                <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>
                                    medrae.app/cpd/verify/{certificate.verification_code}
                                </span>
                            </div>
                        </div>

                        {/* Right: signature blocks */}
                        <div style={{ display: "flex", gap: "10mm" }}>
                            <SignatureBlock label="CPD Officer" />
                            <SignatureBlock label="Clinical Director" />
                        </div>
                    </div>

                    {/* Bottom rule + issued date */}
                    <div
                        style={{
                            marginTop: "6mm",
                            paddingTop: "3mm",
                            borderTop: "0.5pt solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "8pt",
                            color: "#94a3b8",
                            letterSpacing: "0.05em",
                        }}
                    >
                        <span>
                            Issued on <b style={{ color: "#475569" }}>{issuedOn}</b>
                        </span>
                        <span style={{ textAlign: "right" }}>
                            This certificate can be verified at any time using the code above.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────
function StatCell({
    label,
    value,
    highlight = false,
    noBorder = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
    noBorder?: boolean;
}) {
    return (
        <div
            style={{
                padding: "5mm 4mm",
                borderRight: noBorder ? "none" : "0.5pt solid #e2e8f0",
                background: highlight ? "#fef3c7" : "#ffffff",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: "8pt",
                    color: "#94a3b8",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: "16pt",
                    fontWeight: 800,
                    color: highlight ? "#b45309" : "#0f172a",
                    marginTop: "1.5mm",
                    lineHeight: 1,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function SignatureBlock({ label }: { label: string }) {
    return (
        <div style={{ textAlign: "center", minWidth: "32mm" }}>
            <div
                style={{
                    height: "12mm",
                    borderBottom: "0.75pt solid #0f172a",
                    marginBottom: "2mm",
                }}
            />
            <div
                style={{
                    fontSize: "8pt",
                    color: "#475569",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                }}
            >
                {label}
            </div>
        </div>
    );
}