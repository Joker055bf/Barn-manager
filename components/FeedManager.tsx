
import React, { useState } from 'react';
import { Wheat, Save, Package, Trash2, History, AlertTriangle, CalendarDays, ChevronDown, ChevronUp, Droplets, Clock, Layers, Plus, X } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { FeedItem, FeedLogEntry } from '../types';
import { generateId } from '../utils/animalHelpers';

interface FeedManagerProps {
  items: FeedItem[];
  onUpdate: (items: FeedItem[]) => void;
  penId: string;
  animalType?: string;
  onAddExpense?: (expense: any) => void;
  isOwner?: boolean;
  canEdit?: boolean;
  currentUser?: any;
  onShowAlert?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ items, onUpdate, penId, animalType, onAddExpense, isOwner, canEdit, currentUser, onShowAlert, onShowConfirm }) => {
  // Determine if we should restrict to grains only (Chickens, Pigeons)
  const isBirds = animalType === 'chickens' || animalType === 'pigeons';

  // Top Form States
  // If birds, force 'grain'. Else default to 'grain'
  const [category, setCategory] = useState<'grain' | 'fodder'>('grain');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(''); // Input value (Bags for grain, Units for fodder)
  const [newDaily, setNewDaily] = useState(''); // Daily consumption
  const [newPrice, setNewPrice] = useState(''); // Purchase Price
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]); // Purchase Date
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPredefinedName, setSelectedPredefinedName] = useState('');

  const grainOptions = [
    { value: 'شعير', label: 'شعير' },
    { value: 'مكعب', label: 'مكعب' },
    { value: 'ذرة', label: 'ذرة' },
    { value: 'نخالة', label: 'نخالة' },
    { value: 'مشكل', label: 'مشكل' },
    { value: 'other', label: 'أخرى (كتابة يدوية)' }
  ];

  const fodderOptions = [
    { value: 'برسيم', label: 'برسيم' },
    { value: 'تبن', label: 'تبن' },
    { value: 'رودس', label: 'رودس' },
    { value: 'ذرة', label: 'ذرة' },
    { value: 'other', label: 'أخرى (كتابة يدوية)' }
  ];

  // UI States
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'grain' | 'fodder'>('all');

  // Filter items for current pen
  const penItems = penId === 'global' ? items : items.filter(i => i.penId === penId);

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (penId === 'global') {
      if (onShowAlert) onShowAlert('warning', 'تنبيه', 'يرجى دخول حظيرة محددة لإضافة مخزون جديد إليها.');
      return;
    }
    const finalName = selectedPredefinedName === 'other' ? newName : selectedPredefinedName;
    if (!finalName) return;

    // Check if item exists in THIS pen (Update Mode)
    const existingIndex = items.findIndex(i => i.name.trim() === finalName.trim() && i.penId === penId);

    let rawQtyInput = Number(newQty) || 0;
    const dailyRate = Number(newDaily);

    // Logic for Grains: Input is BAGS, Store is KG (1 Bag = 50kg)
    let actualQtyToAdd = rawQtyInput;
    let unitLabel = '';

    if (category === 'grain') {
      actualQtyToAdd = rawQtyInput * 50; // Convert Bags to Kg
      unitLabel = 'كجم';
    } else {
      unitLabel = 'حزمة'; // Default unit for fodder
    }

    if (existingIndex >= 0) {
      const updatedItems = [...items];
      const item = updatedItems[existingIndex];

      // Update quantity (Add to existing)
      if (actualQtyToAdd > 0) {
        item.quantity += actualQtyToAdd;

        // Log the addition
        const logEntry: FeedLogEntry = {
          id: generateId(),
          date: new Date().toISOString(),
          amount: actualQtyToAdd,
          type: 'add',
          addedBy: currentUser?.name || 'غير معروف'
        };
        item.logs = [logEntry, ...(item.logs || [])].slice(0, 50);
      }

      // Update daily consumption if provided
      if (dailyRate > 0) item.dailyConsumption = dailyRate;

      // Update metadata
      item.category = category;
      item.unit = unitLabel;
      item.lastUpdated = new Date().toISOString();

      onUpdate(updatedItems);
    } else {
      // Create new item
      const newItem: FeedItem = {
        id: generateId(),
        penId: penId, // Assign to current pen
        name: finalName,
        category: category,
        unit: unitLabel,
        quantity: actualQtyToAdd,
        dailyConsumption: dailyRate || 0,
        lastUpdated: new Date().toISOString(),
        logs: actualQtyToAdd > 0 ? [{
          id: generateId(),
          date: new Date().toISOString(),
          amount: actualQtyToAdd,
          type: 'add',
          addedBy: currentUser?.name || 'غير معروف'
        }] : []
      };
      onUpdate([...items, newItem]);
    }

    // Create Expense if Price is provided and it's an addition
    if (actualQtyToAdd > 0 && Number(newPrice) > 0 && onAddExpense) {
      const expense = {
        id: generateId(),
        penId: penId,
        date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        title: `شراء مخزون: ${finalName}`,
        amount: Number(newPrice),
        category: 'feed',
        notes: `الكمية: ${rawQtyInput} ${category === 'grain' ? 'كيس' : 'حزمة'} - ${unitLabel}`,
        relatedAnimalId: null
      };
      onAddExpense(expense as any);
    }

    // Reset Form
    setNewName('');
    setSelectedPredefinedName('');
    setIsFormOpen(false);
    setNewQty('');
    setNewDaily('');
    setNewPrice('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = (id: string) => {
    if (!isOwner && !canEdit) return;
    if (onShowConfirm) {
      onShowConfirm('حذف صنف', 'هل أنت متأكد من حذف هذا الصنف من المخزون؟', () => {
        onUpdate(items.filter(i => i.id !== id));
      });
    }
  };

  const toggleHistory = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const filteredAndSortedItems = penItems
    .filter(item => filterType === 'all' || item.category === filterType)
    .sort((a, b) => a.name.localeCompare(b.name)); // Optional: sort alphabetically

  return (
    <div className="space-y-8 animate-fade-in pb-20">

      {/* --- FAB (Floating Add Button) --- */}
      {(isOwner || canEdit) && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-32 left-6 z-40 bg-[#795548] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-[#5D4037] transition active:scale-90"
        >
          <Plus size={28} />
        </button>
      )}

      {/* --- Modal Form --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fcfbf4] w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wheat className="text-orange-600" />
                إضافة / تحديث مخزون
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-6">

                {/* Category Selector - Hidden if Birds */
                  !isBirds && (
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCategory('grain')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'grain' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        <Wheat size={18} /> حبوب
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory('fodder')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'fodder' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        <Layers size={18} /> أعلاف
                      </button>
                    </div>
                  )}

                <CustomSelect
                  label="اسم الصنف"
                  value={selectedPredefinedName}
                  onChange={setSelectedPredefinedName}
                  options={category === 'grain' ? grainOptions : fodderOptions}
                  placeholder="اختر الصنف"
                />

                {selectedPredefinedName === 'other' && (
                  <div className="animate-fade-in">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">اسم الصنف (يدوي)</label>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="اكتب اسم الصنف..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white transition text-gray-900"
                      required
                      autoFocus
                    />
                  </div>
                )}


                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">الكمية ({category === 'grain' ? 'أكياس' : 'حزم'})</label>
                    <input
                      type="number"
                      value={newQty}
                      onChange={e => setNewQty(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">استهلاك يومي</label>
                    <input
                      type="number"
                      value={newDaily}
                      onChange={e => setNewDaily(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">سعر الشراء (ريال)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">تاريخ الشراء</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex items-start gap-2.5 mx-1">
                  <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-orange-700 leading-relaxed font-bold">
                    إشعار: عند إدخال "سعر الشراء"، يتم تلقائياً تسجيل عملية صرف في القسم المالي لهذا الحظيرة.
                  </p>
                </div>

                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl transition shadow-lg shadow-orange-100 flex items-center justify-center gap-2 font-bold whitespace-nowrap h-[50px]">
                  <Save size={20} />
                  <span>حفظ / تحديث</span>
                </button>

                {category === 'grain' && (
                  <p className="text-xs text-gray-400 px-2 flex items-center gap-1 justify-center">
                    <InfoIcon size={12} />
                    سيتم تحويل عدد الأكياس تلقائياً إلى كيلو (الكيس = 50 كجم)
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex p-1 bg-gray-100 rounded-2xl mb-4 relative">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          الكل
        </button>
        <button
          onClick={() => setFilterType('grain')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'grain' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          حبوب
        </button>
        <button
          onClick={() => setFilterType('fodder')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'fodder' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          أعلاف
        </button>
      </div>

      {/* --- شبكة البطاقات --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAndSortedItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Package size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">
              المخزون فارغ من {filterType === 'all' ? 'الأصناف' : filterType === 'grain' ? 'الحبوب' : 'الأعلاف'}
            </p>
            <p className="text-sm">أضف أصناف جديدة من النموذج بالأعلى</p>
          </div>
        )}

        {filteredAndSortedItems.map(item => {
          const daily = item.dailyConsumption || 0;
          const daysLeft = daily > 0 ? Math.floor(item.quantity / daily) : null;
          const isLow = daysLeft !== null && daysLeft < 3;
          const isExpanded = expandedItemId === item.id;
          const isGrain = item.category === 'grain';

          // For display purposes
          const displayQty = item.quantity; // Stored in Kg for grains, Units for fodder
          const displayUnit = item.unit;
          const bagEquivalent = isGrain ? (item.quantity / 50).toFixed(1) : null;

          return (
            <div key={item.id} className={`bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 relative flex flex-col animate-scale-in ${isExpanded ? 'h-auto ring-2 ring-orange-100' : ''}`}>

              {/* Card Header (Clickable) */}
              <div
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                className="p-5 cursor-pointer flex flex-col gap-3 relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${isGrain ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {isGrain ? <Wheat size={20} /> : <Layers size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-medium">{displayQty} {displayUnit}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {isLow ? 'منخفض' : 'متوفر'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 animate-fade-in space-y-4 border-t border-gray-50 pt-4">

                  {/* Delete Button (Moved Inside) */}
                  <div className="flex justify-end">
                    {(isOwner || canEdit) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                        حذف الصنف
                      </button>
                    )}
                  </div>

                  {isGrain && (
                    <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg w-full border border-gray-100 flex justify-between items-center">
                      <span>الرصيد الحالي:</span>
                      <span><strong className="text-gray-900 mx-1">{bagEquivalent}</strong> كيس</span>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-orange-100 p-1 rounded-br-lg">
                        <Clock size={10} className="text-orange-600" />
                      </div>
                      <p className="text-orange-400 text-xs mb-1 font-medium flex items-center gap-1">
                        <Droplets size={12} /> استهلاك تلقائي
                      </p>
                      <p className="font-bold text-gray-800 text-lg">{daily > 0 ? daily : '-'} <span className="text-xs font-normal">{item.unit}</span></p>
                      <p className="text-[9px] text-orange-300 mt-1">يومياً 8:00 ص</p>
                    </div>

                    <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${isLow ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <p className={`text-xs mb-1 font-medium flex items-center gap-1 ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                        <CalendarDays size={12} /> يكفي لمدة
                      </p>
                      <p className={`font-bold text-lg ${isLow ? 'text-red-700' : 'text-emerald-700'}`}>
                        {daysLeft !== null ? daysLeft : '-'} <span className="text-xs font-normal">يوم</span>
                      </p>
                    </div>
                  </div>


                  {/* History Section (Always visible when Expanded) */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                      <History size={12} /> سجل العمليات
                    </p>
                    <div className="bg-gray-50/50 rounded-xl p-0 max-h-40 overflow-y-auto custom-scrollbar">
                      {(item.logs && item.logs.length > 0) ? (
                        <div className="divide-y divide-gray-100">
                          {item.logs.map(log => (
                            <div key={log.id} className="flex justify-between items-center p-2 hover:bg-gray-50 transition">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'add' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                <span className="text-[10px] text-gray-600">
                                  {log.type === 'add' ? 'إضافة' : 'استهلاك'} <span className="font-bold">{log.amount}</span>
                                </span>
                              </div>
                              <span className="text-[9px] text-gray-400">{new Date(log.date).toLocaleDateString('ar-SA')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 text-[10px] py-2">لا يوجد سجل</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div >
    </div >
  );
};

// Helper Icon
const InfoIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);
