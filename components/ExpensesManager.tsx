
import React, { useState } from 'react';
import { DollarSign, Save, Calendar, Tag, Trash2, PlusCircle, Wallet, Share2, ChevronDown, ChevronUp, X, FileText } from 'lucide-react';
import { Expense, Sheep } from '../types';

interface ExpensesManagerProps {
    penId: string;
    expenses: Expense[];
    animalType?: string;
    animals?: Sheep[];
    onUpdate: (expenses: Expense[]) => void;
    onSellAnimal?: (idOrType: string, reason: string, isBatch?: boolean, quantity?: number, gender?: string) => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({ penId, expenses, animalType, animals = [], onUpdate, onSellAnimal }) => {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [transactionType, setTransactionType] = useState<'expense' | 'sale'>('expense');
    const [notes, setNotes] = useState('');
    const [relatedAnimalId, setRelatedAnimalId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [viewLog, setViewLog] = useState<'expenses' | 'sales' | null>(null);

    // Filter expenses for this pen (All records including sales)
    const penRecords = expenses.filter(e => e.penId === penId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get unique types for dropdown
    const uniqueTypes = Array.from(new Set(animals.map(s => s.type))).filter(Boolean);

    const totalExpenses = penRecords
        .filter(e => e.category !== 'sales')
        .reduce((sum, item) => sum + item.amount, 0);

    const totalSales = penRecords
        .filter(e => e.category === 'sales')
        .reduce((sum, item) => sum + item.amount, 0);

    const netResult = totalSales - totalExpenses;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveTitle = transactionType === 'sale'
            ? (title || (relatedAnimalId && !(animalType === 'chickens' || animalType === 'pigeons')
                ? `بيع حيوان #${relatedAnimalId}`
                : (animalType === 'chickens' || animalType === 'pigeons')
                    ? `بيع ${quantity || ''} ${relatedAnimalId || (animalType === 'chickens' ? 'دجاج' : 'حمام')} ${gender === 'male' ? 'ذكور' : gender === 'female' ? 'إناث' : ''}`.trim()
                    : `بيع ${animalType === 'sheep' ? 'أغنام' : 'مواشي'}`))
            : title;

        if ((transactionType === 'expense' && !title) || !amount) return;

        const newExpense: Expense = {
            id: crypto.randomUUID(),
            penId,
            title: effectiveTitle,
            amount: Number(amount),
            date,
            category: transactionType === 'sale' ? 'sales' : 'other',
            notes,
            relatedAnimalId: relatedAnimalId || undefined,
            quantity: quantity ? Number(quantity) : undefined,
            gender: gender || undefined
        };

        onUpdate([...expenses, newExpense]);

        const safeAnimalType = (animalType || '').toLowerCase();

        // Handle Animal Sale Move
        if (transactionType === 'sale' && onSellAnimal) {
            const saleReason = effectiveTitle ? `تم البيع: ${effectiveTitle}` : 'تم البيع';

            // Poultry Sales (Batch)
            if ((safeAnimalType === 'chickens' || safeAnimalType === 'pigeons') && relatedAnimalId) {
                onSellAnimal(relatedAnimalId, saleReason, true, Number(quantity), gender);
            }
            // Individual Animal Sales
            else if (relatedAnimalId) {
                onSellAnimal(relatedAnimalId, saleReason);
            }
        }

        // Reset form
        setTitle('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setRelatedAnimalId('');
        setQuantity('');
        setGender('');
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            onUpdate(expenses.filter(e => e.id !== id));
        }
    };

    const categoryLabels = {
        feed: { label: 'مصروف', color: 'bg-red-100 text-red-700' },
        medical: { label: 'مصروف', color: 'bg-red-100 text-red-700' },
        maintenance: { label: 'مصروف', color: 'bg-red-100 text-red-700' },
        labor: { label: 'مصروف', color: 'bg-red-100 text-red-700' },
        other: { label: 'مصروف', color: 'bg-red-100 text-red-700' },
        sales: { label: 'مبيعات', color: 'bg-green-100 text-green-700 border border-green-200' }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">

            {/* Header Stat */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                        <Wallet className="text-emerald-600 w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">السجل المالي</h2>
                        <p className="text-gray-500 text-sm">تتبع المصاريف والمبيعات</p>
                    </div>
                </div>

                <div className="flex gap-6 text-center">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">إجمالي المصاريف</p>
                        <p className="text-lg font-bold text-red-600" dir="ltr">
                            {totalExpenses.toLocaleString()} <span className="text-xs text-gray-400">SAR</span>
                        </p>
                    </div>
                    <div className="w-px bg-gray-200"></div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">إجمالي المبيعات</p>
                        <p className="text-lg font-bold text-green-600" dir="ltr">
                            {totalSales.toLocaleString()} <span className="text-xs text-gray-400">SAR</span>
                        </p>
                    </div>
                    <div className="w-px bg-gray-200"></div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">الصافي</p>
                        <p className={`text-xl font-black ${netResult >= 0 ? 'text-green-700' : 'text-red-700'}`} dir="ltr">
                            {netResult.toLocaleString()} <span className="text-xs text-gray-400">SAR</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">


                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع العملية</label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setTransactionType('expense')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${transactionType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            شراء
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTransactionType('sale')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${transactionType === 'sale' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            بيع
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    {transactionType === 'expense' ? (
                                        <>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المصروف</label>
                                            <input
                                                type="text"
                                                required
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                placeholder="مثال: شراء شعير، إصلاح سياج..."
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* For Sales: Show Animal ID Dropdown here if NOT poultry */}
                                            {!(animalType === 'chickens' || animalType === 'pigeons') ? (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        رقم الحيوان <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        required
                                                        value={relatedAnimalId}
                                                        onChange={e => setRelatedAnimalId(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                                                    >
                                                        <option value="">اختر رقم الحيوان...</option>
                                                        {animals.length > 0 ? (
                                                            animals.map(animal => (
                                                                <option key={animal.id} value={animal.serialNumber}>
                                                                    #{animal.serialNumber} - {animal.type}
                                                                </option>
                                                            ))
                                                        ) : (
                                                            <option value="" disabled>لا توجد حيوانات</option>
                                                        )}
                                                    </select>
                                                </div>
                                            ) : (
                                                // For Poultry Sales: Show Count, Type, Gender in Header
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                                                        <select
                                                            required
                                                            value={relatedAnimalId}
                                                            onChange={e => setRelatedAnimalId(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                                                        >
                                                            <option value="">نوع...</option>
                                                            {uniqueTypes.map(type => (
                                                                <option key={type} value={type}>{type}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {relatedAnimalId && (
                                                        <>
                                                            <div className="flex-1">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                                                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGender('male')}
                                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${gender === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                                                    >
                                                                        ذ
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGender('female')}
                                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${gender === 'female' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                                                    >
                                                                        أ
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    العدد
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={animals.filter(a => (!relatedAnimalId || a.type === relatedAnimalId) && (!gender || a.gender === gender)).length}
                                                                    value={quantity}
                                                                    onChange={e => {
                                                                        const val = Number(e.target.value);
                                                                        const max = animals.filter(a => (!relatedAnimalId || a.type === relatedAnimalId) && (!gender || a.gender === gender)).length;
                                                                        if (val <= max) setQuantity(e.target.value);
                                                                    }}
                                                                    placeholder={animals.filter(a => (!relatedAnimalId || a.type === relatedAnimalId) && (!gender || a.gender === gender)).length.toString()}
                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm placeholder-gray-400"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ريال)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {transactionType === 'sale' && (
                                <div className="animate-fade-in">
                                    {(animalType === 'chickens' || animalType === 'pigeons') && (
                                        // Poultry Fields Moved to Header
                                        null
                                    )}
                                    {!(animalType === 'chickens' || animalType === 'pigeons') && (
                                        // Animal Dropdown moved to Header for Sales. 
                                        // Only render here if NOT Sale? But logic uses Sale context.
                                        // So we remove it from here entirely as it is now in header.
                                        null
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                <Save size={18} /> حفظ
                            </button>
                        </form>
                    </div>
                </div>

                {/* View Logs Buttons */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setViewLog('expenses')}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition group h-full"
                        >
                            <div className="bg-red-100 p-4 rounded-full text-red-600 group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg">سجل المصاريف</h3>
                            <p className="text-sm text-gray-400">{penRecords.filter(e => e.category !== 'sales').length} عملية مسجلة</p>
                        </button>

                        <button
                            onClick={() => setViewLog('sales')}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition group h-full"
                        >
                            <div className="bg-green-100 p-4 rounded-full text-green-600 group-hover:scale-110 transition-transform">
                                <Wallet size={32} />
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg">سجل المبيعات</h3>
                            <p className="text-sm text-gray-400">{penRecords.filter(e => e.category === 'sales').length} عملية مسجلة</p>
                        </button>
                    </div>
                </div>

                {/* Log Modal */}
                {viewLog && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {viewLog === 'expenses' ? 'سجل المصاريف' : 'سجل المبيعات'}
                                </h3>
                                <button
                                    onClick={() => setViewLog(null)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {penRecords.filter(e => viewLog === 'sales' ? e.category === 'sales' : e.category !== 'sales').length > 0 ? (
                                    <div className="divide-y divide-gray-50 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                        {penRecords
                                            .filter(e => viewLog === 'sales' ? e.category === 'sales' : e.category !== 'sales')
                                            .map(expense => (
                                                <ExpenseItem
                                                    key={expense.id}
                                                    expense={expense}
                                                    categoryLabels={categoryLabels}
                                                    animalType={animalType}
                                                    onDelete={handleDelete}
                                                />
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <div className="bg-gray-50 p-6 rounded-full mb-4">
                                            {viewLog === 'expenses' ? <FileText size={40} /> : <Wallet size={40} />}
                                        </div>
                                        <p>لا توجد سجلات {viewLog === 'expenses' ? 'مصاريف' : 'مبيعات'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

interface ExpenseItemProps {
    expense: Expense;
    categoryLabels: any;
    animalType?: string;
    onDelete: (id: string) => void;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, categoryLabels, animalType, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `
سجل مالي - مدير الحظائر
------------------
العملية: ${expense.title}
القيمة: ${expense.amount} ريال
التاريخ: ${expense.date}
النوع: ${categoryLabels[expense.category].label}
${expense.relatedAnimalId ? `رقم الحيوان: ${expense.relatedAnimalId}` : ''}
${expense.quantity ? `العدد: ${expense.quantity}` : ''}
${expense.notes ? `ملاحظات: ${expense.notes}` : ''}
        `.trim();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'سجل مالي',
                    text: text,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback
            alert('تم نسخ النص:\n' + text);
            navigator.clipboard.writeText(text);
        }
    };

    return (
        <div className="bg-white hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="p-4 flex items-center justify-between cursor-pointer group select-none"
            >
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 transition-transform ${isOpen ? 'scale-110' : ''} ${categoryLabels[expense.category].color}`}>
                        {isOpen ? (expense.category === 'sales' ? <Wallet size={18} /> : <DollarSign size={18} />) : <DollarSign size={18} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 text-base">{expense.title}</h4>
                            {isOpen && <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryLabels[expense.category].color}`}>{categoryLabels[expense.category].label}</span>}
                        </div>

                        {!isOpen && (
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {expense.date ? (expense.date.includes('T') ? expense.date.split('T')[0] : expense.date) : ''}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] ${categoryLabels[expense.category].color}`}>{categoryLabels[expense.category].label}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className={`font-bold text-lg ${expense.category === 'sales' ? 'text-green-600' : 'text-gray-900'}`} dir="ltr">
                        {expense.amount.toLocaleString()} <span className="text-xs text-gray-400">SAR</span>
                    </span>
                    <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-gray-300`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isOpen && (
                <div className="px-4 pb-4 animate-fade-in bg-gray-50/50">
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Info Block */}
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-16 text-xs">التاريخ:</span>
                                <span className="font-medium">
                                    {expense.date ? (expense.date.includes('T') ? expense.date.split('T')[0] : expense.date) : ''}
                                </span>
                            </div>

                            {expense.category === 'sales' && (
                                <div className="space-y-2">
                                    {(animalType === 'chickens' || animalType === 'pigeons') ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 text-xs">النوع:</span>
                                                <span className="font-medium">{expense.relatedAnimalId || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 text-xs">الجنس:</span>
                                                <span className="font-medium">{expense.gender === 'male' ? 'ذكر' : expense.gender === 'female' ? 'أنثى' : '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 w-16 text-xs">العدد:</span>
                                                <span className="font-medium">{expense.quantity || '-'}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 w-16 text-xs">رقم الحيوان:</span>
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 rounded">#{expense.relatedAnimalId}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {expense.notes && (
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-400 w-16 text-xs mt-1">ملاحظات:</span>
                                    <p className="flex-1 bg-white p-2 rounded border border-gray-100 text-xs leading-relaxed">{expense.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Actions Block */}
                        <div className="flex items-end justify-end gap-2 mt-2 md:mt-0">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition text-sm font-bold"
                            >
                                <Share2 size={16} /> مشاركة السجل
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-bold"
                            >
                                <Trash2 size={16} /> حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
