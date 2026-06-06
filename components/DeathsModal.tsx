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
    isOwner: boolean;
}

export const DeathsModal: React.FC<DeathsModalProps> = ({ 
    isOpen, onClose, onBack, deaths, allSheep, pens, onDelete, barnName = 'المزرعة', isOwner
}) => {
    if (!isOpen) return null;

    const [typeFilter, setTypeFilter] = React.useState<'all' | 'ذبح' | 'ميت' | 'بيع' | 'other'>('all');
    const [dateFilter, setDateFilter] = React.useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');

    const calculateAgeDisplay = (dateStr: string) => {
        if (!dateStr) return '-';
        const birth = new Date(dateStr);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        if (months < 0) { years--; months += 12; }
        if (years > 0) return `${years} سنة`;
        return months === 1 ? 'شهر' : `${months} أشهر`;
    };

    const getParentSerial = (id: string | undefined) => {
        if (!id) return '-';
        const parent = allSheep.find(s => s.id === id || s.serialNumber === id);
        return parent ? parent.serialNumber : id;
    };

    const sortedDeaths = [...deaths].sort((a, b) => {
        const dateA = a.exclusionDate ? new Date(a.exclusionDate).getTime() : 0;
        const dateB = b.exclusionDate ? new Date(b.exclusionDate).getTime() : 0;
        return dateB - dateA;
    });

    const filteredDeaths = sortedDeaths.filter(sheep => {
        // 1. Filter by Type
        if (typeFilter !== 'all') {
            const notesVal = (sheep.notes || '').trim();
            if (typeFilter === 'ذبح') {
                if (notesVal !== 'ذبح') return false;
            } else if (typeFilter === 'ميت') {
                if (notesVal !== 'ميت') return false;
            } else if (typeFilter === 'بيع') {
                if (notesVal !== 'بيع') return false;
            } else if (typeFilter === 'other') {
                if (notesVal === 'ذبح' || notesVal === 'ميت' || notesVal === 'بيع') return false;
            }
        }

        // 2. Filter by Date
        if (dateFilter !== 'all' && sheep.exclusionDate) {
            const exclTime = new Date(sheep.exclusionDate).getTime();
            const nowTime = new Date().getTime();
            const diffMs = nowTime - exclTime;
            const oneDay = 24 * 60 * 60 * 1000;

            if (dateFilter === 'day') {
                if (diffMs > oneDay) return false;
            } else if (dateFilter === 'week') {
                if (diffMs > 7 * oneDay) return false;
            } else if (dateFilter === 'month') {
                if (diffMs > 30 * oneDay) return false;
            } else if (dateFilter === 'year') {
                if (diffMs > 365 * oneDay) return false;
            }
        }

        return true;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-lg h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800">
                
                {/* Header */}
                <div className="bg-gradient-to-br from-red-900 to-rose-950 p-4.5 px-6 text-white relative overflow-hidden shrink-0">
                    <div className="flex justify-between items-center relative z-10">
                        <button 
                            onClick={onClose} 
                            className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-full transition-all"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter">سجل الاستبعاد</h2>
                            </div>
                            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                                <Skull size={20} className="text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                </div>

                <div className="px-6 mt-4 space-y-3 shrink-0">
                    <div className="bg-red-50/50 backdrop-blur-md border border-red-100 p-3 rounded-xl flex items-center justify-between dark:bg-red-900/10 dark:border-red-900/20">
                       <span className="text-[10px] font-black text-red-900 uppercase tracking-widest dark:text-red-400">{barnName}</span>
                       <span className="bg-red-600 text-white text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-tighter">
                           {filteredDeaths.length} من {deaths.length} حالات استبعاد
                       </span>
                    </div>

                    {/* Filter Section */}
                    <div className="space-y-2.5 bg-gray-50/50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-800/80 p-3 rounded-2xl">
                        {/* Type Filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">نوع الاستبعاد</span>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {[
                                    { id: 'all', label: 'الكل' },
                                    { id: 'ذبح', label: 'ذبح' },
                                    { id: 'ميت', label: 'ميت' },
                                    { id: 'بيع', label: 'بيع' },
                                    { id: 'other', label: 'آخر' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTypeFilter(t.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all duration-200 border cursor-pointer shrink-0 ${
                                            typeFilter === t.id
                                                ? 'bg-red-900 border-red-900 text-white shadow-md shadow-red-950/20'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">تاريخ الاستبعاد</span>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {[
                                    { id: 'all', label: 'الكل' },
                                    { id: 'day', label: 'يوم' },
                                    { id: 'week', label: 'أسبوع' },
                                    { id: 'month', label: 'شهر' },
                                    { id: 'year', label: 'سنة' }
                                ].map(d => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => setDateFilter(d.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all duration-200 border cursor-pointer shrink-0 ${
                                            dateFilter === d.id
                                                ? 'bg-red-900 border-red-900 text-white shadow-md shadow-red-950/20'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {filteredDeaths.length > 0 ? (
                        filteredDeaths.map((sheep) => (
                            <div key={sheep.id} className="bg-white border border-gray-100 rounded-2xl p-4 transition-all hover:shadow-xl dark:bg-slate-800 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 relative shrink-0 dark:bg-red-900/20">
                                            <Skull size={18} />
                                            {sheep._count && sheep._count > 1 && (
                                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4.5 h-4.5 rounded-md flex items-center justify-center font-black">
                                                    {sheep._count}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-sm dark:text-white flex items-center gap-1.5 tracking-tighter">
                                                {sheep.tagColor && (
                                                    <div className="w-2 h-2 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: sheep.tagColor }} />
                                                )}
                                                #{sheep.serialNumber}
                                            </h4>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                                <span>{sheep.type}</span>
                                                <span className="text-gray-200">/</span>
                                                <span>{sheep.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button 
                                            onClick={() => onDelete(sheep.id)}
                                            className="p-2 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all dark:bg-slate-900 dark:text-slate-600 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">العمر عند الاستبعاد</p>
                                        <p className="text-xs font-black text-gray-800 dark:text-gray-200">
                                            {calculateAgeDisplay(sheep.birthDate)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">تاريخ الاستبعاد</p>
                                        <p className="text-xs font-black text-red-600">
                                            {sheep.exclusionDate ? new Date(sheep.exclusionDate).toLocaleDateString('en-GB') : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-orange-50/30 rounded-xl border border-orange-50 dark:bg-orange-900/5 dark:border-orange-900/10">
                                    <p className="text-[8px] font-black text-[#795548] uppercase tracking-widest mb-0.5 leading-none">ملاحظات وسبب الاستبعاد</p>
                                    <p className="text-[11px] font-bold text-gray-600 italic ltr:text-left rtl:text-right dark:text-gray-400">
                                        "{sheep.notes || 'لم يتم تحديد سبب الاستبعاد بالتفصيل'}"
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-400 border-t border-gray-50 pt-3 dark:border-slate-750">
                                    <div className="flex items-center gap-1.5">
                                        <Dna size={10} className="opacity-40" />
                                        <span>الأم:{getParentSerial(sheep.motherId)} / الأب:{getParentSerial(sheep.fatherId)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md dark:bg-slate-900">
                                        <Info size={8} />
                                        <span>الموقع: {pens.find(p => p.id === sheep.penId)?.name || 'غير معروف'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : deaths.length > 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-100 rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                            <div className="bg-gray-50 p-6 rounded-xl mb-4 dark:bg-slate-900">
                                <Skull size={48} className="text-gray-200 dark:text-slate-700" />
                            </div>
                            <p className="font-black text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest">لا توجد نتائج مطابقة</p>
                            <p className="text-[9px] font-bold text-gray-300 dark:text-gray-600 mt-1">جرب تغيير خيارات الفلترة المحددة</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-100 rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                            <div className="bg-gray-50 p-6 rounded-xl mb-4 dark:bg-slate-900">
                                <Skull size={48} className="text-gray-100 dark:text-slate-800" />
                            </div>
                            <p className="font-black text-sm text-gray-400 uppercase tracking-widest">السجل نظيف تماماً</p>
                            <p className="text-[9px] font-bold text-gray-300 mt-1">لا توجد حالات استبعاد مسجلة في هذه المزرعة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
