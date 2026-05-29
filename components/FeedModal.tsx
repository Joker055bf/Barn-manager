import React, { useState, useEffect } from 'react';
import { X, Wheat, Layers, Save, Check } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { FeedItem, FeedLogEntry } from '../types';

interface FeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: FeedItem) => void;
  initialData?: FeedItem;
}

const DAYS = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' }
];

const GRAIN_OPTIONS = ['شعير', 'مكعب', 'ذرة', 'نخالة', 'مشكل'];
const FODDER_OPTIONS = ['برسيم', 'تبن', 'رودس', 'ذرة'];

export const FeedModal: React.FC<FeedModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [category, setCategory] = useState<'grain' | 'fodder'>('grain');
  const [name, setName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [quantity, setQuantity] = useState('');
  
  const [consumptionMethod, setConsumptionMethod] = useState<'uniform' | 'varied'>('uniform');
  const [dailyConsumption, setDailyConsumption] = useState('');
  
  const [variedConsumption, setVariedConsumption] = useState<Record<number, string>>({});

  useEffect(() => {
    if (initialData) {
      setCategory(initialData.category || 'grain');
      setName(initialData.name);
      
      const opts = initialData.category === 'grain' ? GRAIN_OPTIONS : FODDER_OPTIONS;
      if (initialData.name && !opts.includes(initialData.name)) {
        setIsCustomName(true);
      } else {
        setIsCustomName(false);
      }
      
      // Calculate display quantity (grains stored in kg, display as bags)
      if (initialData.category === 'grain') {
         setQuantity(initialData.quantity ? (initialData.quantity / 50).toString() : '');
      } else {
         setQuantity(initialData.quantity ? initialData.quantity.toString() : '');
      }

      setConsumptionMethod(initialData.consumptionMethod || 'uniform');
      setDailyConsumption(initialData.dailyConsumption ? initialData.dailyConsumption.toString() : '');
      
      if (initialData.variedDailyConsumption) {
        const converted: Record<number, string> = {};
        Object.entries(initialData.variedDailyConsumption).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            converted[Number(key)] = val.toString();
          }
        });
        setVariedConsumption(converted);
      } else {
        setVariedConsumption({});
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setCategory('grain');
    setName('');
    setIsCustomName(false);
    setQuantity('');
    setConsumptionMethod('uniform');
    setDailyConsumption('');
    setVariedConsumption({});
  };

  const handleVariedChange = (dayId: number, val: string) => {
    setVariedConsumption(prev => ({ ...prev, [dayId]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let rawQtyInput = Number(quantity) || 0;
    let actualQtyToAdd = rawQtyInput;
    let unitLabel = '';

    if (category === 'grain') {
      actualQtyToAdd = rawQtyInput * 50; // Convert Bags to Kg
      unitLabel = 'كجم';
    } else {
      unitLabel = 'حزمة';
    }

    const dailyRate = Number(dailyConsumption) || 0;
    
    // Parse varied
    const parsedVaried: Record<number, number> = {};
    Object.entries(variedConsumption).forEach(([key, val]) => {
       const num = Number(val);
       if (!isNaN(num) && num > 0) {
         parsedVaried[Number(key)] = num;
       }
    });

    const isUpdate = !!initialData;
    const finalQuantity = isUpdate ? initialData.quantity + actualQtyToAdd : actualQtyToAdd;

    const logEntry: FeedLogEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount: actualQtyToAdd,
      type: 'add'
    };

    const finalLogs = isUpdate ? [...(initialData.logs || [])] : [];
    if (actualQtyToAdd > 0) {
      finalLogs.unshift(logEntry);
    }

    const finalItem: FeedItem = {
      id: initialData?.id || crypto.randomUUID(),
      name: name.trim(),
      category: category,
      unit: unitLabel,
      quantity: finalQuantity,
      consumptionMethod: consumptionMethod,
      dailyConsumption: dailyRate,
      variedDailyConsumption: consumptionMethod === 'varied' ? parsedVaried : undefined,
      lastUpdated: new Date().toISOString(),
      lastAutoDeduction: initialData?.lastAutoDeduction,
      logs: finalLogs.slice(0, 50)
    };

    onSave(finalItem);
    onClose();
  };

  const calculatedDaysLeft = () => {
    if (consumptionMethod === 'uniform') {
      const rate = Number(dailyConsumption) || 0;
      if (rate > 0) {
        // Compute total kg first based on category to give accurate preview
        const totalKg = category === 'grain' ? (Number(quantity) * 50) : Number(quantity);
        const stock = initialData ? (initialData.quantity + totalKg) : totalKg;
        return Math.floor(stock / rate);
      }
    }
    return '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#Fdfcf7] rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-[#E0D9D0]/50 animate-scale-in my-auto">
        {/* Header */}
        <div className="flex justify-between items-center bg-white px-6 py-5 rounded-t-[2.5rem] border-b border-gray-100">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {initialData ? 'تحديث مخزون' : 'إضافة مخزون'}
            <Wheat className="text-orange-600" />
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Category Selector */}
          <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
             <button
               type="button"
               onClick={() => setCategory('grain')}
               className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'grain' ? 'bg-white text-orange-600 shadow-sm border border-orange-100' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <Wheat size={18} /> حبوب
             </button>
             <button
               type="button"
               onClick={() => setCategory('fodder')}
               className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${category === 'fodder' ? 'bg-white text-green-600 shadow-sm border border-green-100' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <Layers size={18} /> أعلاف
             </button>
          </div>

          <div>
            <CustomSelect
              required
              label="اسم الصنف"
              placeholder="اختر الصنف"
              value={isCustomName ? 'other' : name}
              onChange={(val) => {
                if (val === 'other') {
                  setIsCustomName(true);
                  setName('');
                } else {
                  setIsCustomName(false);
                  setName(val);
                }
              }}
              options={[
                ...(category === 'grain' ? GRAIN_OPTIONS : FODDER_OPTIONS).map(opt => ({ value: opt, label: opt })),
                { value: 'other', label: 'أخرى (كتابة يدوية)' }
              ]}
            />
            
            {isCustomName && (
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب اسم الصنف هنا..."
                className="w-full mt-3 px-5 py-4 bg-white text-gray-800 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-right shadow-sm transition animate-fade-in"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 text-right">
              {category === 'grain' ? 'الكمية المراد إضافتها (أكياس)' : 'الكمية المراد إضافتها (حزم)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-5 py-4 bg-white text-gray-800 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-right shadow-sm transition"
            />
          </div>

          {/* Consumption Method Settings */}
          <div className="pt-2 border-t border-gray-100">
             <label className="block text-xs font-bold text-gray-600 mb-3 text-right">
                إعدادات طريقة الاستهلاك اليومي
             </label>
             <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                <button
                  type="button"
                  onClick={() => setConsumptionMethod('uniform')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-bold transition ${consumptionMethod === 'uniform' ? 'bg-white text-orange-600 shadow-sm border border-orange-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  استهلاك يومي موحد
                </button>
                <button
                  type="button"
                  onClick={() => setConsumptionMethod('varied')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-bold transition ${consumptionMethod === 'varied' ? 'bg-white text-orange-600 shadow-sm border border-orange-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  يختلف استهلاك اليوم
                </button>
             </div>

             {consumptionMethod === 'uniform' ? (
               <div className="flex gap-3">
                 <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-gray-400 font-bold mb-1">يكفي لمدة (يوم)</span>
                    <span className="text-xl font-black text-gray-400">{calculatedDaysLeft()}</span>
                 </div>
                 <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 text-right">
                      كم يتم استهلاكه في اليوم
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={dailyConsumption}
                      onChange={(e) => setDailyConsumption(e.target.value)}
                      placeholder={category === 'grain' ? 'مثال: 5 كجم' : 'مثال: 2 حزمة'}
                      className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-center shadow-sm transition"
                    />
                 </div>
               </div>
             ) : (
               <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                 {DAYS.map(day => (
                   <div key={day.id} className="flex flex-col">
                     <label className="text-[10px] font-bold text-gray-500 mb-1 text-right">{day.name}</label>
                     <div className="relative">
                       <input
                         type="number"
                         min="0"
                         step="0.1"
                         value={variedConsumption[day.id] || ''}
                         onChange={(e) => handleVariedChange(day.id, e.target.value)}
                         placeholder="0"
                         className="w-full pr-4 pl-10 py-2.5 bg-white text-gray-800 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-right shadow-sm transition"
                       />
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">{category === 'grain' ? 'كجم' : 'حزمة'}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#765341] hover:bg-[#5D4037] text-white font-bold py-4 px-4 rounded-2xl transition shadow-lg shadow-orange-900/20 transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              <span>{initialData ? 'حفظ التعديلات' : 'إضافة للمخزون'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
