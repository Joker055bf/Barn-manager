
import React, { useState } from 'react';
import { Wheat, Save, Package, Trash2, History, AlertTriangle, CalendarDays, ChevronDown, ChevronUp, Droplets, Clock, Layers } from 'lucide-react';
import { FeedItem, FeedLogEntry } from '../types';

interface FeedManagerProps {
  items: FeedItem[];
  onUpdate: (items: FeedItem[]) => void;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ items, onUpdate }) => {
  // Top Form States
  const [category, setCategory] = useState<'grain' | 'fodder'>('grain');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(''); // Input value (Bags for grain, Units for fodder)
  const [newDaily, setNewDaily] = useState(''); // Daily consumption
  
  // UI States
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    // Check if item exists (Update Mode)
    const existingIndex = items.findIndex(i => i.name.trim() === newName.trim());
    
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
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount: actualQtyToAdd,
          type: 'add'
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
      alert(`تم تحديث مخزون "${item.name}" بنجاح.`);
    } else {
      // Create new item
      const newItem: FeedItem = {
        id: crypto.randomUUID(),
        name: newName,
        category: category,
        unit: unitLabel,
        quantity: actualQtyToAdd,
        dailyConsumption: dailyRate || 0,
        lastUpdated: new Date().toISOString(),
        logs: actualQtyToAdd > 0 ? [{
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount: actualQtyToAdd,
          type: 'add'
        }] : []
      };
      onUpdate([...items, newItem]);
    }

    // Reset Form
    setNewName('');
    setNewQty('');
    setNewDaily('');
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف من المخزون؟')) {
      onUpdate(items.filter(i => i.id !== id));
    }
  };

  const toggleHistory = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* --- قسم إضافة / تحديث المخزون --- */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-orange-100 p-2.5 rounded-xl">
             <Wheat className="text-orange-600 w-6 h-6" />
           </div>
           <div>
             <h2 className="text-xl font-bold text-gray-800">إدارة المخزون</h2>
             <p className="text-sm text-gray-500">إضافة صنف جديد أو توريد كمية (شراء)</p>
           </div>
        </div>
        
        <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-4">
          
          {/* Category Selector */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
             <button
               type="button"
               onClick={() => setCategory('grain')}
               className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'grain' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
             >
               <Wheat size={18} /> حبوب (شعير/مكعب)
             </button>
             <button
               type="button"
               onClick={() => setCategory('fodder')}
               className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'fodder' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
             >
               <Layers size={18} /> أعلاف (برسيم/تبن)
             </button>
          </div>

          <div className="flex flex-col xl:flex-row gap-4">
            <input 
               value={newName}
               onChange={e => setNewName(e.target.value)}
               placeholder={category === 'grain' ? "اسم الصنف (مثال: شعير)" : "اسم الصنف (مثال: برسيم)"}
               className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white transition text-gray-900"
               required
            />
            
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <input 
                   type="number"
                   value={newQty}
                   onChange={e => setNewQty(e.target.value)}
                   placeholder={category === 'grain' ? "عدد الأكياس" : "العدد (حزمة)"}
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900 pl-20"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded pointer-events-none">
                   {category === 'grain' ? 'كيس (50كجم)' : 'حزمة'}
                </span>
              </div>

              <div className="relative flex-1">
                <input 
                   type="number"
                   value={newDaily}
                   onChange={e => setNewDaily(e.target.value)}
                   placeholder={category === 'grain' ? "استهلاك (كجم)" : "استهلاك (حزمة)"}
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white text-gray-900 pl-16"
                   title="معدل الاستهلاك اليومي"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                   يومياً
                </span>
              </div>
            </div>
            
            <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl transition shadow-lg shadow-orange-100 flex items-center justify-center gap-2 font-bold whitespace-nowrap">
               <Save size={20} />
               <span>حفظ / تحديث</span>
            </button>
          </div>
          
          {category === 'grain' && (
             <p className="text-xs text-gray-400 px-2 flex items-center gap-1">
                <InfoIcon size={12} />
                سيتم تحويل عدد الأكياس تلقائياً إلى كيلو (الكيس = 50 كجم) لضبط دقة الاستهلاك.
             </p>
          )}
        </form>
      </div>

      {/* --- شبكة البطاقات --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Package size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">المخزون فارغ حالياً</p>
              <p className="text-sm">أضف الأعلاف من النموذج بالأعلى</p>
           </div>
        )}

        {items.map(item => {
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
            <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative flex flex-col h-full animate-scale-in">
               {/* زر الحذف */}
               <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-4 left-4 text-gray-300 hover:text-red-500 transition z-10 p-2"
               >
                 <Trash2 size={18} />
               </button>

               {/* رأس البطاقة */}
               <div className="p-6 flex-1">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <h3 className="font-extrabold text-2xl text-gray-800 flex items-center gap-2">
                       {item.name}
                       <span className={`text-[10px] px-2 py-0.5 rounded-full ${isGrain ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                         {isGrain ? 'حبوب' : 'أعلاف'}
                       </span>
                     </h3>
                     <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                       <History size={12} />
                       آخر تحديث: {new Date(item.lastUpdated).toLocaleDateString('ar-SA')}
                     </p>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {isLow ? <AlertTriangle size={12} /> : (isGrain ? <Wheat size={12} /> : <Layers size={12} />)}
                      {isLow ? 'منخفض' : 'متوفر'}
                   </div>
                 </div>
                 
                 <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-gray-900 tracking-tight">{displayQty}</span>
                    <span className="text-lg text-gray-500 font-medium">{displayUnit}</span>
                 </div>
                 
                 {isGrain && (
                    <div className="mb-6 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg w-fit border border-gray-100">
                       يعادل تقريباً <strong className="text-gray-900 text-base mx-1">{bagEquivalent}</strong> كيس
                    </div>
                 )}
                 {!isGrain && <div className="mb-6"></div>}

                 {/* شريط المعلومات */}
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
               </div>

               {/* قسم السجل (القابل للطي) */}
               <div className="border-t border-gray-100 bg-gray-50/50">
                 <button 
                   onClick={() => toggleHistory(item.id)}
                   className="w-full py-3 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-orange-600 hover:bg-gray-50 transition font-medium"
                 >
                   {isExpanded ? 'إخفاء السجل' : 'عرض سجل العمليات'}
                   {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                 </button>

                 {isExpanded && (
                   <div className="bg-white p-0 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-100">
                      {(item.logs && item.logs.length > 0) ? (
                        <div className="divide-y divide-gray-100">
                          {item.logs.map(log => (
                            <div key={log.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition">
                               <div className="flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full ${log.type === 'add' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                 <div className="flex flex-col">
                                   <span className={`font-bold text-sm ${log.type === 'add' ? 'text-emerald-700' : 'text-gray-700'}`}>
                                     {log.type === 'add' ? 'شراء / إضافة' : 'استهلاك'} {log.amount} {item.unit}
                                   </span>
                                   {log.isAuto && <span className="text-[10px] text-orange-600 font-medium">خصم تلقائي (8:00 ص)</span>}
                                 </div>
                               </div>
                               <div className="text-right text-[10px] text-gray-400">
                                 <div>{new Date(log.date).toLocaleDateString('ar-SA')}</div>
                                 <div>{new Date(log.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</div>
                               </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 text-xs py-4">لا توجد عمليات مسجلة</p>
                      )}
                   </div>
                 )}
               </div>
            </div>
          );
        })}
      </div>
    </div>
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
