import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Building, Info, Link as LinkIcon } from 'lucide-react';

export const AddCenterModal = ({ isOpen, onClose, onSubmit, initialData }: any) => {
    const [formData, setFormData] = useState({
        name: '',
        county: '',
        town: '',
        venue_type: 'School/College',
        map_link: '',
        notes: ''
    });

    useEffect(() => {
        const appRoot = document.getElementById("root");

        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
            appRoot?.classList.add("overflow-hidden");
        } else {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            appRoot?.classList.remove("overflow-hidden");
        }

        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            appRoot?.classList.remove("overflow-hidden");
        };
    }, [isOpen]);

    useEffect(() => {
        if (initialData) setFormData(initialData);
        else setFormData({ name: '', county: '', town: '', venue_type: 'School/College', map_link: '', notes: '' });
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-slate-900">

            {/* ============ STICKY HEADER — sits on top, no border ============ */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 md:px-6 md:py-4 shrink-0">
                <div className="flex justify-between items-center max-w-xl mx-auto">
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl">
                            <MapPin className="text-blue-600 md:w-6 md:h-6" size={20} />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                            {initialData ? 'Edit Center' : 'Add Exam Center'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="inline-flex w-fit items-center justify-center p-1.5 text-slate-700 dark:text-slate-200 active:opacity-60 transition"
                    >
                        <X className="md:w-6 md:h-6" size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* ============ SCROLLABLE FORM AREA ============ */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 md:pb-8">
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}
                    className="max-w-xl mx-auto space-y-3.5 md:space-y-4 pt-3 md:pt-4"
                >
                    {/* Center Name */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Center Name (Official)</label>
                        <input
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. KMTC Nairobi"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* County & Town Grid */}
                    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">County</label>
                            <input
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Mombasa"
                                value={formData.county}
                                onChange={e => setFormData({ ...formData, county: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Town</label>
                            <input
                                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Nyali"
                                value={formData.town}
                                onChange={e => setFormData({ ...formData, town: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Venue Type */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Venue Type</label>
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            value={formData.venue_type}
                            onChange={e => setFormData({ ...formData, venue_type: e.target.value })}
                        >
                            <option value="School/College">School/College</option>
                            <option value="Hospital Hall">Hospital Hall</option>
                            <option value="Social Hall">Social Hall</option>
                        </select>
                    </div>

                    {/* Google Maps Link */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Google Maps Link</label>
                        <input
                            className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Paste URL here"
                            value={formData.map_link}
                            onChange={e => setFormData({ ...formData, map_link: e.target.value })}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm md:text-base"
                    >
                        <Save className="md:w-5 md:h-5" size={18} />
                        <span>Save Exam Center</span>
                    </button>
                </form>
            </div>
        </div>
    );
};