import React from 'react';
import { X, Skull, ArrowRight, Trash2, Dna, Info } from 'lucide-react';
import { Sheep, Pen } from '../types';

interface DeathsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack?: () => void;
    deaths: (Sheep & { _count?: number })[];
    allSheep: Sheep[];
    pens: Pen[];
    onDelete: (id: string) => void;
    barnName?: string;
}

export const DeathsModal: React.FC<DeathsModalProps> = ({ 
    isOpen, onClose, onBack, deaths, allSheep, pens, onDelete, barnName = 'المزرعة' 
}) => {
    if (!isOpen) return null;

    const calculateAgeDisplay = (dateStr: string) => {
        if (!dateStr) return '-';
        const birth = new Date(dateStr);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        if (months < 0) { years--; months += 12; }
        if (years > 0) return `${years} سنة`;
        return `${months} شهر`;
    };

    const getParentSerial = (id: string | undefined) => {
        if (!id) return '-';
        const parent = allSheep.find(s => s.id === id || s.serialNumber === id);
        return parent ? parent.serialNumber : id;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="glass-effect rounded-[2.5rem] w-full max-w-lg h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-scale-in dark:bg-slate-900/90 dark:border dark:border-slate-800">
                
                {/* Header */}
                <div className="bg-gradient-to-br from-red-900 to-rose-950 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <Skull size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter">سجل الاستبعاد</h2>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                        >
                            <X size={22} />
                        </button>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                </div>

                <div className="px-8 mt-6">
                    <div className="bg-red-50/50 backdrop-blur-md border border-red-100 p-4 rounded-2xl flex items-center justify-between dark:bg-red-900/10 dark:border-red-900/20">
                       <span className="text-xs font-black text-red-900 uppercase tracking-widest dark:text-red-400">{barnName}</span>
                       <span className="bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter">
                           {deaths.length} حالات استبعاد
                       </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {deaths.length > 0 ? (
                        deaths.map((sheep) => (
                            <div key={sheep.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 transition-all hover:shadow-xl dark:bg-slate-800 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 relative shrink-0 dark:bg-red-900/20">
                                            <Skull size={24} />
                                            {sheep._count && sheep._count > 1 && (
                                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-lg flex items-center justify-center font-black">
                                                    {sheep._count}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg dark:text-white flex items-center gap-2 tracking-tighter">
                                                {sheep.tagColor && (
                                                    <div className="w-3 h-3 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: sheep.tagColor }} />
                                                )}
                                                #{sheep.serialNumber}
                                            </h4>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                                <span>{sheep.type}</span>
                                                <span className="text-gray-200">/</span>
                                                <span>{sheep.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onDelete(sheep.id)}
                                        className="p-3 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all dark:bg-slate-900 dark:text-slate-600 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">العمر عند النفوق</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                                            {calculateAgeDisplay(sheep.birthDate)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">تاريخ الاستبعاد</p>
                                        <p className="text-sm font-black text-red-600">
                                            {sheep.exclusionDate ? new Date(sheep.exclusionDate).toLocaleDateString('ar-SA') : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-orange-50/30 rounded-2xl border border-orange-50 dark:bg-orange-900/5 dark:border-orange-900/10">
                                    <p className="text-[9px] font-black text-[#795548] uppercase tracking-widest mb-1 leading-none">ملاحظات وسبب الاستبعاد</p>
                                    <p className="text-xs font-bold text-gray-600 italic ltr:text-left rtl:text-right dark:text-gray-400">
                                        "{sheep.notes || 'لم يتم تحديد سبب الوفاة بالتفصيل'}"
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 border-t border-gray-50 pt-4 dark:border-slate-750">
                                    <div className="flex items-center gap-2">
                                        <Dna size={12} className="opacity-40" />
                                        <span>الأم:{getParentSerial(sheep.motherId)} / الأب:{getParentSerial(sheep.fatherId)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg dark:bg-slate-900">
                                        <Info size={10} />
                                        <span>الموقع: {pens.find(p => p.id === sheep.penId)?.name || 'غير معروف'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-100 rounded-[2.5rem] dark:bg-slate-800 dark:border-slate-700">
                            <div className="bg-gray-50 p-8 rounded-[2rem] mb-6 dark:bg-slate-900/50">
                                <Skull size={64} className="text-gray-100 dark:text-slate-800" />
                            </div>
                            <p className="font-black text-lg text-gray-400 uppercase tracking-widest">السجل نظيف تماماً</p>
                            <p className="text-[10px] font-bold text-gray-300 mt-2">لا توجد حالات استبعاد مسجلة في هذه المزرعة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
