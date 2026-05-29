
import React, { useState } from 'react';
import { Wheat, Package, Trash2, History, AlertTriangle, CalendarDays, ChevronDown, ChevronUp, Droplets, Clock, Layers, Plus, Edit2 } from 'lucide-react';
import { FeedItem, FeedLogEntry } from '../types';
import { FeedModal } from './FeedModal';

interface FeedManagerProps {
  items: FeedItem[];
  onUpdate: (items: FeedItem[]) => void;
}

export const FeedManager: React.FC<FeedManagerProps> = ({ items, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'grain' | 'fodder'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeedItem | undefined>(undefined);

  const handleSaveFeed = (newItem: FeedItem) => {
    const existingIndex = items.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = newItem;
      onUpdate(updatedItems);
    } else {
      onUpdate([...items, newItem]);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا الصنف من المخزون؟')) {
      onUpdate(items.filter(i => i.id !== id));
    }
  };

  const toggleHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const openEditModal = (item: FeedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const getDayName = (id: number) => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[id] || '';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
      
      {/* Header Section */}
      <div className="flex justify-between items-center px-2">
         <button 
           onClick={() => { setEditingItem(undefined); setIsModalOpen(true); }}
           className="bg-[#765341] hover:bg-[#5D4037] text-white px-5 py-3 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 font-bold text-sm"
         >
           <Plus size={16} />
           <span>إضافة أعلاف</span>
         </button>
         
         <div className="text-right flex flex-col items-end">
           <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
             إدارة الأعلاف والمخزون
             <Wheat className="text-[#765341]" size={24} />
           </h2>
           <p className="text-xs font-bold text-gray-400 mt-1">متابعة وإدارة استهلاك الأعلاف والحبوب</p>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 mx-2">
        <button
          onClick={() => setActiveTab('fodder')}
          className={`flex-1 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'fodder' ? 'bg-white shadow-sm border border-gray-100 text-gray-800' : 'text-gray-400'}`}
        >
          أعلاف
        </button>
        <button
          onClick={() => setActiveTab('grain')}
          className={`flex-1 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'grain' ? 'bg-white shadow-sm border border-gray-100 text-gray-800' : 'text-gray-400'}`}
        >
          حبوب
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 rounded-xl transition font-bold text-sm ${activeTab === 'all' ? 'bg-white shadow-sm border border-gray-100 text-gray-800' : 'text-gray-400'}`}
        >
          الكل
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4 px-2">
        {filteredItems.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Package size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-bold">لا توجد أصناف هنا</p>
              <p className="text-sm">اضغط على زر إضافة أعلاف للبدء</p>
           </div>
        )}

        {filteredItems.map(item => {
          const isExpanded = expandedItemId === item.id;
          const isGrain = item.category === 'grain';
          const displayQty = item.quantity;
          const displayUnit = item.unit;
          const isLow = displayQty <= 0;

          const isVaried = item.consumptionMethod === 'varied';
          const dailyAvg = item.dailyConsumption || 0;
          
          let daysLeft: number | null = null;
          if (isVaried && item.variedDailyConsumption) {
             const sum = Object.values(item.variedDailyConsumption).reduce((acc, val) => acc + (val || 0), 0);
             const weeklyAvg = sum / 7;
             if (weeklyAvg > 0) daysLeft = Math.floor(displayQty / weeklyAvg);
          } else if (dailyAvg > 0) {
             daysLeft = Math.floor(displayQty / dailyAvg);
          }

          return (
            <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative flex flex-col animate-scale-in">
               
               {/* Card Header (Always visible) */}
               <div 
                 onClick={(e) => toggleHistory(item.id, e)}
                 className="p-5 flex items-center justify-between cursor-pointer group"
               >
                 <div className="w-10 h-10 flex items-center justify-center text-gray-300 group-hover:bg-gray-50 rounded-xl transition">
                   {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </div>

                 <div className="flex items-center gap-4 text-right">
                   <div className="flex flex-col items-end">
                     <h3 className="font-extrabold text-xl text-gray-800">{item.name}</h3>
                     <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                         {isLow ? 'نفد' : 'متوفر'}
                       </span>
                       <span className="text-xs text-gray-400 font-medium">{displayQty} {isGrain ? 'كجم' : 'حزمة'}</span>
                     </div>
                   </div>
                   <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${isGrain ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {isGrain ? <Wheat size={24} /> : <Layers size={24} />}
                   </div>
                 </div>
               </div>

               {/* Expanded Content */}
               {isExpanded && (
                 <div className="px-5 pb-5 border-t border-gray-50 pt-4 animate-fade-in">
                    
                    {/* Actions */}
                    <div className="flex justify-between items-center mb-6">
                       <button 
                         onClick={(e) => handleDelete(item.id, e)}
                         className="flex items-center gap-1 text-red-400 hover:text-red-600 transition text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50"
                       >
                         <Trash2 size={14} /> حذف الصنف
                       </button>
                       <button 
                         onClick={(e) => openEditModal(item, e)}
                         className="flex items-center gap-1 text-blue-400 hover:text-blue-600 transition text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50"
                       >
                         تحديث الصنف <Edit2 size={14} />
                       </button>
                    </div>

                    {/* Current Balance */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-4 border border-gray-100">
                       <div className="font-black text-gray-800 text-lg flex items-baseline gap-1">
                          {isGrain ? (displayQty / 50).toFixed(1) : displayQty} <span className="text-[11px] text-gray-500 font-medium">{isGrain ? 'كيس' : 'حزمة'}</span>
                       </div>
                       <span className="text-xs font-bold text-gray-500">الرصيد الحالي:</span>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                          <p className="text-emerald-500 text-[11px] mb-1 font-bold flex items-center gap-1">
                            <CalendarDays size={14} /> يكفي لمدة
                          </p>
                          <p className="font-black text-emerald-700 text-2xl">
                             {daysLeft !== null && daysLeft !== Infinity ? daysLeft : '-'} <span className="text-xs font-medium text-emerald-600">يوم</span>
                          </p>
                       </div>

                       <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <div className="absolute top-2 left-2 text-orange-400">
                             <Clock size={12} />
                          </div>
                          <p className="text-orange-500 text-[11px] mb-1 font-bold flex items-center gap-1">
                            استهلاك تلقائي <Droplets size={12} />
                          </p>
                          {isVaried ? (
                             <p className="font-black text-gray-800 text-sm">حسب اليوم</p>
                          ) : (
                             <p className="font-black text-gray-800 text-xl">{dailyAvg > 0 ? dailyAvg : '-'} <span className="text-[10px] font-medium">{displayUnit}</span></p>
                          )}
                          <p className="text-[9px] text-orange-400 mt-1 font-bold">يومياً 8:00 ص</p>
                       </div>
                    </div>

                    {/* Varied Consumption Details (if applicable) */}
                    {isVaried && item.variedDailyConsumption && (
                      <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                         <h4 className="text-[11px] font-bold text-gray-500 mb-3 text-right">جدول الاستهلاك المتغير (كجم/يوم)</h4>
                         <div className="grid grid-cols-4 gap-2">
                            {Object.entries(item.variedDailyConsumption).map(([dayId, val]) => (
                               val > 0 && (
                                 <div key={dayId} className="bg-white p-2 rounded-xl text-center shadow-sm border border-gray-100">
                                   <div className="text-[9px] text-gray-400 font-bold mb-1">{getDayName(Number(dayId))}</div>
                                   <div className="text-xs font-black text-orange-600">{val}</div>
                                 </div>
                               )
                            ))}
                         </div>
                      </div>
                    )}

                    {/* Logs */}
                    <div>
                       <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center justify-end gap-1">
                          سجل العمليات <History size={14} />
                       </h4>
                       <div className="bg-white rounded-2xl p-1 max-h-40 overflow-y-auto custom-scrollbar">
                          {(item.logs && item.logs.length > 0) ? (
                            <div className="divide-y divide-gray-50">
                              {item.logs.map(log => (
                                <div key={log.id} className="flex justify-between items-center py-2.5 px-2">
                                   <div className="text-left text-[9px] text-gray-400 font-medium">
                                     {new Date(log.date).toLocaleDateString('en-GB')}
                                   </div>
                                   <div className="flex items-center gap-2 text-right">
                                     <span className={`font-bold text-[11px] ${log.type === 'add' ? 'text-gray-800' : 'text-gray-600'}`}>
                                       {log.type === 'add' ? 'إضافة' : 'استهلاك'} {log.amount} {isGrain && log.type === 'add' ? 'كجم' : ''}
                                     </span>
                                     <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'add' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                   </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-400 text-[10px] py-4">لا توجد عمليات</p>
                          )}
                       </div>
                    </div>

                 </div>
               )}
            </div>
          );
        })}
      </div>

      <FeedModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFeed}
        initialData={editingItem}
      />
    </div>
  );
};
