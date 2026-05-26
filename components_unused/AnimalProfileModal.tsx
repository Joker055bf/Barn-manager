import React, { useState, useMemo } from 'react';
import { X, ArrowRightLeft, Baby, HeartPulse, CheckCircle2, XCircle, Activity, Sparkles, Dna, Award } from 'lucide-react';
import { Sheep, Pen, ActivityEntry } from '../types';

interface AnimalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep: Sheep;
  allSheep: Sheep[];
  pens: Pen[];
  currentUser?: any;
  activityLog?: ActivityEntry[];
  language?: 'ar' | 'en';
  onShowAlert?: (type: 'success' | 'error', msg: string) => void;
  onShowConfirm?: (msg: string, onConfirm: () => void) => void;
}

export const AnimalProfileModal: React.FC<AnimalProfileModalProps> = ({
  isOpen,
  onClose,
  sheep,
  allSheep,
  pens,
  currentUser,
  activityLog = [],
  language = 'ar',
  onShowAlert,
  onShowConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'timeline' | 'production'>('basic');

  // --- الدوال المساعدة (Helpers) ---
  const getPenName = (penId: string) => {
    const pen = pens.find(p => p.id === penId);
    return pen ? pen.name : 'غير محدد';
  };

  const getAgeString = (birthDate: string) => {
    if (!birthDate) return 'غير محدد';
    const months = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return 'أقل من شهر';
    if (months < 12) return `${months} شهر`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return `${years} سنة${remMonths > 0 ? ` و ${remMonths} شهر` : ''}`;
  };

  const getAgeName = (birthDate: string) => {
    if (!birthDate) return 'غير معروف';
    const months = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 6) return 'بهمة';
    if (months < 12) return 'جذع';
    if (months < 24) return 'ثني';
    if (months < 36) return 'رباع';
    if (months < 48) return 'سديس';
    return 'جامع';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* خلفية النافذة */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* الحاوية الرئيسية */}
      <div className="relative w-full max-w-5xl bg-[#fcfbf4] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
        
        {/* الترويسة (Header) */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center font-black text-lg">
              #{sheep.serialNumber}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#3E2723] dark:text-gray-100 flex items-center gap-2">
              ملف الحيوان
              <Sparkles className="text-orange-500" size={20} />
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* أزرار التبويبات (Tabs) */}
        <div className="flex bg-gray-50 border-b border-gray-100 dark:bg-slate-900/50 dark:border-slate-800/80 p-2 gap-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'basic' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <Dna size={16} /> ملخص الحالة
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'timeline' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <ArrowRightLeft size={16} /> المسار الزمني
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'production' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <Award size={16} /> {sheep.gender === 'female' ? 'سجل الإنتاج' : 'النسل والإنتاج'}
          </button>
        </div>

        {/* محتوى التبويبات (Content) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 custom-scrollbar">
          
          {/* التبويب الأول: المعلومات الأساسية */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">النوع</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{sheep.type || 'غير محدد'}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">الجنس</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{sheep.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">تاريخ الميلاد</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{sheep.birthDate || 'غير مسجل'}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">العمر الدقيق</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{getAgeString(sheep.birthDate)}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">اسم العمر</span>
                  <span className="text-sm font-bold text-[#795548] dark:text-orange-400">{getAgeName(sheep.birthDate)}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المكان الحالي</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{getPenName(sheep.penId)}</span>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-slate-800" />

              <div className="space-y-4">
                <h3 className="font-black text-sm text-gray-800 flex items-center gap-2 dark:text-white">
                  <HeartPulse size={16} className="text-rose-500" />
                  الحالة الصحية والإنتاجية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${sheep.healthStatus === 'sick' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                    {sheep.healthStatus === 'sick' ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">الحالة الصحية</span>
                      <span className="text-sm font-bold">{sheep.healthStatus === 'sick' ? 'مريض' : 'سليم'}</span>
                    </div>
                  </div>
                  
                  {sheep.gender === 'female' && (
                    <div className="p-4 rounded-2xl border bg-purple-50 border-purple-100 text-purple-700 flex items-center gap-3">
                      <Baby size={24} />
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">حالة الإنتاج</span>
                        <span className="text-sm font-bold">
                          {sheep.reproductionStatus === 'pregnant' ? 'مضرع (حامل)' : sheep.reproductionStatus === 'mother' ? 'أم مرضعة' : 'غير مضرع'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* التبويب الثاني: المسار الزمني */}
          {activeTab === 'timeline' && (
            <div className="text-center py-12 text-gray-400 animate-fade-in">
               <Activity size={32} className="mx-auto mb-3 opacity-20" />
               <p className="text-sm font-bold">المسار الزمني سيظهر هنا قريباً...</p>
            </div>
          )}

          {/* التبويب الثالث: الإنتاج */}
          {activeTab === 'production' && (
            <div className="text-center py-12 text-gray-400 animate-fade-in">
               <Award size={32} className="mx-auto mb-3 opacity-20" />
               <p className="text-sm font-bold">بيانات سجل الإنتاج ستظهر هنا قريباً...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};