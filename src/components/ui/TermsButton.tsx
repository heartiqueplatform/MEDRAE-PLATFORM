"use client";

import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

interface TermsButtonProps {
    text?: string;       // Custom button text
    className?: string;  // Extra styling if needed
}

export function TermsButton({ text, className }: TermsButtonProps) {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <div className="flex flex-col items-center justify-center mt-10 text-center text-gray-500 dark:text-gray-400 space-y-4 px-4">
            <div className="max-w-xl">
                <p className="text-sm">
                    © {currentYear} <span className="font-semibold">Medrae Platform</span>. All rights reserved.
                </p>
                <p className="text-sm">
                    Medrae is your trusted platform for nursing revision questions, notes, and study utilities. By using Medrae, you agree to follow our simple rules: provide accurate information, respect other users, and follow applicable laws.
                </p>
                <button
                    onClick={() => navigate("/terms")}
                    className="inline-flex items-center gap-1 underline hover:text-gray-900 dark:hover:text-white text-sm font-medium mt-2"
                >
                    <FileText size={16} /> Terms & Conditions
                </button>
            </div>
        </div>
    );
}