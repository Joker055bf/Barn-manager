import React, { useMemo } from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';
import { Sheep } from '../types';
import { getAnimalAgeLabel, getPossibleAgeLabels } from '../utils/animalHelpers';

interface TypeAgeStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sheep: Sheep[];
    onSelectBreed?: (breed: string) => void;
}

export const TypeAgeStatsModal: React.FC<TypeAgeStatsModalProps> = ({ isOpen, onClose, sheep, onSelectBreed }) => {
    const statsByType = useMemo(() => {
        // Group sheep by type/breed
        const grouped: Record<string, { total: number; ageCounts: Record<string, number>; orderedCategories: string[] }> = {};

        sheep.forEach((s) => {
            const typeLabel = s.type;
            const ageLabel = getAnimalAgeLabel(s.birthDate, s.type, s.gender);

            if (!grouped[typeLabel]) {
                // Get all possible age labels for this animal type to ensure proper sorting
                const maleLabels = getPossibleAgeLabels(typeLabel, 'male');
                const femaleLabels = getPossibleAgeLabels(typeLabel, 'female');
                
                // Merge unique labels in order
                const allLabelsSet = new Set([...maleLabels, ...femaleLabels, 'طفل', 'جذع', 'ثني', 'رباع', 'سداس', 'تام']);
                const orderedCategories = Array.from(allLabelsSet);

                grouped[typeLabel] = {
                    total: 0,
                    ageCounts: {},
                    orderedCategories
                };
            }

            grouped[typeLabel].total += 1;
            grouped[typeLabel].ageCounts[ageLabel] = (grouped[typeLabel].ageCounts[ageLabel] || 0) + 1;
        });

        return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
    }, [sheep]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-lg max-h-[85vh] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden animate-scale-in dark:bg-slate-900 border border-gray-100/10">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#3E2723] to-[#795548] p-6 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <Trophy size={22} className="text-orange-200" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight">تفاصيل الأعمار</h2>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all active:scale-95"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white/30 dark:bg-transparent space-y-6 custom-scrollbar">
                    {statsByType.length > 0 ? (
                        statsByType.map(([breed, { total, ageCounts, orderedCategories }]) => {
                            // Filter categories to only show those that have a count > 0 to keep UI clean and focused,
                            // or show all possible but highlight/dim? Clean is better.
                            const activeCategories = orderedCategories.filter(cat => ageCounts[cat] > 0);

                            return (
                                <div 
                                    key={breed} 
                                    onClick={() => onSelectBreed?.(breed)}
                                    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm dark:bg-slate-800 dark:border-slate-700/50 space-y-4 cursor-pointer hover:scale-[1.01] hover:border-orange-250 dark:hover:border-orange-500/30 transition-all"
                                >
                                    {/* Breed Name & Total */}
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-700/50">
                                        <h3 className="text-base font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 dark:bg-orange-500" />
                                            {breed}
                                        </h3>
                                        <span className="text-[11px] font-black bg-[#795548]/10 text-[#795548] px-3 py-1 rounded-full dark:bg-orange-500/10 dark:text-orange-400">
                                            العدد الإجمالي: {total} رأس
                                        </span>
                                    </div>

                                    {/* Age Breakdown Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {activeCategories.map((category) => (
                                            <div 
                                                key={category} 
                                                className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center dark:bg-slate-900/60 dark:border-slate-700/30 transition-transform hover:scale-[1.02]"
                                            >
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1">
                                                    {category}
                                                </span>
                                                <span className="text-xl font-black text-[#3E2723] dark:text-orange-200">
                                                    {ageCounts[category]}
                                                </span>
                                                <span className="text-[8px] font-black text-gray-300 dark:text-slate-600 mt-0.5">
                                                    رأس
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 dark:text-slate-500">
                            <AlertCircle size={40} className="mb-3 opacity-40 shrink-0" />
                            <p className="font-bold text-sm">لا يتوفر حلال في الوقت الحالي لحساب إحصائيات الأعمار.</p>
                        </div>
                    )}
                </div>
                
                {/* Footer info/legend */}
                <div className="bg-gray-50 dark:bg-slate-900/30 py-3 px-6 text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800 shrink-0">
                    * يتم احتساب وتصنيف السن تلقائياً.
                </div>
            </div>
        </div>
    );
};
