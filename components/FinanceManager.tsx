import React, { useState } from 'react';
import { Wallet, Save, Calendar, Tag, Trash2, PlusCircle, ChevronDown, X, TrendingUp, TrendingDown, Target, ShoppingBag, Receipt, Users } from 'lucide-react';
import { Expense, Sale, Sheep, SheepType } from '../types';
import { generateId } from '../utils/animalHelpers';

interface FinanceManagerProps {
    penId: string;
    expenses: Expense[];
    sales: Sale[];
    animals: Sheep[];
    animalType?: string;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onSaveSale: (sale: Sale) => Promise<void>;
    onDeleteExpense: (id: string) => Promise<void>;
    onDeleteSale: (id: string) => Promise<void>;
    onSellAnimal?: (animalId: string, saleData: Partial<Sale>) => Promise<void>;
    isOwner: boolean;
    onShowAlert: (type: any, title: string, message: string) => void;
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const colorNames: { [key: string]: string } = {
    '#EF4444': 'أحمر',
    '#F59E0B': 'برتقالي',
    '#10B981': 'أخضر',
    '#3B82F6': 'أزرق',
    '#6366F1': 'نيلي',
    '#8B5CF6': 'بنفسجي',
    '#EC4899': 'وردي',
    '#FACC15': 'أصفر',
    '#000000': 'أسود',
    '#FFFFFF': 'أبيض'
};

export const FinanceManager: React.FC<FinanceManagerProps> = ({
    penId, expenses, sales, animals, animalType, onSaveExpense, onSaveSale, onDeleteExpense, onDeleteSale, isOwner,
    onShowAlert, onShowConfirm
}) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'sales'>('expenses');
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form States
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<any>('other');
    const [notes, setNotes] = useState('');
    const [relatedAnimalId, setRelatedAnimalId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [buyer, setBuyer] = useState('');

    // Title Composition States
    const [includeType, setIncludeType] = useState(true);
    const [includeColor, setIncludeColor] = useState(true);
    const [includeSerial, setIncludeSerial] = useState(true);

    const currentExpenses = expenses.filter(e => e.penId === penId);
    const currentSales = sales.filter(s => s.penId === penId);

    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = currentSales.reduce((sum, s) => sum + s.amount, 0);
    const profit = totalSales - totalExpenses;

    const [isSaving, setIsSaving] = useState(false);

    const updateTitleFromSelection = (animalId: string, iType: boolean, iColor: boolean, iSerial: boolean) => {
        if (!animalId) return;
        const animal = animals.find(a => a.id === animalId);
        if (animal) {
            const parts = [];
            if (iType) parts.push(animal.type);
            if (iColor) {
                const colorLabel = colorNames[animal.tagColor || ''] || animal.tagColor || '';
                if (colorLabel) parts.push(colorLabel);
            }
            if (iSerial) parts.push(animal.serialNumber);
            
            setTitle(parts.join(' - '));
        }
    };

    const handleAnimalSelect = (animalId: string) => {
        setRelatedAnimalId(animalId);
        if (animalId) {
            updateTitleFromSelection(animalId, includeType, includeColor, includeSerial);
        } else {
            setTitle('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            if (onShowAlert) onShowAlert('warning', 'تنبيه', 'يرجى إدخال العنوان / البيان');
            return;
        }
        if (!amount || Number(amount) <= 0) {
            if (onShowAlert) onShowAlert('warning', 'تنبيه', 'يرجى إدخال مبلغ صحيح');
            return;
        }

        setIsSaving(true);
        try {
            if (activeTab === 'expenses') {
                const expense: Expense = {
                    id: generateId(),
                    penId,
                    title: title.trim(),
                    amount: Number(amount),
                    date,
                    category: category as any,
                    notes: notes || '', // Ensure no undefined
                    relatedAnimalId: relatedAnimalId || null, // Use null for Firestore
                    createdAt: new Date().toISOString()
                };
                
                // Final sanitize to strip any stray undefined if they exist
                const cleanExpense = JSON.parse(JSON.stringify(expense));
                await onSaveExpense(cleanExpense);
            } else {
                const sale: Sale = {
                    id: generateId(),
                    penId,
                    title: title.trim(),
                    amount: Number(amount),
                    date,
                    category: category as any,
                    notes: notes || '', // Ensure no undefined
                    relatedAnimalId: relatedAnimalId || null, // Use null for Firestore
                    quantity: quantity ? Number(quantity) : null, // Use null for Firestore
                    buyer: buyer || '', // Default string
                    createdAt: new Date().toISOString()
                };
                
                const cleanSale = JSON.parse(JSON.stringify(sale));
                await onSaveSale(cleanSale);
            }

            // Success Reset
            setIsFormOpen(false);
            setTitle('');
            setAmount('');
            setNotes('');
            setRelatedAnimalId('');
            setQuantity('');
            setBuyer('');
        } catch (error: any) {
            console.error('Submit Error:', error);
            const msg = 'عذراً، فشل الحفظ: ' + (error.message || 'خطأ غير معروف');
            if (onShowAlert) onShowAlert('error', 'خطأ', msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            {/* Header / Summary (Shrunk) */}
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#795548] p-2 rounded-xl text-white">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">الإدارة المالية</h2>
                            <p className="text-gray-400 text-[10px]">تتبع الأرباح، المبيعات والمصاريف</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-center bg-gray-50/50 dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <div>
                            <span className="text-[9px] font-bold text-red-400 block">المصاريف</span>
                            <span className="text-base font-black text-red-600" dir="ltr">{totalExpenses} <small className="text-[8px]">ريال</small></span>
                        </div>
                        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"></div>
                        <div>
                            <span className="text-[9px] font-bold text-emerald-400 block">المبيعات</span>
                            <span className="text-base font-black text-emerald-600" dir="ltr">{totalSales} <small className="text-[8px]">ريال</small></span>
                        </div>
                        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"></div>
                        <div>
                            <span className="text-[9px] font-bold text-[#795548] block">صافي الربح</span>
                            <span className={`text-lg font-black ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`} dir="ltr">{profit} <small className="text-[8px]">ريال</small></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs & View */}
            <div className="space-y-4">
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                        <TrendingDown size={18} />
                        المصاريف
                    </button>
                    <button 
                        onClick={() => setActiveTab('sales')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === 'sales' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                        <TrendingUp size={18} />
                        المبيعات
                    </button>
                </div>

                {/* List Content */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            {activeTab === 'expenses' ? <Receipt size={18} className="text-red-500" /> : <ShoppingBag size={18} className="text-emerald-500" />}
                            سجل {activeTab === 'expenses' ? 'المصاريف' : 'المبيعات'}
                        </h3>
                        <button 
                            onClick={() => {
                                setCategory(activeTab === 'expenses' ? 'feed' : 'sheep');
                                setIsFormOpen(true);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-[10px] transition ${activeTab === 'expenses' ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}`}
                        >
                            <PlusCircle size={14} />
                            إضافة {activeTab === 'expenses' ? 'مصروف' : 'بيع'}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        {(activeTab === 'expenses' ? currentExpenses : currentSales).length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Wallet size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="text-sm">لا توجد سجلات {activeTab === 'expenses' ? 'مصاريف' : 'مبيعات'} حالياً</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {(activeTab === 'expenses' ? currentExpenses : currentSales).map((item: any) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeTab === 'expenses' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                                                {activeTab === 'expenses' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{item.title}</h4>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar size={10} /> {item.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className={`text-base font-black ${activeTab === 'expenses' ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">{item.amount} <small className="text-[10px] font-normal">ريال</small></span>
                                                {item.buyer && <span className="block text-[9px] text-gray-400">المشتري: {item.buyer}</span>}
                                            </div>
                                            {isOwner && (
                                                <button 
                                                    onClick={() => activeTab === 'expenses' ? onDeleteExpense(item.id) : onDeleteSale(item.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">
                        <div className={`p-8 pb-6 text-white text-center relative ${activeTab === 'expenses' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                            <button onClick={() => setIsFormOpen(false)} className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition shadow-sm">
                                <X size={20} />
                            </button>
                            <div className="flex flex-col items-center gap-2">
                                <div className="bg-white/20 p-3 rounded-2xl mb-1">
                                    {activeTab === 'expenses' ? <Receipt size={28} /> : <ShoppingBag size={28} />}
                                </div>
                                <h3 className="text-2xl font-black">
                                    {activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة مبيعات'}
                                </h3>
                                <p className="text-white/60 text-[10px] font-bold">أدخل بيانات العملية المالية بدقة</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {activeTab === 'sales' && (
                                <div className="space-y-3 animate-fade-in bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block mb-1">رأس محدد (اختياري)</label>
                                        <select 
                                            value={relatedAnimalId}
                                            onChange={e => handleAnimalSelect(e.target.value)}
                                            className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-white dark:bg-slate-800 dark:text-white appearance-none"
                                        >
                                            <option value="">-- اختر من الحظيرة --</option>
                                            {animals.filter(a => !a.penId.includes('mortality')).map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {a.type} | {colorNames[a.tagColor || ''] || a.tagColor || 'بدون لون'} | {a.serialNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">العنوان / البيان</label>
                                <input 
                                    type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder={activeTab === 'expenses' ? "شراء أعلاف، صيانة..." : "بيع أغنام، مبيع إنتاج..."}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">المبلغ (ريال)</label>
                                    <input 
                                        type="number" required value={amount} onChange={e => setAmount(e.target.value)}
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">التاريخ</label>
                                    <input 
                                        type="date" required value={date} onChange={e => setDate(e.target.value)}
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            {activeTab === 'sales' && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1">المشتري (اختياري)</label>
                                    <input 
                                        type="text" value={buyer} onChange={e => setBuyer(e.target.value)}
                                        placeholder="اسم العميل"
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">ملاحظات إضافية</label>
                                <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white h-20 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'expenses' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                            >
                                <Save size={20} />
                                {isSaving ? 'جاري الحفظ...' : 'حفظ العملية'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
