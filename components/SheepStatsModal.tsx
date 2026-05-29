import React, { useState, useMemo } from 'react';
import { X, Calendar, Filter, Baby, MapPin, TrendingUp, FileText } from 'lucide-react';
import { Sheep, Pen } from '../types';

interface SheepStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sheep: Sheep[];
    pens: Pen[];
}

export const SheepStatsModal: React.FC<SheepStatsModalProps> = ({ isOpen, onClose, sheep, pens }) => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Helper to find pen name
    const getPenName = (penId: string) => {
        const pen = pens.find(p => p.id === penId);
        return pen ? pen.name : 'غير محدد';
    };

    // 1. Calculate Per-Animal Stats (Offspring & Last Birth)
    const animalStats = useMemo(() => {
        return sheep.map(animal => {
            // Find children
            const children = sheep.filter(s => s.motherId === animal.serialNumber || s.fatherId === animal.serialNumber);

            // Calculate Last Birth
            let lastBirth = '-';
            if (children.length > 0) {
                // Sort by birth date descending
                const sortedChildren = [...children].sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime());
                lastBirth = sortedChildren[0].birthDate;
            }

            return {
                ...animal,
                offspringCount: children.length,
                lastBirthDate: lastBirth
            };
        });
    }, [sheep]);

    // 2. Filter Content
    const filteredData = useMemo(() => {
        let data = animalStats;
        if (startDate) {
            data = data.filter(s => s.lastBirthDate !== '-' && s.lastBirthDate >= startDate);
        }
        if (endDate) {
            data = data.filter(s => s.lastBirthDate !== '-' && s.lastBirthDate <= endDate);
        }
        return data;
    }, [animalStats, startDate, endDate]);

    // 3. Pen Distribution Stats (Counts per Pen)
    const penCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        sheep.forEach(s => {
            const pName = getPenName(s.penId);
            counts[pName] = (counts[pName] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]); // Sort by count descending
    }, [sheep, pens]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800">

                {/* Header */}
                <div className="bg-gradient-to-br from-[#3E2723] to-[#795548] p-8 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <TrendingUp size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter">تحليلات القطيع</h2>
                                <p className="text-orange-100/60 text-[10px] font-black mt-1 uppercase tracking-widest leading-none">
                                    Herd Analytics & Demographics
                                </p>
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

                {/* Filters & Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white/30 dark:bg-transparent custom-scrollbar space-y-8">

                    {/* Pen Distribution Summary */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <MapPin size={16} className="text-[#795548]" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">توزيع الكثافة في الأقسام</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {penCounts.map(([name, count]) => (
                                <div key={name} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center dark:bg-slate-800 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mb-1 truncate w-full">{name}</span>
                                    <span className="text-2xl font-black text-[#795548] dark:text-orange-100">{count}</span>
                                    <span className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-widest">Heads</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Date Filter */}
                    <div className="bg-white border border-white rounded-[2rem] p-6 shadow-xl dark:bg-slate-800 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-[#795548]" />
                                <h3 className="text-sm font-black text-gray-800 dark:text-white">فلترة الولادات</h3>
                            </div>
                            <div className="h-px bg-gray-100 flex-1 mx-4 dark:bg-slate-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">من تاريخ</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="space-y-4 pb-4">
                        <div className="flex items-center gap-2 px-1">
                            <FileText size={16} className="text-[#795548]" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">السجل التفصيلي للإنتاجية</p>
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-50 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-900">
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">رقم الرأس</th>
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">النوع / الجنس</th>
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">الوسم</th>
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">الإنتاج</th>
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">آخر ولادة</th>
                                            <th className="p-5 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">الموقع الحالي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-50 dark:divide-slate-700/50">
                                        {filteredData.length > 0 ? (
                                            filteredData.map((animal) => (
                                                <tr key={animal.id} className="hover:bg-orange-50/30 transition-colors group dark:hover:bg-slate-700/30">
                                                    <td className="p-5">
                                                        <span className="font-black text-gray-900 group-hover:text-[#795548] transition-colors dark:text-white">#{animal.serialNumber}</span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800 dark:text-gray-200">{animal.type}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{animal.gender === 'male' ? 'Ram/Buck' : 'Ewe/Doe'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-2">
                                                            {animal.tagColor && (
                                                                <div className="w-3.5 h-3.5 rounded-full border border-gray-100 shadow-sm shrink-0" style={{ backgroundColor: animal.tagColor }}></div>
                                                            )}
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{animal.tagColor || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${animal.offspringCount > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-50 text-gray-300 dark:bg-slate-900 dark:text-slate-700'}`}>
                                                            {animal.offspringCount}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className="text-[11px] font-black text-gray-500 bg-gray-50/50 px-2.5 py-1 rounded-lg border border-gray-100 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400">
                                                            {animal.lastBirthDate}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="text-[10px] font-black text-[#795548] bg-orange-50 px-3 py-1.5 rounded-xl uppercase tracking-tighter dark:bg-orange-900/20 dark:text-orange-300">
                                                            {getPenName(animal.penId)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-4 dark:bg-slate-900">
                                                            <Filter size={32} className="text-gray-200" />
                                                        </div>
                                                        <p className="font-black text-gray-300 uppercase tracking-widest text-xs">لا توجد سجلات مطابقة المعايير</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
