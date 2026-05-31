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
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [isOpen]);
    useEffect(() => {
        if (initialData) setFormData(initialData);
        else setFormData({ name: '', county: '', town: '', venue_type: 'School/College', map_link: '', notes: '' });
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-muted/30 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <MapPin className="text-blue-500" /> {initialData ? 'Edit Center' : 'Add Exam Center'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Center Name (Official)</label>
                        <input required className="w-full bg-slate-50 dark:bg-slate-800 border-none p-3 rounded-2xl text-sm dark:text-white"
                            placeholder="e.g. KMTC Nairobi" value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">County</label>
                            <input required className="w-full bg-slate-50 dark:bg-slate-800 border-none p-3 rounded-2xl text-sm dark:text-white"
                                placeholder="e.g. Mombasa" value={formData.county}
                                onChange={e => setFormData({ ...formData, county: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Town</label>
                            <input className="w-full bg-slate-50 dark:bg-slate-800 border-none p-3 rounded-2xl text-sm dark:text-white"
                                placeholder="e.g. Nyali" value={formData.town}
                                onChange={e => setFormData({ ...formData, town: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Venue Type</label>
                        <select className="w-full bg-slate-50 dark:bg-slate-800 border-none p-3 rounded-2xl text-sm dark:text-white"
                            value={formData.venue_type} onChange={e => setFormData({ ...formData, venue_type: e.target.value })}>
                            <option value="School/College">School/College</option>
                            <option value="Hospital Hall">Hospital Hall</option>
                            <option value="Social Hall">Social Hall</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block px-1">Google Maps Link</label>
                        <input className="w-full bg-slate-50 dark:bg-slate-800 border-none p-3 rounded-2xl text-sm dark:text-white"
                            placeholder="Paste URL here" value={formData.map_link}
                            onChange={e => setFormData({ ...formData, map_link: e.target.value })} />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                        <Save size={20} /> Save Exam Center
                    </button>
                </form>
            </div>
        </div>
    );
};