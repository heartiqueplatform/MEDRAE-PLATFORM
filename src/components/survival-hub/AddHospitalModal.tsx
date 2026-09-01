import React, { useState, useEffect } from 'react';
import { X, Save, Hospital as HospitalIcon, MapPin, Phone, Building2, Clock, Stethoscope, MessageSquare, CheckCircle2 } from 'lucide-react';

interface AddHospitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    centerId: string | null;
}

export const AddHospitalModal = ({ isOpen, onClose, onSubmit, centerId }: AddHospitalModalProps) => {
    const [formData, setFormData] = useState({
        hospital_name: '',
        location: '',
        distance: '',
        hospital_type: 'Public',
        department_availability: '',
        student_acceptance: true,
        contact: '',
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

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...formData, exam_center_id: centerId });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
            {/* Modal Container - Mobile bottom sheet style */}
            <div className="w-full md:max-w-md bg-white dark:bg-muted/30 rounded-t-3xl md:rounded-3xl p-5 md:p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-8 duration-300 max-h-[95vh] md:max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0">
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg md:rounded-xl">
                            <HospitalIcon className="text-rose-600" size={20} className="md:w-6 md:h-6" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Add Hospital</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={18} className="md:w-5 md:h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form Area - Scrollable */}
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1">

                    {/* Hospital Name */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Hospital Name *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} className="md:w-[18px] md:h-[18px]" />
                            <input
                                required
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-9 md:pl-10 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                placeholder="e.g. Mater Hospital"
                                value={formData.hospital_name}
                                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Location & Distance Grid */}
                    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} className="md:w-4 md:h-4" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-8 md:pl-9 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="Area/Street"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Distance</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} className="md:w-4 md:h-4" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-8 md:pl-9 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="e.g. 5 mins walk"
                                    value={formData.distance}
                                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Type & Contact Grid */}
                    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Category</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white appearance-none"
                                value={formData.hospital_type}
                                onChange={(e) => setFormData({ ...formData, hospital_type: e.target.value })}
                            >
                                <option value="Public">Public</option>
                                <option value="Private">Private</option>
                                <option value="Mission">Mission</option>
                                <option value="Clinic">Clinic</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} className="md:w-4 md:h-4" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-8 md:pl-9 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="07..."
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Departments */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Available Departments</label>
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} className="md:w-[18px] md:h-[18px]" />
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-9 md:pl-10 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                placeholder="e.g. Maternity, OPD, Pediatrics"
                                value={formData.department_availability}
                                onChange={(e) => setFormData({ ...formData, department_availability: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Student Acceptance Toggle - Mobile Optimized */}
                    <div
                        onClick={() => setFormData({ ...formData, student_acceptance: !formData.student_acceptance })}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${formData.student_acceptance
                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800'
                            }`}
                    >
                        <div className="flex items-center gap-2.5 md:gap-3">
                            <CheckCircle2 className={formData.student_acceptance ? 'text-emerald-500' : 'text-slate-400'} size={18} className="md:w-5 md:h-5" />
                            <div>
                                <p className="text-xs md:text-sm font-bold dark:text-white">Student Friendly?</p>
                                <p className="text-[9px] md:text-[10px] text-slate-500">Facility accepts nursing students</p>
                            </div>
                        </div>
                        <div className={`w-9 md:w-10 h-5 md:h-6 rounded-full p-0.5 md:p-1 transition-colors ${formData.student_acceptance ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}>
                            <div className={`bg-white w-4 md:w-4 h-4 md:h-4 rounded-full transition-transform ${formData.student_acceptance ? 'translate-x-4 md:translate-x-4' : 'translate-x-0'
                                }`} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 block px-1">Additional Notes</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-2.5 md:top-3 text-slate-400" size={16} className="md:w-[18px] md:h-[18px]" />
                            <textarea
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-2.5 md:p-3 pl-9 md:pl-10 rounded-xl md:rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white resize-none"
                                placeholder="e.g. Very fast service, expensive, good for skills..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 shrink-0 text-sm md:text-base"
                    >
                        <Save size={18} className="md:w-5 md:h-5" />
                        Save Facility Details
                    </button>
                </form>

                <p className="text-[9px] md:text-[10px] text-center text-slate-400 mt-3 md:mt-4 shrink-0">
                    By saving, you are helping fellow students in this region.
                </p>
            </div>
        </div>
    );
};