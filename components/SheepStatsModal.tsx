import React, { useState, useMemo } from 'react';
import { X, Calendar, Filter, Baby, MapPin } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-[#fcfbf4]">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#795548] p-2 rounded-lg">
                            <Baby className="text-white" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">إحصائيات الغنم</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Filters & Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">

                    {/* Date Filter */}
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Filter size={16} />
                            فلترة حسب تاريخ آخر ولادة
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">من تاريخ</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pen Distribution Summary */}
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            توزيع الأعداد في الحظائر
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {penCounts.map(([name, count]) => (
                                <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-xs font-medium text-gray-600">{name}</span>
                                    <span className="text-sm font-bold text-[#795548]">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-[#795548] text-white text-xs">
                                    <tr>
                                        <th className="p-3">رقم الحيوان</th>
                                        <th className="p-3">النوع</th>
                                        <th className="p-3">اللون</th>
                                        <th className="p-3">الموقع</th>
                                        <th className="p-3 text-center">عدد المواليد</th>
                                        <th className="p-3 text-center">تاريخ آخر ولادة</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                    {filteredData.length > 0 ? (
                                        filteredData.map((animal) => (
                                            <tr key={animal.id} className="hover:bg-amber-50 transition">
                                                <td className="p-3 font-bold text-gray-800">{animal.serialNumber}</td>
                                                <td className="p-3 text-gray-600">{animal.type} ({animal.gender === 'male' ? 'ذكر' : 'أنثى'})</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {animal.tagColor && (
                                                            <div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: animal.tagColor }}></div>
                                                        )}
                                                        <span className="text-gray-600">{animal.tagColor || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-500 text-xs">{getPenName(animal.penId)}</td>
                                                <td className="p-3 text-center font-bold text-blue-600 bg-blue-50 bg-opacity-30">
                                                    {animal.offspringCount}
                                                </td>
                                                <td className="p-3 text-center text-gray-500 dir-ltr">
                                                    {animal.lastBirthDate}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                                لا توجد بيانات تطابق الفلتر
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
    );
};
