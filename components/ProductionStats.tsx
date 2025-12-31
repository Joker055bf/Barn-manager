import React, { useMemo, useState } from 'react';
import { X, Activity, ChevronLeft, Search, ArrowRight, ChevronDown } from 'lucide-react';
import { Sheep, Pen } from '../types';

interface ProductionStatsProps {
    isOpen: boolean;
    onClose: () => void;
    allSheep: Sheep[];
    pens: Pen[];
}

// Age Class Helper
const getAgeClass = (birthDateStr?: string) => {
    if (!birthDateStr) return 'غير معروف';
    const birth = new Date(birthDateStr);
    const now = new Date();
    // Calculate months difference
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;

    if (months <= 6) return 'طفل';
    if (months <= 12) return 'جذع';
    if (months <= 24) return 'ثني';
    if (months <= 36) return 'رباع';
    if (months <= 48) return 'سداس';
    return 'تام';
};

// Check if child (<= 6 months) - Used to filter mothers
const isChild = (birthDateStr?: string) => {
    if (!birthDateStr) return false;
    const birth = new Date(birthDateStr);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;
    return months <= 6;
};

// Precise Age Helper
const calculateExactAge = (birthDateStr?: string) => {
    if (!birthDateStr) return '-';
    const birth = new Date(birthDateStr);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
        months--;
        days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} سنة`);
    if (months > 0) parts.push(`${months} شهر`);
    if (days > 0) parts.push(`${days} يوم`);

    return parts.length > 0 ? parts.join(' و ') : 'اليوم';
};


// Helper Component for Collapsible Section (Compact Layout)
const StatSection = ({ title, total, theme, children }: { title: string, total: number, theme: 'blue' | 'pink', children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false); // Default collapsed

    const styles = theme === 'blue' ? {
        container: `border-blue-100 ${isOpen ? 'bg-blue-50/50' : 'bg-white'}`,
        text: 'text-blue-800',
        badge: 'bg-blue-100 text-blue-700'
    } : {
        container: `border-pink-100 ${isOpen ? 'bg-pink-50/50' : 'bg-white'}`,
        text: 'text-pink-800',
        badge: 'bg-pink-100 text-pink-700'
    };

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${styles.container}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 hover:bg-opacity-80 transition"
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown size={18} className={styles.text} />
                    </div>
                    <h4 className={`font-bold text-sm ${styles.text}`}>{title} <span className="opacity-70 text-xs font-normal">({total})</span></h4>
                </div>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
};


export const ProductionStats: React.FC<ProductionStatsProps> = ({ isOpen, onClose, allSheep, pens }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedMotherForDetails, setSelectedMotherForDetails] = useState<any | null>(null);
    const [selectedAgeClassBreakdown, setSelectedAgeClassBreakdown] = useState<{ gender: 'male' | 'female', ageClass: string, animals: Sheep[] } | null>(null);
    const [isMothersOpen, setIsMothersOpen] = useState(false);

    // 1. Calculate General Stats (Counts by Type)
    const statsByType = useMemo(() => {
        const stats: Record<string, number> = {};
        allSheep.forEach(sheep => {
            stats[sheep.type] = (stats[sheep.type] || 0) + 1;
        });
        return stats;
    }, [allSheep]);

    // 2. Filter data for Selected Type
    const selectedTypeSheep = useMemo(() => {
        if (!selectedType) return [];
        return allSheep.filter(s => s.type === selectedType);
    }, [allSheep, selectedType]);

    // 3. Detailed Breakdown Logic (for Selected Type)
    const detailedStats = useMemo(() => {
        if (!selectedType) return null;

        const males = selectedTypeSheep.filter(s => s.gender === 'male');
        const females = selectedTypeSheep.filter(s => s.gender === 'female');

        const classify = (list: Sheep[]) => {
            const counts: Record<string, number> = {
                'طفل': 0, 'جذع': 0, 'ثني': 0, 'رباع': 0, 'سداس': 0, 'تام': 0, 'غير معروف': 0
            };
            const animalsByClass: Record<string, Sheep[]> = {
                'طفل': [], 'جذع': [], 'ثني': [], 'رباع': [], 'سداس': [], 'تام': [], 'غير معروف': []
            };

            list.forEach(s => {
                const cls = getAgeClass(s.birthDate);
                counts[cls] = (counts[cls] || 0) + 1;
                if (!animalsByClass[cls]) animalsByClass[cls] = [];
                animalsByClass[cls].push(s);
            });
            return { counts, animalsByClass };
        };

        return {
            male: {
                total: males.length,
                data: classify(males)
            },
            female: {
                total: females.length,
                data: classify(females)
            }
        };
    }, [selectedTypeSheep, selectedType]);


    // 4. Calculate Mothers Production Logic (for Selected Type)
    const mothersData = useMemo(() => {
        if (!selectedType) return [];

        // Filter potential mothers: Females AND NOT Children (Adults of selected type)
        const females = selectedTypeSheep.filter(s => s.gender === 'female' && !isChild(s.birthDate));

        const data = females.map(female => {
            // Find all children of this female
            const children = allSheep.filter(s => s.motherId === female.id || s.motherId === female.serialNumber); // Scoped to barn via props

            // Collect birth dates from children's DOB
            const birthDates = children
                .map(c => c.birthDate)
                .filter(d => d) // remove empty dates
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Descending

            return {
                ...female,
                totalBirths: children.length,
                birthDates: birthDates,
                childrenDetails: children.sort((a, b) => new Date(b.birthDate || 0).getTime() - new Date(a.birthDate || 0).getTime()),
                isProductive: children.length > 0
            };
        });

        // Sort: Productive first, then by max births
        return data.sort((a, b) => b.totalBirths - a.totalBirths);
    }, [selectedTypeSheep, selectedType, allSheep]);

    const filteredMothers = mothersData.filter(m =>
        m.serialNumber.includes(searchTerm) ||
        (m.nickname && m.nickname.includes(searchTerm))
    );

    const productiveCount = mothersData.filter(m => m.isProductive).length;
    // const nonProductiveCount = mothersData.length - productiveCount; // Unused for now

    // Helper to get pen name
    const getPenName = (penId: string) => {
        const pen = pens.find(p => p.id === penId);
        return pen ? pen.name : 'غير محدد';
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

                {/* Header - Compact */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-[#fcfbf4] flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="text-emerald-600" size={20} />
                            سجل الإنتاج والإحصائيات
                        </h2>
                        {selectedType && !selectedMotherForDetails && !selectedAgeClassBreakdown && (
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                تفاصيل: {selectedType}
                            </p>
                        )}
                        {selectedMotherForDetails && (
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                سجل ولادات الأم: {selectedMotherForDetails.serialNumber}
                            </p>
                        )}
                        {selectedAgeClassBreakdown && (
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                {selectedType} - {selectedAgeClassBreakdown.gender === 'male' ? 'ذكور' : 'إناث'} ({selectedAgeClassBreakdown.ageClass})
                            </p>
                        )}
                    </div>
                    <button onClick={() => { setSelectedType(null); setSelectedMotherForDetails(null); setSelectedAgeClassBreakdown(null); onClose(); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar relative bg-[#fcfbf4]/30">

                    {/* VIEW 1: Overview - Type Selection */}
                    {!selectedType && (
                        <div className="animate-fade-in">
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                                اختر النوع للعرض
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(statsByType).map(([type, count]) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-200 hover:bg-[#5D4037]/20 transition flex flex-col items-center justify-center group h-32"
                                    >
                                        <span className="text-gray-600 font-bold text-base mb-1 group-hover:text-emerald-700">{type}</span>
                                        <div className="text-2xl font-black text-gray-800 tracking-tight">{count}</div>
                                        <span className="text-[10px] text-gray-400 mt-1">رأس</span>
                                    </button>
                                ))}
                                {Object.keys(statsByType).length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400 text-sm">
                                        لا توجد بيانات
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: Detailed Stats for Selected Type */}
                    {selectedType && !selectedMotherForDetails && !selectedAgeClassBreakdown && detailedStats && (
                        <div className="animate-slide-in-right space-y-5">
                            <button onClick={() => setSelectedType(null)} className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 transition mb-1 text-xs font-bold">
                                <ArrowRight size={14} /> العودة للقائمة
                            </button>

                            {/* Detailed Breakdown Grid - Compact */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Males Stats */}
                                <StatSection title="الذكور" total={detailedStats.male.total} theme="blue">
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(detailedStats.male.data.counts).map(([cls, count]: [string, number]) => (
                                            <button
                                                key={cls}
                                                onClick={() => {
                                                    if (count > 0) {
                                                        setSelectedAgeClassBreakdown({
                                                            gender: 'male',
                                                            ageClass: cls,
                                                            animals: detailedStats.male.data.animalsByClass[cls]
                                                        });
                                                    }
                                                }}
                                                disabled={count === 0}
                                                className={`p-1.5 rounded-lg text-center shadow-sm border transition ${count > 0 ? 'bg-white border-blue-50 hover:bg-blue-50 cursor-pointer' : 'bg-gray-50 border-gray-100 cursor-default opacity-60'}`}
                                            >
                                                <span className="block text-[9px] text-gray-400 mb-0.5">{cls}</span>
                                                <span className="block font-bold text-blue-900 text-sm">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </StatSection>

                                {/* Females Stats */}
                                <StatSection title="الإناث" total={detailedStats.female.total} theme="pink">
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(detailedStats.female.data.counts).map(([cls, count]: [string, number]) => (
                                            <button
                                                key={cls}
                                                onClick={() => {
                                                    if (count > 0) {
                                                        setSelectedAgeClassBreakdown({
                                                            gender: 'female',
                                                            ageClass: cls,
                                                            animals: detailedStats.female.data.animalsByClass[cls]
                                                        });
                                                    }
                                                }}
                                                disabled={count === 0}
                                                className={`p-1.5 rounded-lg text-center shadow-sm border transition ${count > 0 ? 'bg-white border-pink-50 hover:bg-pink-50 cursor-pointer' : 'bg-gray-50 border-gray-100 cursor-default opacity-60'}`}
                                            >
                                                <span className="block text-[9px] text-gray-400 mb-0.5">{cls}</span>
                                                <span className="block font-bold text-pink-900 text-sm">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </StatSection>
                            </div>

                            {/* Mothers Production Record - Collapsible */}
                            <div className={`rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-2 transition-all ${isMothersOpen ? 'bg-white' : 'bg-white'}`}>
                                <button
                                    onClick={() => setIsMothersOpen(!isMothersOpen)}
                                    className="w-full p-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-[#fcfbf4]/50 hover:bg-[#fcfbf4] transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1 rounded-full transition-transform duration-300 ${isMothersOpen ? 'rotate-0' : '-rotate-90'}`}>
                                            <ChevronDown size={18} className="text-gray-500" />
                                        </div>
                                        <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-700 text-right">إنتاج الأمهات</h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
                                            <span className="text-sm font-black leading-none">{productiveCount}</span>
                                            <span className="text-[7px] font-bold leading-none mt-0.5">منتجة</span>
                                        </div>
                                    </div>
                                </button>

                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMothersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-3">
                                        <div className="relative w-full mb-3">
                                            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                            <input
                                                type="text"
                                                placeholder="بحث..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="w-full pr-7 pl-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 transition"
                                            />
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto">
                                            <table className="w-full text-right">
                                                <thead className="bg-[#fcfbf4] text-gray-400 text-[10px] font-medium sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-3 py-2 font-normal">الأم</th>
                                                        <th className="px-2 py-2 font-normal">العمر</th>
                                                        <th className="px-2 py-2 text-center font-normal">ولادات</th>
                                                        <th className="px-2 py-2 text-center font-normal">الحالة</th>
                                                        <th className="px-3 py-2 font-normal">سجل الولادات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 text-xs">
                                                    {filteredMothers.map((mother) => (
                                                        <tr key={mother.id} className="hover:bg-[#fcfbf4] transition-colors group">
                                                            <td className="px-3 py-2 font-bold text-gray-700">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className={`w-3 h-3 rounded-full border shrink-0 ${mother.tagColor ? 'border-gray-200' : 'border-dashed border-gray-300'}`}
                                                                        style={{ backgroundColor: mother.tagColor || 'transparent' }}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{mother.serialNumber}</span>
                                                                        {mother.nickname && <span className="text-[9px] text-gray-400 font-normal">{mother.nickname}</span>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-2 text-gray-500 text-[10px]">
                                                                {getAgeClass(mother.birthDate)}
                                                            </td>
                                                            <td className="px-2 py-2 text-center">
                                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${mother.totalBirths > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                    {mother.totalBirths}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-2 text-center align-middle">
                                                                {mother.isProductive ? (
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" title="منتجة"></div>
                                                                ) : (
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 mx-auto" title="غير منتجة"></div>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[150px]">
                                                                    {mother.birthDates.length > 0 ? (
                                                                        <button
                                                                            onClick={() => setSelectedMotherForDetails(mother)}
                                                                            className="flex-shrink-0 text-[9px] bg-blue-50 text-[#795548] px-2 py-1 rounded border border-blue-100 whitespace-nowrap hover:bg-[#5D4037] transition"
                                                                        >
                                                                            عرض السجل ({mother.birthDates.length})
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-300 text-[9px]">-</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredMothers.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-300 text-xs">
                                                                لا نتائج
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
                    )}

                    {/* VIEW 3: Detailed Age Class Breakdown (New) */}
                    {selectedAgeClassBreakdown && (
                        <div className="animate-slide-in-right space-y-5">
                            <button onClick={() => setSelectedAgeClassBreakdown(null)} className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 transition mb-1 text-xs font-bold">
                                <ArrowRight size={14} /> العودة للإحصائيات
                            </button>

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-[#fcfbf4]/50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        {selectedAgeClassBreakdown.gender === 'male' ? 'ذكور' : 'إناث'} - {selectedAgeClassBreakdown.ageClass}
                                    </h3>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">{selectedAgeClassBreakdown.animals.length} رأس</span>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-right">
                                        <thead className="bg-[#fcfbf4] text-gray-400 text-[10px] font-medium sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-normal">الرقم</th>
                                                <th className="px-4 py-3 font-normal">اللون</th>
                                                <th className="px-4 py-3 font-normal">العمر</th>
                                                <th className="px-4 py-3 font-normal">المكان</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-xs">
                                            {selectedAgeClassBreakdown.animals.map((s) => (
                                                <tr key={s.id} className="hover:bg-[#fcfbf4] transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-800">{s.serialNumber}</td>
                                                    <td className="px-4 py-3">
                                                        {s.tagColor ? (
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: s.tagColor }}></div>
                                                                {/* <span className="text-gray-500 text-[10px]">{s.tagColor}</span> */}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 font-medium text-[11px]">{calculateExactAge(s.birthDate)}</td>
                                                    <td className="px-4 py-3 text-gray-600 font-medium">{getPenName(s.penId)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* VIEW 4: Detailed Birth Record for Selected Mother */}
                    {selectedMotherForDetails && (
                        <div className="animate-slide-in-right space-y-5">
                            <button onClick={() => setSelectedMotherForDetails(null)} className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 transition mb-1 text-xs font-bold">
                                <ArrowRight size={14} /> العودة لسجل الأمهات
                            </button>

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-[#fcfbf4]/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-lg">
                                                أ
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg">{selectedMotherForDetails.serialNumber}</h3>
                                                <p className="text-xs text-gray-500">{getAgeClass(selectedMotherForDetails.birthDate)}</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-2xl font-black text-emerald-600">{selectedMotherForDetails.totalBirths}</span>
                                            <span className="text-[10px] text-gray-400">عدد المواليد</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-right">
                                        <thead className="bg-[#fcfbf4] text-gray-400 text-[10px] font-medium sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-normal">رقم الطفل</th>
                                                <th className="px-4 py-3 font-normal">الجنس</th>
                                                <th className="px-4 py-3 font-normal">العمر</th>
                                                <th className="px-4 py-3 font-normal">تاريخ الميلاد</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-xs">
                                            {selectedMotherForDetails.childrenDetails.map((child: Sheep) => (
                                                <tr key={child.id} className="hover:bg-[#fcfbf4] transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-700">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`w-3 h-3 rounded-full border shrink-0 ${child.tagColor ? 'border-gray-200' : 'border-dashed border-gray-300'}`}
                                                                style={{ backgroundColor: child.tagColor || 'transparent' }}
                                                            />
                                                            <span>{child.serialNumber}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] ${child.gender === 'male' ? 'bg-blue-50 text-[#795548]' : 'bg-pink-50 text-pink-600'}`}>
                                                            {child.gender === 'male' ? 'ذكر' : 'أنثى'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {getAgeClass(child.birthDate)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500" dir="ltr">
                                                        {child.birthDate ? new Date(child.birthDate).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
