import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 1. Import createPortal
import { Search, X, Check, MapPin, Loader2, ChevronDown } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    subtext?: string;
}

interface SmartSelectProps {
    label?: string;
    options: Option[];
    value: string | null;
    onChange: (id: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    categoryName?: string;
}

const SmartSelect = ({ label, options, value, onChange, placeholder, isLoading, categoryName }: SmartSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = options.find(opt => opt.id === value);
    const filtered = options.filter(opt =>
        opt.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [isOpen]);

    // THE OVERLAY CONTENT
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />

            {/* Content Card */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl h-[85vh] sm:h-auto sm:max-h-[600px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">

                {/* Search Header */}
                <div className="p-4 border-b dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg dark:text-white leading-none">Select {categoryName}</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-1">{options.length} Available</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            autoFocus
                            placeholder="Search by name..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-sm outline-none transition-all dark:text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 scrollbar-hide">
                    {filtered.length > 0 ? (
                        filtered.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-xl mb-1 transition-all ${value === opt.id
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'
                                    } border`}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className={`p-2 rounded-lg ${value === opt.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${value === opt.id ? 'text-blue-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {opt.name}
                                        </p>
                                        {opt.subtext && <p className="text-xs text-slate-400 tracking-tighter">{opt.subtext}</p>}
                                    </div>
                                </div>
                                {value === opt.id && <Check size={18} className="text-blue-600" />}
                            </button>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <Search size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No results found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full">
            {label && <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest ml-1">{label}</label>}

            {/* TRIGGER BUTTON - THIS STAYS IN THE HEADER */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="group w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-2.5 text-sm font-medium transition-all hover:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:text-white"
            >
                <div className="flex items-center gap-2 truncate">
                    {isLoading ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <MapPin size={14} className="text-blue-500 shrink-0" />}
                    <span className={`truncate ${selectedOption ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {/* THE MODAL - THIS GETS TELEPORTED TO THE BODY */}
            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

export default SmartSelect;