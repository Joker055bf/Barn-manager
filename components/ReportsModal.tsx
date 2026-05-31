import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Wheat, Wallet, Activity, Skull, TrendingUp, ChevronRight, AlertTriangle, FileText, Banknote, Share2, MessageCircle, BarChart3, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { Pen, Sheep, FeedItem, Expense, SheepType, Sale } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { shareFile } from '../utils/shareUtils';

import { getAnimalAgeLabel } from '../utils/animalHelpers';

export type ReportType = 'overview' | 'financial' | 'sales' | 'feed' | 'health' | 'mortality' | 'production';

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSheep: Sheep[];
    feedItems: FeedItem[];
    expenses: Expense[];
    sales: Sale[];
    pens: Pen[];
    barnName?: string;
    ownerName?: string;
    isOwner?: boolean;
    onShowAlert?: (type: any, title: string, message: string) => void;
    onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
    initialReport?: ReportType;
}

export function ReportsModal({ 
    isOpen, onClose, allSheep, feedItems, expenses, sales, pens, barnName = 'المزرعة', ownerName = '', isOwner = false,
    onShowAlert, onShowConfirm, initialReport = 'overview'
}: ReportsModalProps) {
    const [activeReport, setActiveReport] = useState<ReportType>(initialReport);

    // Reset state when opening
    React.useEffect(() => {
        if (isOpen) {
            setActiveReport(initialReport);
            setHealthFilter(null);
            setIsExpensesExpanded(false);
            setIsSalesExpanded(false);
        }
    }, [isOpen, initialReport]);

    const [healthFilter, setHealthFilter] = useState<'healthy' | 'sick' | null>(null);
    const [selectedMotherForDetails, setSelectedMotherForDetails] = useState<any | null>(null);
    const [isExpensesExpanded, setIsExpensesExpanded] = useState(true); // Default expanded for reports
    const [isSalesExpanded, setIsSalesExpanded] = useState(true); // Default expanded for reports

    // --- Calculations ---

    // Feed
    const lowStockCount = feedItems.filter(item => {
        if (item.quantity <= 0) return true;
        const isVaried = item.consumptionMethod === 'varied';
        const dailyAvg = item.dailyConsumption || 0;
        let daysLeft: number | null = null;
        if (isVaried && item.variedDailyConsumption) {
            const sum = Object.values(item.variedDailyConsumption).reduce((acc, val) => acc + (val || 0), 0);
            const weeklyAvg = sum / 7;
            if (weeklyAvg > 0) daysLeft = Math.floor(item.quantity / weeklyAvg);
        } else if (dailyAvg > 0) {
            daysLeft = Math.floor(item.quantity / dailyAvg);
        }
        return daysLeft !== null && daysLeft <= 15;
    }).length;
    const totalFeedValue = feedItems.reduce((acc, item) => acc + (item.quantity * 0), 0); // Cost not tracked yet

    // Financial (Expenses)
    const expenseRecords = expenses;
    const totalExpenses = expenseRecords.reduce((acc, e) => acc + e.amount, 0);
    const expenseCategories = expenseRecords.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // Financial (Sales)
    const salesRecords = sales;
    const totalSalesValue = salesRecords.reduce((acc, e) => acc + e.amount, 0);

    const categoryTranslations: Record<string, string> = {
        'feed': 'أعلاف',
        'medical': 'علاج وتطعيمات',
        'maintenance': 'صيانة',
        'labor': 'عمالة',
        'other': 'نثريات/أخرى',
        'sales': 'مبيعات',
        'purchase': 'مشتريات'
    };

    // Mortality & Sales
    const mortalityPenIds = pens.filter(p => p.id.includes('mortality')).map(p => p.id);
    // Get all animals in mortality pens
    const allRemovedSheep = allSheep.filter(s => mortalityPenIds.some(id => s.penId.includes(id)) || s.penId.includes('mortality'));

    // Distinguish Sales vs Deaths based on notes/keywords
    const soldSheep = allRemovedSheep.filter(s => s.notes && (s.notes.includes('بيع') || s.notes.includes('تم البيع') || s.notes.includes('مباع')));
    const deceasedSheep = allRemovedSheep.filter(s => !soldSheep.includes(s));

    // We use totalSalesValue calculated above for the amount. 
    // soldSheep.length gives the headcount.

    const mortalityRate = allSheep.length > 0 ? ((deceasedSheep.length / allSheep.length) * 100).toFixed(1) : '0';

    // Production
    const isChild = (birthDateStr?: string) => {
        if (!birthDateStr) return false;
        const birth = new Date(birthDateStr);
        const now = new Date();
        let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (now.getDate() < birth.getDate()) months--;
        return months <= 6;
    };

    const mothers = allSheep.filter(s => s.gender === 'female' && s.type !== SheepType.CHICKEN && s.type !== SheepType.PIGEON && !isChild(s.birthDate)); // Exclude poultry & children
    const totalMothers = mothers.length;
    const children = allSheep.filter(s => s.motherId);
    const productionRate = totalMothers > 0 ? ((children.length / totalMothers) * 100).toFixed(1) : '0';

    const mothersData = useMemo(() => {
        return mothers.map(female => {
            const myChildren = allSheep.filter(s => s.motherId === female.id || s.motherId === female.serialNumber);
            return {
                ...female,
                totalBirths: myChildren.length,
                childrenDetails: myChildren.sort((a, b) => new Date(b.birthDate || 0).getTime() - new Date(a.birthDate || 0).getTime()),
                isProductive: myChildren.length > 0
            };
        }).sort((a, b) => b.totalBirths - a.totalBirths);
    }, [mothers, allSheep]);


    // Health Stats
    const isExcluded = (s: Sheep) => s.penId?.includes('mortality') || s.penId?.includes('sold');
    const activeSheepCtx = allSheep.filter(s => !isExcluded(s));
    const healthyCount = activeSheepCtx.filter(s => s.status === 'healthy' || !s.status).length;
    const sickCount = activeSheepCtx.filter(s => s.status === 'sick').length;

    // --- Actions ---
    const [generationStatus, setGenerationStatus] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Reset status when active report changes
    useEffect(() => {
        setGenerationStatus(null);
    }, [activeReport]);

    const handleShare = async () => {
        setGenerationStatus('جاري التحضير...');
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            if (activeReport === 'overview') {
                if (onShowAlert) onShowAlert('warning', 'تنبيه', 'الرجاء فتح تقرير محدد لمشاركته.');
                setGenerationStatus(null);
                return;
            }

            setGenerationStatus('جاري المعالجة...');

            // Wait for render cycle to update the print view
            await new Promise(resolve => setTimeout(resolve, 500));

            const printElement = document.getElementById('report-print-view');

            if (!printElement) {
                console.error('Print element not found');
                throw new Error('Report element not found');
            }

            // Capture the report element
            const canvas = await html2canvas(printElement, {
                scale: 2, // Reduced scale for stability
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794, // A4 pixel width at 96 DPI (approx)
                onclone: (clonedDoc) => {
                    // Ensure the cloned element is visible
                    const el = clonedDoc.getElementById('report-print-view');
                    if (el) {
                        el.style.display = 'block';
                        el.style.position = 'static';
                        el.style.left = 'auto';
                    }
                }
            } as any);

            const imgData = canvas.toDataURL('image/png');

            // A4 Dimensions: 210mm x 297mm
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const canvasRatio = canvas.width / canvas.height;

            const imgWidth = pageWidth;
            const imgHeight = pageWidth / canvasRatio;

            // Handle multi-page if content is long
            let heightLeft = imgHeight;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) { // Changed from >= 0 to > 0 to avoid extra blank page
                pdf.addPage();
                let position = heightLeft - imgHeight;
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const categoryTranslationsAr: Record<string, string> = {
                'overview': 'نظرة_عامة',
                'financial': 'التقرير_المالي',
                'sales': 'تقرير_المبيعات',
                'feed': 'تقرير_الأعلاف',
                'health': 'التقرير_الصحي',
                'mortality': 'تقرير_النفوق',
                'production': 'تقرير_الإنتاج'
            };

            const arTitle = categoryTranslationsAr[activeReport] || activeReport;
            // Clean barn name for filename
            const cleanBarnName = barnName.replace(/[^ \u0600-\u06FFa-zA-Z0-9]/g, '').trim();
            const fileName = `${cleanBarnName}_${arTitle}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
            const pdfBlob = pdf.output('blob');

            setGenerationStatus('جاري المشاركة...');
            await shareFile(pdfBlob, fileName, activeReport);
            setGenerationStatus(null);

        } catch (error) {
            console.error('Error sharing PDF:', error);
            if (onShowAlert) onShowAlert('error', 'خطأ', 'حدث خطأ أثناء إنشاء التقرير.');
            setGenerationStatus(null);
        }
    };






    if (!isOpen) return null;

    const renderPrintView = () => {
        return (
            <div id="report-print-view" className="bg-white p-8 w-[794px] min-h-[1123px] absolute -left-[9999px] top-0 text-right dir-rtl" style={{ direction: 'rtl' }}>
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">{barnName}</h1>
                    </div>
                    <div className="text-left text-sm text-gray-500">
                        <p>تاريخ التقرير</p>
                        <p className="font-bold text-gray-800 text-lg">{new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="mb-8">
                    {/* General Summary for all reports */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex justify-between">
                        <div>
                            <p className="text-xs text-gray-500">نوع التقرير</p>
                            <p className="font-bold text-xl text-gray-800">
                                {activeReport === 'financial' && 'التقرير المالي'}
                                {activeReport === 'sales' && 'تقرير المبيعات'}
                                {activeReport === 'feed' && 'تقرير الأعلاف والمخزون'}
                                {activeReport === 'health' && 'التقرير الصحي الشامل'}
                                {activeReport === 'mortality' && 'سجل النفوق'}
                                {activeReport === 'production' && 'تقرير الإنتاج'}
                                {activeReport === 'overview' && 'نظرة عامة'}
                            </p>
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500">إجمالي السجلات</p>
                            <p className="font-bold text-xl text-blue-600">
                                {activeReport === 'financial' && expenses.length}
                                {activeReport === 'sales' && salesRecords.length}
                                {activeReport === 'feed' && feedItems.length}
                                {activeReport === 'health' && activeSheepCtx.length}
                                {activeReport === 'mortality' && deceasedSheep.length}
                                {activeReport === 'production' && mothers.length}
                            </p>
                        </div>
                    </div>

                    {/* Tables */}
                    <table className="w-full text-sm border-collapse">
                        {/* Feed Table */}
                        {activeReport === 'feed' && (
                            <>
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-3 border border-gray-800">الصنف</th>
                                        <th className="p-3 border border-gray-800">الاستهلاك اليومي (اليوم)</th>
                                        <th className="p-3 border border-gray-800">الكمية المتبقية</th>
                                        <th className="p-3 border border-gray-800">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedItems.map((item, idx) => {
                                        const dayId = new Date().getDay();
                                        const todayConsumption = item.consumptionMethod === 'varied' && item.variedDailyConsumption
                                            ? (item.variedDailyConsumption[dayId as keyof typeof item.variedDailyConsumption] || 0)
                                            : (item.dailyConsumption || 0);

                                        const dailyAvg = item.dailyConsumption || 0;
                                        let daysLeft: number | null = null;
                                        if (item.consumptionMethod === 'varied' && item.variedDailyConsumption) {
                                            const sum = Object.values(item.variedDailyConsumption).reduce((acc, val) => acc + (val || 0), 0);
                                            const weeklyAvg = sum / 7;
                                            if (weeklyAvg > 0) daysLeft = Math.floor(item.quantity / weeklyAvg);
                                        } else if (dailyAvg > 0) {
                                            daysLeft = Math.floor(item.quantity / dailyAvg);
                                        }

                                        const isLow = item.quantity <= 0;

                                        return (
                                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="p-3 border border-gray-200 font-bold">{item.name}</td>
                                                <td className="p-3 border border-gray-200 font-bold text-amber-700">{todayConsumption} {item.unit}</td>
                                                <td className="p-3 border border-gray-200">{item.quantity} {item.unit}</td>
                                                <td className="p-3 border border-gray-200 text-center font-bold">
                                                    {isLow ? (
                                                        <span className="text-red-600">نافد</span>
                                                    ) : daysLeft !== null && daysLeft <= 15 ? (
                                                        <span className="text-amber-600">⚠️ ينتهي خلال {daysLeft} {daysLeft >= 3 && daysLeft <= 10 ? 'أيام' : 'يوم'}</span>
                                                    ) : (
                                                        <span className="text-green-600">متوفر</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </>
                        )}

                        {/* Financial Table */}
                        {activeReport === 'financial' && (
                            <>
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-3 border border-gray-800">التاريخ</th>
                                        <th className="p-3 border border-gray-800">العنوان</th>
                                        <th className="p-3 border border-gray-800">النوع</th>
                                        <th className="p-3 border border-gray-800">الفئة</th>
                                        <th className="p-3 border border-gray-800">المبلغ</th>
                                        <th className="p-3 border border-gray-800 w-1/3">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="p-3 border border-gray-200 text-gray-600" dir="ltr">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-3 border border-gray-200 font-bold">{item.title}</td>
                                            <td className="p-3 border border-gray-200">مصروف</td>
                                            <td className="p-3 border border-gray-200">{categoryTranslations[item.category] || item.category}</td>
                                            <td className={`p-3 border border-gray-200 font-bold text-red-700`}>
                                                {item.amount.toLocaleString()} ريال
                                            </td>
                                            <td className="p-3 border border-gray-200 text-xs text-gray-500">{item.notes || '-'}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-bold text-lg">
                                        <td colSpan={4} className="p-3 border border-gray-200 text-left pl-6">صافي الرصيد</td>
                                        <td colSpan={2} className="p-3 border border-gray-200 text-blue-800">
                                            {(totalSalesValue - totalExpenses).toLocaleString()} ريال
                                        </td>
                                    </tr>
                                </tbody>
                            </>
                        )}

                        {/* Sales Table */}
                        {activeReport === 'sales' && (
                            <>
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-3 border border-gray-800">التاريخ</th>
                                        <th className="p-3 border border-gray-800">العنوان</th>
                                        <th className="p-3 border border-gray-800">تفاصيل الحيوان (إذا وجد)</th>
                                        <th className="p-3 border border-gray-800">المبلغ</th>
                                        <th className="p-3 border border-gray-800 w-1/4">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => {
                                        // Try to find matching sheep in sold list via notes or loose matching if possible
                                        // Ideally we would have linked IDs, but we use heuristic here or display generic
                                        return (
                                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="p-3 border border-gray-200 text-gray-600" dir="ltr">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                                                <td className="p-3 border border-gray-200 font-bold">{item.title}</td>
                                                <td className="p-3 border border-gray-200 text-xs"> - </td>
                                                <td className="p-3 border border-gray-200 font-bold text-green-700">
                                                    {item.amount.toLocaleString()} ريال
                                                </td>
                                                <td className="p-3 border border-gray-200 text-xs text-gray-500">{item.notes || '-'}</td>
                                            </tr>
                                        )
                                    })}
                                    <tr className="bg-green-50 font-bold text-lg">
                                        <td colSpan={3} className="p-3 border border-gray-200 text-left pl-6">الإجمالي</td>
                                        <td colSpan={2} className="p-3 border border-gray-200 text-green-800">
                                            {totalSalesValue.toLocaleString()} ريال
                                        </td>
                                    </tr>
                                </tbody>
                            </>
                        )}

                        {/* Health Table */}
                        {activeReport === 'health' && (
                            <>
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-3 border border-gray-800">الرقم</th>
                                        <th className="p-3 border border-gray-800">النوع</th>
                                        <th className="p-3 border border-gray-800">العمر</th>
                                        <th className="p-3 border border-gray-800">الحظيرة/القسم</th>
                                        <th className="p-3 border border-gray-800">الحالة</th>
                                        <th className="p-3 border border-gray-800 w-1/3">آخر إجراء طبي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSheepCtx.sort((a, b) => (a.status === 'sick' ? -1 : 1)).map((sheep, idx) => {
                                        const latest = sheep.medicalRecords && sheep.medicalRecords.length > 0
                                            ? [...sheep.medicalRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                                            : null;

                                        return (
                                            <tr key={sheep.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="p-3 border border-gray-200 font-bold">#{sheep.serialNumber}</td>
                                                <td className="p-3 border border-gray-200">{sheep.type}</td>
                                                <td className="p-3 border border-gray-200">{getAnimalAgeLabel(sheep.birthDate)}</td>
                                                <td className="p-3 border border-gray-200 text-xs">
                                                    {pens.find(p => p.id === sheep.penId)?.name || sheep.penId}
                                                </td>
                                                <td className="p-3 border border-gray-200 font-bold">
                                                    {sheep.status === 'sick' ?
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">مريض</span> :
                                                        <span className="text-green-600">سليم</span>
                                                    }
                                                </td>
                                                <td className="p-3 border border-gray-200 text-xs">
                                                    {latest ? (
                                                        <div>
                                                            <span className="font-bold">{latest.name}</span>
                                                            <span className="mx-1 opacity-50">|</span>
                                                            <span>{latest.date ? (latest.date.includes('T') ? latest.date.split('T')[0] : latest.date) : ''}</span>
                                                            {latest.notes && <div className="text-gray-500 mt-1">{latest.notes}</div>}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </>
                        )}

                        {/* Mortality Table */}
                        {activeReport === 'mortality' && (
                            <>
                                <thead className="bg-gray-800 text-white">
                                    <tr>
                                        <th className="p-3 border border-gray-800">الرقم</th>
                                        <th className="p-3 border border-gray-800">النوع</th>
                                        <th className="p-3 border border-gray-800">تاريخ النفوق</th>
                                        <th className="p-3 border border-gray-800">سبب الوفاة</th>
                                        <th className="p-3 border border-gray-800">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deceasedSheep.map((sheep, idx) => (
                                        <tr key={sheep.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="p-3 border border-gray-200 font-bold">#{sheep.serialNumber}</td>
                                            <td className="p-3 border border-gray-200">{sheep.type}</td>
                                            <td className="p-3 border border-gray-200 text-red-600 font-bold">{sheep.exclusionDate ? new Date(sheep.exclusionDate).toLocaleDateString('en-GB') : '-'}</td>
                                            <td className="p-3 border border-gray-200 font-bold">{sheep.notes || '-'}</td>
                                            <td className="p-3 border border-gray-200 text-gray-500 text-xs"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}

                    </table>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                    <div>
                        <p className="font-bold text-gray-800 text-sm mb-1">مالك الحظيرة: {ownerName} _________________</p>
                    </div>
                    <div className="text-left">
                        <p>صفحة 1 من 1</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderOverviewCard = (title: string, value: string | number, subtitle: string, icon: React.ReactNode, colorClass: string, onClick: () => void, delayClass: string) => (
        <button 
            onClick={onClick} 
            className={`bg-white/90 dark:bg-slate-800 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm hover:scale-[1.01] transition-all duration-300 text-right w-full flex items-center justify-between group ${delayClass} dark:border-slate-800 min-h-[72px]`}
        >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass} bg-opacity-10 text-opacity-100 dark:bg-opacity-20 shrink-0`}>
                {React.cloneElement(icon as React.ReactElement, { size: 16 })}
            </div>
            <div className="flex-1 pr-3 min-w-0">
                <h3 className="text-gray-400 text-[8px] font-black uppercase tracking-tight mb-0.5 truncate">{title}</h3>
                <div className="text-sm font-black text-gray-900 dark:text-white tracking-tighter truncate">{value}</div>
                <div className="text-[7.5px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter truncate">{subtitle}</div>
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#795548] group-hover:text-white transition-all dark:bg-slate-900 shrink-0">
                <ChevronRight size={12} />
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-[#FCFBF4] rounded-[1.5rem] sm:rounded-[2.5rem] w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800">

                {/* Header */}
                <div className="bg-[#5D4037] px-4 py-3 sm:px-6 sm:py-5 rounded-t-[1.5rem] sm:rounded-t-[2.5rem] shrink-0 text-white flex items-center justify-between no-print">
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                    >
                        <X size={16} />
                    </button>
                    <h2 className="text-base sm:text-xl font-bold text-white text-center flex-1">
                        {activeReport === 'overview' && 'مركز التقارير'}
                        {activeReport === 'financial' && 'سجل المصروفات'}
                        {activeReport === 'sales' && 'المبيعات'}
                        {activeReport === 'feed' && 'إدارة الأعلاف'}
                        {activeReport === 'health' && 'الحالة الصحية'}
                        {activeReport === 'mortality' && 'سجل النفوق'}
                        {activeReport === 'production' && 'سجل الإنتاج'}
                    </h2>
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white shrink-0">
                        <FileText size={16} />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-[#F4F0EA] custom-scrollbar">

                        {activeReport === 'overview' && (
                            <div className="space-y-8">
                                <div className="flex items-center gap-2 px-1">
                                    <TrendingUp size={16} className="text-[#795548]" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">اختر نوع التقرير للمراجعة</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderOverviewCard(
                                        'الحالة الصحية',
                                        `${healthyCount} سليم`,
                                        `${sickCount} مريض حالياً`,
                                        <Activity size={24} className="text-blue-600" />,
                                        'bg-blue-600',
                                        () => {
                                            setHealthFilter(null);
                                            setActiveReport('health');
                                        },
                                        'animate-fade-in'
                                    )}
                                    {renderOverviewCard(
                                        'المخزون والعلاف',
                                        'إدارة الأعلاف',
                                        `${lowStockCount > 0 ? `⚠️ ${lowStockCount} تنبيهات نقص` : 'المخزون مستقر'}`,
                                        <Wheat size={24} className="text-orange-600" />,
                                        'bg-orange-600',
                                        () => setActiveReport('feed'),
                                        'animate-fade-in delay-75'
                                    )}
                                    {isOwner && renderOverviewCard(
                                        'المصاريف',
                                        `${totalExpenses.toLocaleString()} ريال`,
                                        'إجمالي التدفقات الخارجة',
                                        <Wallet size={24} className="text-teal-600" />,
                                        'bg-teal-600',
                                        () => setActiveReport('financial'),
                                        'animate-fade-in delay-100'
                                    )}
                                    {isOwner && renderOverviewCard(
                                        'المبيعات',
                                        `${totalSalesValue.toLocaleString()} ريال`,
                                        `تم بيع ${soldSheep.length} رأس`,
                                        <Banknote size={24} className="text-green-600" />,
                                        'bg-green-600',
                                        () => setActiveReport('sales'),
                                        'animate-fade-in delay-150'
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Detail Views */}
                        {activeReport !== 'overview' && (
                            <div className="animate-slide-in-left space-y-6">


                                <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm border border-gray-100/50 dark:bg-slate-900 dark:border-slate-800">
                                    {activeReport === 'feed' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">تقرير المخزون</h3>
                                                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 dark:bg-orange-900/20">
                                                        <Wheat size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden rounded-xl border border-gray-50 dark:border-slate-700">
                                                <table className="w-full text-right border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 dark:bg-slate-900">
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">الصنف</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-center">الاستهلاك اليومي (اليوم)</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-center">الكمية المتبقية</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                        {feedItems.map(item => {
                                                            const isGrain = item.category === 'grain';
                                                            const dayId = new Date().getDay();
                                                            const todayConsumption = item.consumptionMethod === 'varied' && item.variedDailyConsumption
                                                                ? (item.variedDailyConsumption[dayId as keyof typeof item.variedDailyConsumption] || 0)
                                                                : (item.dailyConsumption || 0);

                                                            const dailyAvg = item.dailyConsumption || 0;
                                                            let daysLeft: number | null = null;
                                                            if (item.consumptionMethod === 'varied' && item.variedDailyConsumption) {
                                                                const sum = Object.values(item.variedDailyConsumption).reduce((acc, val) => acc + (val || 0), 0);
                                                                const weeklyAvg = sum / 7;
                                                                if (weeklyAvg > 0) daysLeft = Math.floor(item.quantity / weeklyAvg);
                                                            } else if (dailyAvg > 0) {
                                                                daysLeft = Math.floor(item.quantity / dailyAvg);
                                                            }

                                                            const isLow = item.quantity <= 0;

                                                            return (
                                                                <tr key={item.id} className="hover:bg-orange-50/30 transition-colors dark:hover:bg-slate-800">
                                                                    <td className="p-2.5 px-3 font-bold text-gray-900 dark:text-white text-xs">{item.name}</td>
                                                                    <td className="p-2.5 px-3 text-center font-bold text-amber-700 dark:text-amber-400 text-xs">{todayConsumption} {item.unit}</td>
                                                                    <td className="p-2.5 px-3 text-center font-bold text-gray-700 dark:text-gray-300 text-xs">{item.quantity} {item.unit}</td>
                                                                    <td className="p-2.5 px-3 text-center">
                                                                        {isLow ? (
                                                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-tighter border border-red-100 dark:bg-red-900/20 dark:border-red-900/40">نافد</span>
                                                                        ) : daysLeft !== null && daysLeft <= 15 ? (
                                                                            <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-tighter border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40 animate-pulse inline-flex items-center gap-0.5">
                                                                                ⚠️ {daysLeft} {daysLeft >= 3 && daysLeft <= 10 ? 'أيام' : 'يوم'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-tighter border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40">متوفر</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeReport === 'financial' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">سجل المصروفات</h3>
                                                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 dark:bg-teal-900/20">
                                                        <Wallet size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">التوزيع حسب الفئة</h4>
                                                    <div className="space-y-2">
                                                        {Object.entries(expenseCategories).map(([cat, amount]) => (
                                                            <div key={cat} className="flex justify-between items-center group">
                                                                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 group-hover:text-teal-600 transition-colors">{categoryTranslations[cat] || cat}</span>
                                                                <span className="text-xs font-black text-gray-900 dark:text-white">{amount.toLocaleString()} ريال</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-teal-600 p-4 rounded-xl shadow-md flex flex-col justify-center text-white relative overflow-hidden">
                                                    <div className="relative z-10">
                                                        <h4 className="text-[8px] font-black uppercase tracking-widest text-teal-100/60 mb-0.5">إجمالي المصاريف</h4>
                                                        <div className="text-xl font-black tracking-tighter">{totalExpenses.toLocaleString()} <span className="text-[10px] font-bold">ريال</span></div>
                                                    </div>
                                                    <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-gray-50 overflow-hidden dark:border-slate-800">
                                                <table className="w-full text-right border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 dark:bg-slate-900">
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">التاريخ</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">الصنف</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-left">المبلغ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                        {expenseRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                                            <tr key={exp.id} className="hover:bg-teal-50/30 transition-colors dark:hover:bg-slate-800/50">
                                                                <td className="p-2.5 px-3 text-[10px] text-gray-500 font-bold dark:text-gray-500" dir="ltr">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                                                                <td className="p-2.5 px-3 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-tighter">{exp.title}</td>
                                                                <td className="p-2.5 px-3 text-left font-bold text-teal-600 dark:text-teal-400 text-xs">{exp.amount.toLocaleString()} ريال</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeReport === 'sales' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">تقرير المبيعات</h3>
                                                    <div className="w-8 h-8 bg-[#E8F5E9] rounded-lg flex items-center justify-center text-emerald-600 dark:bg-emerald-900/20">
                                                        <Banknote size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-emerald-600 to-green-800 py-3 px-4 rounded-xl shadow-md flex justify-center items-center text-white relative overflow-hidden h-16">
                                                <div className="relative z-10 text-center">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100/60 mb-0.5">صافي المبيعات</p>
                                                    <h2 className="text-xl font-black tracking-tighter">{totalSalesValue.toLocaleString()} <span className="text-[10px]">ريال</span></h2>
                                                </div>
                                                <div className="absolute -right-10 top-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                                            </div>

                                            <div className="rounded-xl border border-gray-50 overflow-hidden dark:border-slate-800">
                                                <table className="w-full text-right border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 dark:bg-slate-900">
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">التاريخ</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">العملية</th>
                                                            <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-left">المبلغ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                        {salesRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                                            <tr key={exp.id} className="hover:bg-emerald-50/30 transition-colors dark:hover:bg-slate-800/50">
                                                                <td className="p-2.5 px-3 text-[10px] text-gray-500 font-bold" dir="ltr">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                                                                <td className="p-2.5 px-3 font-bold text-gray-900 dark:text-white text-xs">{exp.title}</td>
                                                                <td className="p-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400 text-xs">{exp.amount.toLocaleString()} ريال</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeReport === 'mortality' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">سجل النفوق والنافق</h3>
                                                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600 dark:bg-red-900/20">
                                                        <Skull size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-red-50/50 backdrop-blur-md p-3 rounded-xl border border-red-100 flex justify-between items-center dark:bg-red-900/10 dark:border-red-900/20">
                                                <span className="text-xs font-bold text-red-900 dark:text-red-400 uppercase tracking-widest">معدل الخسارة الكلية</span>
                                                <span className="text-xl font-black text-red-600">{deceasedSheep.length} <span className="text-xs">رأس</span></span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {deceasedSheep.map(s => (
                                                    <div key={s.id} className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-red-200 transition-all dark:bg-slate-900 dark:border-slate-800">
                                                        <div>
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">#{s.serialNumber}</span>
                                                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{s.type}</p>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg uppercase tracking-tighter dark:bg-red-900/20">{s.notes || 'غير موثق'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeReport === 'health' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">تقرير السلامة الحيوية</h3>
                                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 dark:bg-blue-900/20">
                                                        <Activity size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100 text-center dark:bg-emerald-900/10 dark:border-emerald-900/20">
                                                    <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1">إجمالي السليم</p>
                                                    <p className="text-xl font-black text-emerald-600">{healthyCount}</p>
                                                </div>
                                                <div className="bg-red-50 rounded-xl p-3.5 border border-red-100 text-center dark:bg-red-900/10 dark:border-red-900/20">
                                                    <p className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase tracking-widest mb-1">الحالات المرضية</p>
                                                    <p className="text-xl font-black text-red-600">{sickCount}</p>
                                                </div>
                                            </div>

                                            {sickCount > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">قائمة المتابعة الطبية الحرجة</h4>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {activeSheepCtx.filter(s => s.status === 'sick').map(sheep => {
                                                            const sortedRecords = [...(sheep.medicalRecords || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                            const latest = sortedRecords[0];
                                                            return (
                                                                <div key={sheep.id} className="bg-white/50 p-3 rounded-xl border border-red-50 shadow-sm flex flex-col gap-2.5 dark:bg-slate-900 dark:border-red-900/10">
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600 dark:bg-red-900/20">
                                                                                <AlertTriangle size={16} />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-black text-gray-900 dark:text-white text-xs tracking-tighter">#{sheep.serialNumber} <span className="text-[9px] font-bold text-gray-400">({sheep.type})</span></h4>
                                                                                <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-0.5">رقابة حرجة</p>
                                                                            </div>
                                                                        </div>
                                                                        {latest && <span className="text-[9px] font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 dark:bg-slate-900 dark:border-slate-800">{latest.date ? (latest.date.includes('T') ? latest.date.split('T')[0] : latest.date) : ''}</span>}
                                                                    </div>
                                                                    {latest && (
                                                                        <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                                                            <div className="flex justify-between mb-1">
                                                                                <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{latest.name}</span>
                                                                                <span className="text-[8px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded dark:bg-teal-900/20">{latest.type === 'treatment' ? 'علاج' : 'فحص'}</span>
                                                                            </div>
                                                                            <p className="text-[10px] font-bold text-gray-500 italic">"{latest.notes || 'لا توجد ملاحظات طبية دقيقة مسجلة.'}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                     {activeReport === 'production' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 dark:border-slate-800">
                                                {isOwner ? (
                                                    <button onClick={handleShare} disabled={!!generationStatus} className="p-2 bg-[#F4F0EA] hover:bg-gray-100 rounded-lg text-gray-500 transition-all flex items-center justify-center dark:bg-slate-800 dark:text-gray-400">
                                                        <Share2 size={16} />
                                                    </button>
                                                ) : <div />}
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[#5D4037] text-sm dark:text-white">سجل الإنتاج والمواليد</h3>
                                                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 dark:bg-purple-900/20">
                                                        <BarChart3 size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-100 text-center dark:bg-purple-900/10 dark:border-purple-900/20">
                                                    <p className="text-[9px] font-black text-purple-800 dark:text-purple-400 uppercase tracking-widest mb-1">إجمالي الأمهات</p>
                                                    <p className="text-xl font-black text-purple-600">{totalMothers}</p>
                                                </div>
                                                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100 text-center dark:bg-blue-900/10 dark:border-blue-900/20">
                                                    <p className="text-[9px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-1">إجمالي الإنتاج</p>
                                                    <p className="text-xl font-black text-blue-600">{children.length}</p>
                                                </div>
                                            </div>

                                            <div className="bg-white/50 p-3 rounded-xl border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">تفاصيل إنتاج الأمهات</h4>
                                                <div className="overflow-hidden rounded-xl border border-gray-50 dark:border-slate-800">
                                                    <table className="w-full text-right border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 dark:bg-slate-900">
                                                                <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">الأم (الرقم)</th>
                                                                <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest">النوع</th>
                                                                <th className="p-2.5 px-3 font-black text-[9px] text-gray-400 uppercase tracking-widest text-center">عدد المواليد</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                            {mothers.map(mother => {
                                                                const motherProduction = children.filter(c => c.motherId === mother.id).length;
                                                                return (
                                                                    <tr key={mother.id} className="hover:bg-purple-50/30 transition-colors">
                                                                        <td className="p-2.5 px-3 font-bold text-gray-900 dark:text-white text-xs">#{mother.serialNumber}</td>
                                                                        <td className="p-2.5 px-3 text-gray-500 font-bold text-[9px]">{mother.type}</td>
                                                                        <td className="p-2.5 px-3 text-center">
                                                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${motherProduction > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                                {motherProduction}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer for Report */}
                                    <div className={`mt-12 pt-8 border-t border-gray-100 text-right opacity-40 dark:border-slate-700 ${generationStatus ? 'block' : 'hidden print-block'}`} style={{ display: generationStatus ? 'block' : undefined }}>
                                        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-2">Official Barn Management Document</p>
                                        <p className="text-[9px] font-bold text-gray-400">Generated securely by Advanced Barn Intelligence System. All data is synchronized and verified across regional nodes.</p>
                                    </div>
                                    <style>{`
                                        @media print {
                                            .print-block { display: block !important; }
                                        }
                                    `}</style>
                                </div>
                            </div>
                        )}

                        {/* Hidden Print View */}
                        {renderPrintView()}

                    </main>
                </div>
            </div>
        </div>
    );
};
