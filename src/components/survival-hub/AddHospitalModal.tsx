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
        <div className="fixed inset-0 z-[100] flex items-center  justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            {/* Modal Container - Added max-height and overflow for long forms */}
            <div className="w-full max-w-md bg-white dark:bg-muted/30 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                            <HospitalIcon className="text-rose-600" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Hospital</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Form Area - Scrollable */}
                <form onSubmit={handleSubmit} className="space-y-1 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Hospital Name */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Hospital Name *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                placeholder="e.g. Mater Hospital"
                                value={formData.hospital_name}
                                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Location & Distance Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-9 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="Area/Street"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Distance</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-9 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="e.g. 5 mins walk"
                                    value={formData.distance}
                                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Type & Contact Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Category</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white appearance-none"
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-9 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                    placeholder="07..."
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Departments */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Available Departments</label>
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                                placeholder="e.g. Maternity, OPD, Pediatrics"
                                value={formData.department_availability}
                                onChange={(e) => setFormData({ ...formData, department_availability: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Student Acceptance Toggle */}
                    <div
                        onClick={() => setFormData({ ...formData, student_acceptance: !formData.student_acceptance })}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${formData.student_acceptance
                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className={formData.student_acceptance ? 'text-emerald-500' : 'text-slate-400'} size={20} />
                            <div>
                                <p className="text-sm font-bold dark:text-white">Student Friendly?</p>
                                <p className="text-[10px] text-slate-500">Facility accepts nursing students</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.student_acceptance ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full transition-transform ${formData.student_acceptance ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Additional Notes</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 text-slate-400" size={18} />
                            <textarea
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 pl-10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white resize-none"
                                placeholder="e.g. Very fast service, expensive, good for skills..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 dark:shadow-none transition-all active:scale-95 shrink-0"
                    >
                        <Save size={20} />
                        Save Facility Details
                    </button>
                </form>

                <p className="text-[10px] text-center text-slate-400 mt-4 shrink-0">
                    By saving, you are helping fellow students in this region.
                </p>
            </div>
        </div>
    );
};