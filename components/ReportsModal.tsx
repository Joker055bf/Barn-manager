import React, { useState, useMemo } from 'react';
import { X, Wheat, Wallet, Activity, Skull, TrendingUp, ChevronRight, AlertTriangle, FileText, Banknote } from 'lucide-react'; // Added icons
import { Pen, Sheep, FeedItem, Expense } from '../types';

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSheep: Sheep[];
    feedItems: FeedItem[];
    expenses: Expense[];
    pens: Pen[];
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, allSheep, feedItems, expenses, pens }) => {
    const [activeReport, setActiveReport] = useState<'overview' | 'feed' | 'financial' | 'sales' | 'mortality' | 'production'>('overview');

    // --- Calculations ---

    // Feed
    const lowStockCount = feedItems.filter(i => i.quantity <= (i.minThreshold || 0)).length;
    const totalFeedValue = feedItems.reduce((acc, item) => acc + (item.quantity * (item.costPerUnit || 0)), 0);

    // Financial (Expenses)
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const expenseCategories = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // Mortality & Sales
    const mortalityPenIds = pens.filter(p => p.id.includes('mortality')).map(p => p.id);
    // Get all animals in mortality pens
    const allRemovedSheep = allSheep.filter(s => mortalityPenIds.some(id => s.penId.includes(id)) || s.penId.includes('mortality'));

    // Distinguish Sales vs Deaths based on notes/keywords
    const soldSheep = allRemovedSheep.filter(s => s.notes && (s.notes.includes('بيع') || s.notes.includes('تم البيع') || s.notes.includes('مباع')));
    const deceasedSheep = allRemovedSheep.filter(s => !soldSheep.includes(s));

    const totalSalesValue = soldSheep.length * 0; // We don't track price per animal yet, maybe add field or just show count?
    // Using a placeholder or strictly count for now. Ideally we'd have a 'price' field.

    const mortalityRate = allSheep.length > 0 ? ((deceasedSheep.length / allSheep.length) * 100).toFixed(1) : '0';

    // Production
    const mothers = allSheep.filter(s => s.gender === 'female' && s.type !== 'chickens' && s.type !== 'pigeons'); // Exclude poultry
    const totalMothers = mothers.length;
    const children = allSheep.filter(s => s.motherId);
    const productionRate = totalMothers > 0 ? ((children.length / totalMothers) * 100).toFixed(1) : '0';


    if (!isOpen) return null;

    const renderOverviewCard = (title: string, value: string | number, subtitle: string, icon: React.ReactNode, colorClass: string, onClick: () => void) => (
        <button onClick={onClick} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition text-right w-full flex items-center justify-between group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass} bg-opacity-10 text-opacity-100`}>
                {icon}
            </div>
            <div className='flex-1 pr-4'>
                <h3 className="text-gray-500 text-xs font-bold mb-1">{title}</h3>
                <div className="text-lg font-black text-gray-800">{value}</div>
                <div className="text-[10px] text-gray-400 mt-1">{subtitle}</div>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#fcfbf4] rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center px-6">
                    <div>
                        <h2 className="text-xl font-black text-[#3E2723] flex items-center gap-2">
                            <FileText className="text-[#795548]" /> التقارير الشاملة
                        </h2>
                        <p className="text-xs text-gray-400 font-bold mt-1">نظرة عامة على أداء المزرعة</p>
                    </div>
                    <button onClick={onClose} className="bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

                        {activeReport === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renderOverviewCard(
                                    'المخزون والعلاف',
                                    `${lowStockCount} تنبيهات`,
                                    `القيمة التقديرة: ${totalFeedValue.toLocaleString()} ريال`,
                                    <Wheat size={24} className="text-orange-600" />,
                                    'bg-orange-600',
                                    () => setActiveReport('feed')
                                )}
                                {renderOverviewCard(
                                    'المصاريف',
                                    `${totalExpenses.toLocaleString()} ريال`,
                                    'إجمالي المصروفات المسجلة',
                                    <Wallet size={24} className="text-teal-600" />,
                                    'bg-teal-600',
                                    () => setActiveReport('financial')
                                )}
                                {renderOverviewCard(
                                    'المبيعات',
                                    `${soldSheep.length} رأس`,
                                    'سجل المبيعات (تقديري)',
                                    <Banknote size={24} className="text-green-600" />,
                                    'bg-green-600',
                                    () => setActiveReport('sales')
                                )}
                                {renderOverviewCard(
                                    'الوفيات',
                                    deceasedSheep.length,
                                    `نسبة الوفيات: ${mortalityRate}%`,
                                    <Skull size={24} className="text-red-600" />,
                                    'bg-red-600',
                                    () => setActiveReport('mortality')
                                )}
                                {renderOverviewCard(
                                    'الإنتاجية',
                                    `${children.length} مواليد`,
                                    `نسبة الإنتاج: ${productionRate}%`,
                                    <TrendingUp size={24} className="text-emerald-600" />,
                                    'bg-emerald-600',
                                    () => setActiveReport('production')
                                )}
                            </div>
                        )}

                        {/* Detail Views */}
                        {activeReport !== 'overview' && (
                            <div className="animate-slide-in-left">
                                <button onClick={() => setActiveReport('overview')} className="mb-4 flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-bold">
                                    <ChevronRight className="rotate-180" size={16} /> عودة للرئيسية
                                </button>

                                {activeReport === 'feed' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-orange-800 border-b border-orange-100 pb-2">تقرير المخزون</h3>
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <table className="w-full text-right text-sm">
                                                <thead className="bg-orange-50 text-orange-800">
                                                    <tr>
                                                        <th className="p-3">الصنف</th>
                                                        <th className="p-3">الكمية الحالية</th>
                                                        <th className="p-3">الحالة</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {feedItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="p-3 font-bold text-gray-700">{item.name}</td>
                                                            <td className="p-3">{item.quantity} {item.unit}</td>
                                                            <td className="p-3">
                                                                {item.quantity <= (item.minThreshold || 0) ? (
                                                                    <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> منخفض</span>
                                                                ) : (
                                                                    <span className="text-emerald-600 font-bold">جيد</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeReport === 'financial' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-teal-800 border-b border-teal-100 pb-2">سجل المصاريف</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white p-6 rounded-xl border border-gray-100">
                                                <h4 className="text-sm font-bold text-gray-500 mb-4">توزيع المصاريف حسب الفئة</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(expenseCategories).map(([cat, amount]) => (
                                                        <div key={cat} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                                                            <span className="text-gray-700 font-medium">{cat}</span>
                                                            <span className="font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg">{amount.toLocaleString()} ريال</span>
                                                        </div>
                                                    ))}
                                                    <div className="border-t-2 border-dashed border-gray-100 pt-3 mt-2 flex justify-between items-center bg-teal-600 text-white p-3 rounded-xl shadow-lg shadow-teal-100">
                                                        <span className="font-bold">الإجمالي الكلي</span>
                                                        <span className="font-black text-lg">{totalExpenses.toLocaleString()} ريال</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeReport === 'sales' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-green-800 border-b border-green-100 pb-2">سجل المبيعات</h3>

                                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-green-800 font-bold">إجمالي عدد الحيوانات المباعة</p>
                                                <p className="text-xs text-green-600">يتم احتسابها من سجلات الاستبعاد (سبب "بيع")</p>
                                            </div>
                                            <div className="text-3xl font-black text-green-700">{soldSheep.length}</div>
                                        </div>

                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            {soldSheep.length > 0 ? (
                                                <table className="w-full text-right text-sm">
                                                    <thead className="bg-green-50 text-green-800">
                                                        <tr>
                                                            <th className="p-3">النوع</th>
                                                            <th className="p-3">العدد (للمجموعات)</th>
                                                            <th className="p-3">الملاحظات / السبب</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {soldSheep.map(sheep => (
                                                            <tr key={sheep.id} className="hover:bg-gray-50">
                                                                <td className="p-3 font-bold text-gray-700">
                                                                    {sheep.serialNumber} - {sheep.type}
                                                                </td>
                                                                <td className="p-3 text-gray-500">
                                                                    1
                                                                </td>
                                                                <td className="p-3 text-gray-600">
                                                                    {sheep.notes}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-gray-400">لا توجد مبيعات مسجلة</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeReport === 'mortality' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-red-800 border-b border-red-100 pb-2">تقرير الوفيات</h3>
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-4 text-sm text-gray-500 flex justify-between items-center bg-red-50">
                                                <span>عدد الحيوانات النافقة:</span>
                                                <span className="font-bold text-red-600 text-xl">{deceasedSheep.length}</span>
                                            </div>
                                            {deceasedSheep.length > 0 && (
                                                <div className="p-4">
                                                    <ul className="space-y-2">
                                                        {deceasedSheep.slice(0, 10).map(s => (
                                                            <li key={s.id} className="text-xs text-gray-600 border-b border-gray-50 pb-1 flex justify-between">
                                                                <span>{s.serialNumber} ({s.type})</span>
                                                                <span className="text-red-400">{s.notes}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {deceasedSheep.length > 10 && <p className="text-xs text-center text-gray-400 mt-2">...و {deceasedSheep.length - 10} آخرين</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeReport === 'production' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-emerald-800 border-b border-emerald-100 pb-2">تقرير الإنتاجية</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center">
                                                <div className="text-2xl font-black text-emerald-600">{totalMothers}</div>
                                                <div className="text-xs text-gray-400 font-bold">عدد الأمهات القادرة</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center">
                                                <div className="text-2xl font-black text-emerald-600">{children.length}</div>
                                                <div className="text-xs text-gray-400 font-bold">إجمالي المواليد المسجلة</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}

                    </main>
                </div>
            </div>
        </div>
    );
};
