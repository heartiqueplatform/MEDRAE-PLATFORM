// src/components/MedraeSocialFooter.tsx
"use client";

import Link from "next/link"; // If using Vite/React Router, swap to: import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

interface MedraeSocialFooterProps {
    /** Optional: close handler (e.g. for overlays/modals) */
    onNavigate?: () => void;
    /** Optional: extra classes for outer wrapper */
    className?: string;
    /** Optional: hide the border-top divider */
    hideDivider?: boolean;
}

export function MedraeSocialFooter({
    onNavigate,
    className = "",
    hideDivider = false,
}: MedraeSocialFooterProps) {
    const navigate = useNavigate();

    const handleLegalNav = (path: string) => {
        onNavigate?.();
        navigate(path);
    };

    return (
        <div
            className={`mt-2 pt-6 pb-2 text-center select-none ${hideDivider
                ? ""
                : "border-t border-slate-100 dark:border-slate-800/60"
                } ${className}`}
        >
            {/* Brand + Tagline */}
            <p className="text-[7px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 opacity-60">
                Medrae Nursing All rights reserved
            </p>

            {/* Social Icons Row */}
            <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
                {/* MEDRAE Logo */}
                <a
                    href="https://medrae-nursing.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="MEDRAE Nursing Website"
                    className="group flex h-8 w-8 items-center justify-center rounded-full overflow-hidden
                       bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700
                       transition-transform hover:scale-110 active:scale-95"
                >
                    <svg
                        viewBox="0 0 192 192"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-full w-full"
                        aria-hidden="true"
                    >
                        <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF" />
                        <path
                            d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z"
                            fill="#FF1F1F"
                        />
                        <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF" />
                        <path
                            d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z"
                            fill="#FFFFFF"
                        />
                        <path
                            d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91"
                            fill="none"
                            stroke="#FF1F1F"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path d="M96 82 V101" stroke="#FF1F1F" strokeWidth="2.5" />
                        <circle cx="94" cy="82" r="3.5" fill="#FF1F1F" />
                        <path
                            d="M94 82 C86 86 75 88 63 89"
                            fill="none"
                            stroke="#FF1F1F"
                            strokeWidth="2"
                        />
                        <path
                            d="M63 89 C61 94 61 98 61 103"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <circle cx="61" cy="105" r="4" fill="#FFFFFF" />
                        <path
                            d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z"
                            fill="#FFFFFF"
                        />
                    </svg>
                </a>

                {/* WhatsApp */}
                <a
                    href="https://wa.me/254704473503"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                </a>

                {/* TikTok */}
                <a
                    href="https://tiktok.com/@medraenursing"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09z" />
                    </svg>
                </a>

                {/* Instagram */}
                <a
                    href="https://instagram.com/medraenursing"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400 transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                </a>

                {/* X */}
                <a
                    href="https://x.com/medraenursing"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="X"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-black transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-white">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                </a>

                {/* YouTube */}
                <a
                    href="https://youtube.com/@medraenursing"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                </a>

                {/* Facebook */}
                <a
                    href="https://facebook.com/medraenursing"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 transition-transform hover:scale-110 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                </a>
            </div>

            {/* Handle */}
            <a
                href="https://instagram.com/medraenursing"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[10px] font-bold text-slate-500 dark:text-slate-400
                   hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-wide"
            >
                @medraenursing
            </a>

            {/* Legal Links */}
            <div className="mt-2 flex items-center justify-center gap-3">
                <button
                    onClick={() => handleLegalNav("/privacy")}
                    className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors tracking-widest"
                >
                    Privacy
                </button>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <button
                    onClick={() => handleLegalNav("/terms")}
                    className="text-[8px] font-bold text-slate-500 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors tracking-widest"
                >
                    Terms
                </button>
            </div>

            {/* Version */}
            <div className="mt-3 text-center">
                <p className="text-[8px] font-bold text-slate-300 dark:text-slate-700 tracking-widest">
                    Version 2026.06 Medrae Learning System
                </p>
            </div>
        </div>
    );
}

export default MedraeSocialFooter;