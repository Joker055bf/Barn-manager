import React, { useState, useMemo } from 'react';
import { X, Filter, MapPin, TrendingUp, FileText, Search } from 'lucide-react';
import { Sheep, Pen } from '../types';
import { CustomSelect } from './CustomSelect';

interface SheepStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sheep: Sheep[];
    pens: Pen[];
    onSheepClick?: (sheep: Sheep) => void;
}

export const SheepStatsModal: React.FC<SheepStatsModalProps> = ({ isOpen, onClose, sheep, pens, onSheepClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterPen, setFilterPen] = useState('');

    // Helper to find pen name
    const getPenName = (penId: string) => {
        const pen = pens.find(p => p.id === penId);
        return pen ? pen.name : 'غير محدد';
    };

    // Extract unique values for filters
    const uniqueTypes = useMemo(() => Array.from(new Set(sheep.map(s => s.type))).filter(Boolean), [sheep]);
    const uniqueColors = useMemo(() => Array.from(new Set(sheep.map(s => s.color))).filter(Boolean), [sheep]);

    // 1. Calculate Per-Animal Stats (Offspring & Last Birth)
    const animalStats = useMemo(() => {
        const activeSheep = sheep.filter(s => !s.penId?.includes('mortality'));
        return activeSheep.map(animal => {
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
        
        if (searchQuery) {
            data = data.filter(s => s.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (filterType) {
            data = data.filter(s => s.type === filterType);
        }
        if (filterGender) {
            data = data.filter(s => s.gender === filterGender);
        }
        if (filterColor) {
            data = data.filter(s => s.color === filterColor);
        }
        if (filterPen) {
            data = data.filter(s => s.penId === filterPen);
        }
        
        return data;
    }, [animalStats, searchQuery, filterType, filterGender, filterColor, filterPen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="glass-effect rounded-[2.5rem] w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in dark:bg-slate-900/90 dark:border dark:border-slate-800">

                {/* Header */}
                <div className="bg-gradient-to-br from-[#3E2723] to-[#795548] p-8 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
                    <div className="flex justify-between items-center relative z-10">
                            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black tracking-wide">السجل الشامل للحيوانات</h2>
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
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white/30 dark:bg-transparent custom-scrollbar space-y-6">

                    {/* Filters Section */}
                    <div className="bg-white/50 backdrop-blur-md border border-white rounded-[2rem] p-4 shadow-sm dark:bg-slate-800/20 dark:border-slate-800">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="relative col-span-2 md:col-span-1">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="بحث بالرقم..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#795548]/10 focus:border-[#795548] outline-none dark:bg-slate-900 dark:border-slate-700"
                                />
                            </div>
                            <select 
                   


                            >
                                <option value="">النوع (الكل)</option>
                                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select 
                                value={filterGender} 
                                onChange={(e) => setFilterGender(e.target.value)}
                            <CustomSelect
                                label=""
                                value={filterGender}
                                onChange={setFilterGender}
                                placeholder="الجنس (الكل)"
                                options={[
                                    { value: '', label: 'الجنس (الكل)' },
                                    { value: 'male', label: 'ذكر' },
                                    { value: 'female', label: 'أنثى' }
                                ]}
                            />
                            <CustomSelect
                                label=""
                                value={filterColor}
                                onChange={setFilterColor}
                                placeholder="اللون (الكل)"
                                options={[
                                    { value: '', label: 'اللون (الكل)' },
                                    ...uniqueColors.map(c => ({ value: c, label: c }))
                                ]}
                            />
                            <CustomSelect
                                label=""
                                value={filterPen}
                                onChange={setFilterPen}
                                placeholder="القسم (الكل)"
                                options={[
                                    { value: '', label: 'القسم (الكل)' },
                                    ...pens.filter(p => !p.isGroup).map(p => ({ value: p.id, label: p.name }))
                                ]}
                            />
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <FileText size={14} className="text-[#795548]" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">السجل التفصيلي ({filteredData.length})</p>
                            </div>
                                            <th className="p-3 font-black text-[9px] text-gray-400 uppercase tracking-widest whitespace-nowrap">اللون/الوسم</th>
                                            <th className="p-3 font-black text-[9px] text-gray-400 uppercase tracking-widest whitespace-nowrap">الموقع</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs divide-y divide-gray-50 dark:divide-slate-700/50">
                                        {filteredData.length > 0 ? (
                                            filteredData.map((animal) => (
                                                <tr 
                                                    key={animal.id} 
                                                    onClick={() => onSheepClick?.(animal)}






                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800 dark:text-gray-200">{animal.type}</span>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{animal.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            {animal.tagColor && (
                                                                <div className="w-3 h-3 rounded-full border border-gray-100 shadow-sm shrink-0" style={{ backgroundColor: animal.tagColor }}></div>
                                                            )}
                                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[60px]">{animal.color || ''}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="text-[9px] font-black text-[#795548] bg-orange-50 px-2.5 py-1 rounded-lg uppercase tracking-tighter dark:bg-orange-900/20 dark:text-orange-300">
                                                            {getPenName(animal.penId)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 dark:bg-slate-900">
                                                            <Filter size={24} className="text-gray-200" />
                                                        </div>
                                                        <p className="font-black text-gray-300 uppercase tracking-widest text-[10px]">لا توجد سجلات مطابقة</p>
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
