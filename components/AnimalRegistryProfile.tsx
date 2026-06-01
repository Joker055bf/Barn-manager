import React, { useState, useMemo } from 'react';
import { X, Calendar, Warehouse, User, Baby, FileText, Activity, HeartPulse, History, Shield, Clock, ArrowRightLeft } from 'lucide-react';
import { Sheep, Pen } from '../types';
import { getAnimalAgeLabel } from '../utils/animalHelpers';

interface AnimalRegistryProfileProps {
  isOpen: boolean;
  onClose: () => void;
  sheep: Sheep;
  allSheep: Sheep[];
  pens: Pen[];
  onUpdateReproduction?: (sheepId: string, updates: any) => Promise<void>;
  onLogActivity?: (action: string, detail: string) => Promise<void>;
}

// Exact Detailed Age Helper
const calculateDetailedAge = (dateStr?: string) => {
  if (!dateStr) return '-';
  const birth = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} سنة`);
  if (months > 0) parts.push(`${months} شهر`);
  if (days > 0) parts.push(`${days} يوم`);

  return parts.length > 0 ? parts.join(' و ') : 'اليوم';
};

export const AnimalRegistryProfile: React.FC<AnimalRegistryProfileProps> = ({
  isOpen,
  onClose,
  sheep,
  allSheep,
  pens,
  onUpdateReproduction,
  onLogActivity
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'movements' | 'offspring'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [miscarriageReason, setMiscarriageReason] = useState('');

  const ageLabel = getAnimalAgeLabel(sheep.birthDate, sheep.type, sheep.gender);
  const isBaby = ageLabel === 'طفل' ||
                  ageLabel === 'حوار' || ageLabel === 'مخلول' || ageLabel === 'مفرود' || ageLabel === 'لِقي' || ageLabel === 'حِقّ' ||
                  ageLabel === 'صوص' || ageLabel === 'فرخ' ||
                  ageLabel === 'زغلول' || ageLabel === 'فـريخ' || ageLabel === 'شـاب' ||
                  ageLabel === 'صوص البط' || ageLabel === 'بط فتي';

  if (!isOpen) return null;

  // Helpers
  const getPenName = (penId: string) => {
    const pen = pens.find(p => p.id === penId);
    return pen ? pen.name : 'غير محدد';
  };

  const isPregnancyOverdue = () => {
    if (sheep.reproductionStatus !== 'pregnant' || !sheep.pregnancyDate) return false;
    const start = new Date(sheep.pregnancyDate);
    const diffTime = Math.abs(Date.now() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 150; // 5 months = 150 days
  };

  const getLactationRemainingDays = () => {
    if (sheep.reproductionStatus !== 'mother') return 0;
    const daysLactation = sheep.lactationStartDate ? Math.max(0, Math.floor((Date.now() - new Date(sheep.lactationStartDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const remaining = Math.max(0, 90 - daysLactation);
    return remaining;
  };

  // 1. Offspring calculation
  const offspring = useMemo(() => {
    if (sheep.gender !== 'female') return [];
    return allSheep.filter(s =>
      (s.motherId === sheep.id || s.motherId === sheep.serialNumber) &&
      !s.penId.includes('mortality') && !s.penId.includes('sold')
    ).sort((a, b) => new Date(b.birthDate || 0).getTime() - new Date(a.birthDate || 0).getTime());
  }, [allSheep, sheep]);

  // 2. Movement history
  const movements = sheep.movementHistory || [];

  const handleToggleReproduction = async () => {
    if (!onUpdateReproduction) return;
    setIsLoading(true);
    try {
      if (sheep.reproductionStatus === 'empty' || !sheep.reproductionStatus) {
        const updates = {
          reproductionStatus: 'pregnant',
          pregnancyDate: new Date().toISOString(),
          expectedBirthDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString()
        };
        await onUpdateReproduction(sheep.id, updates);
      } else if (sheep.reproductionStatus === 'mother') {
        const updates = {
          reproductionStatus: 'empty',
          lactationStartDate: null,
          pregnancyDate: null,
          expectedBirthDate: null
        };
        await onUpdateReproduction(sheep.id, updates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-[#F4F0EA] rounded-[2.5rem] w-full max-w-xl h-[85vh] shadow-2xl overflow-hidden flex flex-col border border-[#E0D9D0]/50 animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#5D4037] px-6 py-5 rounded-t-[2.5rem] shrink-0">
          <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white text-center flex-1">
            سجل بطاقة الحيوان الشاملة
          </h2>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0">
            <FileText size={20} />
          </div>
        </div>

        {/* Custom Tab Switcher */}
        <div className="px-6 pt-5 shrink-0">
          <div className="flex bg-[#E5DFD5] p-1.5 rounded-2xl border border-[#D7CFC4]">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all duration-300 ${activeTab === 'general' ? 'bg-[#5D4037] text-white shadow-md' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
            >
              البيانات العامة
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all duration-300 ${activeTab === 'movements' ? 'bg-[#5D4037] text-white shadow-md' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
            >
              سجل التنقلات ({movements.length})
            </button>
            {sheep.gender === 'female' && (
              <button
                onClick={() => setActiveTab('offspring')}
                className={`flex-1 py-3 rounded-xl font-black text-xs transition-all duration-300 ${activeTab === 'offspring' ? 'bg-[#5D4037] text-white shadow-md' : 'text-[#8D6E63] hover:text-[#5D4037]'}`}
              >
                المواليد ({offspring.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Detailed Strip grid */}
              <div className="bg-white rounded-3xl p-5 border border-[#E0D9D0] shadow-sm grid grid-cols-2 gap-4">
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">النوع</span>
                  <span className="text-sm font-black text-[#5D4037]">{sheep.type}</span>
                </div>
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">الجنس</span>
                  <span className="text-sm font-black text-[#5D4037]">{sheep.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>

                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">رقم المعرف / التاج</span>
                  <span className="text-sm font-black text-[#5D4037]">#{sheep.serialNumber}</span>
                </div>
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">اللون</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sheep.tagColor && (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: sheep.tagColor }}></div>
                    )}
                    <span className="text-sm font-black text-[#5D4037]">
                      {sheep.color && sheep.color !== 'غير محدد' ? sheep.color : ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">العمر بالتدقيق</span>
                  <span className="text-sm font-black text-emerald-700">{calculateDetailedAge(sheep.birthDate)}</span>
                </div>
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">مسمى العمر</span>
                  <span className="text-sm font-black text-[#5D4037]">{getAnimalAgeLabel(sheep.birthDate, sheep.type, sheep.gender)}</span>
                </div>

                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">تاريخ الميلاد</span>
                  <span className="text-sm font-black text-[#5D4037]">{sheep.birthDate || '-'}</span>
                </div>
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">الأم</span>
                  {sheep.motherId ? (() => {
                    const motherSheep = allSheep.find(s => s.id === sheep.motherId || s.serialNumber === sheep.motherId);
                    return (
                      <div className="flex items-center gap-2 mt-0.5">
                        {motherSheep?.tagColor && (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: motherSheep.tagColor }}></div>
                        )}
                        <span className="text-sm font-black text-[#5D4037]">#{motherSheep ? motherSheep.serialNumber : sheep.motherId}</span>
                      </div>
                    );
                  })() : (
                    <span className="text-sm font-black text-gray-400">-</span>
                  )}
                </div>

                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">المكان / القسم الحالي</span>
                  <span className="text-sm font-black text-[#5D4037]">{getPenName(sheep.penId)}</span>
                </div>
                <div className="flex flex-col border-b border-[#F4F0EA] pb-2 border-transparent">
                  {/* Empty cell to keep grid alignment neat */}
                </div>

                <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                  <span className="text-[10px] font-bold text-[#8D6E63]">الحالة الصحية</span>
                  <span className={`text-sm font-black ${sheep.status === 'sick' ? 'text-red-600' : 'text-green-600'}`}>
                    {sheep.status === 'sick' ? 'مريض / تحت الملاحظة' : 'سليم'}
                  </span>
                </div>
                {sheep.gender === 'female' && !isBaby ? (
                  <div className="flex flex-col border-b border-[#F4F0EA] pb-2">
                    <span className="text-[10px] font-bold text-[#8D6E63]">حالة الإخصاب والتناسل</span>
                    <span className={`text-sm font-black ${
                      sheep.reproductionStatus === 'pregnant' ? 'text-rose-600' :
                      sheep.reproductionStatus === 'mother' ? 'text-pink-600' : 'text-amber-600'
                    }`}>
                      {sheep.reproductionStatus === 'pregnant' ? 'مضرع (حامل)' :
                       sheep.reproductionStatus === 'mother' ? 'أم' : 'غير مضرع'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col border-b border-[#F4F0EA] pb-2 border-transparent">
                    {/* Empty cell if breeding is hidden */}
                  </div>
                )}
              </div>

              {/* Breeding & Reproduction Countdown Details - Females only, mature only, and active states only */}
              {sheep.gender === 'female' && !isBaby && (sheep.reproductionStatus === 'pregnant' || sheep.reproductionStatus === 'mother') && (
                <div className="bg-white rounded-3xl p-5 border border-[#E0D9D0] shadow-sm space-y-4">
                  <div className="pt-2">
                    {sheep.reproductionStatus === 'pregnant' && (
                      <div className="space-y-4">
                        {/* Current pregnancy status info banner */}
                        {isPregnancyOverdue() ? (
                          <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold p-3 rounded-2xl text-center flex items-center gap-2 justify-center dark:bg-red-950/20 dark:border-red-900/50">
                            <span>⚠️ تنبيه: مضى أكثر من 5 أشهر على الحمل! موعد الولادة المتوقع قد حان.</span>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-bold p-2.5 rounded-2xl text-center flex flex-col gap-1 items-center justify-center dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <Clock size={12} />
                              <span>تاريخ التلقيح المتوقع: {sheep.pregnancyDate ? new Date(sheep.pregnancyDate).toLocaleDateString('en-GB') : '-'}</span>
                            </div>
                            {sheep.expectedBirthDate && (() => {
                              const expected = new Date(sheep.expectedBirthDate);
                              const now = new Date();
                              const diffMs = expected.getTime() - now.getTime();
                              if (diffMs <= 0) {
                                return <span className="text-[10px] font-black text-red-500 mt-1">موعد الولادة المتوقع قد حان</span>;
                              }
                              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                              const months = Math.floor(diffDays / 30);
                              const days = diffDays % 30;
                              const durationStr = months > 0 ? (months + " شهر و " + days + " يوم") : (days + " يوم");
                              return <span className="text-[10px] font-black text-rose-600 mt-1">المدة المتبقية للحمل: {durationStr}</span>;
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {sheep.reproductionStatus === 'mother' && (
                      <div className="bg-pink-50 border border-pink-100 text-pink-700 text-[10px] font-bold p-3 rounded-2xl text-center flex items-center gap-2 justify-center">
                        <Clock size={12} />
                        <span>الوضع الحالي: حضانة ورضاعة طبيعية (متبقي {getLactationRemainingDays()} يوم لتتحول تلقائياً إلى غير مضرع)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Movement History */}
          {activeTab === 'movements' && (
            <div className="space-y-4 animate-fade-in">
              {movements.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-[#E0D9D0] text-center text-[#8D6E63] font-bold text-xs space-y-3 shadow-sm">
                  <History className="mx-auto text-[#8D6E63]/40" size={32} />
                  <p>لا يوجد سجلات تنقل سابقة للحيوان بين الأقسام.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 border border-[#E0D9D0] shadow-sm divide-y divide-[#F4F0EA]">
                  {movements.map((move, idx) => (
                    <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <ArrowRightLeft size={14} />
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-black text-[#5D4037]">
                            من قسم [{move.fromPenName}] إلى [{move.toPenName}]
                          </span>
                          <span className="text-[9px] text-[#8D6E63] font-bold mt-0.5 flex items-center gap-1">
                            <User size={10} />
                            المسؤول: {move.movedBy}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-gray-50 text-gray-500 font-bold px-2.5 py-1 rounded-xl border border-gray-100 whitespace-nowrap">
                        {move.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Offspring / Children List */}
          {activeTab === 'offspring' && (
            <div className="space-y-4 animate-fade-in">
              {offspring.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-[#E0D9D0] text-center text-[#8D6E63] font-bold text-xs space-y-3 shadow-sm">
                  <Baby className="mx-auto text-[#8D6E63]/40" size={32} />
                  <p>لا توجد مواليد مسجلة لهذه الأم حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {offspring.map(child => (
                    <div key={child.id} className="bg-white p-4 rounded-2xl border border-[#E0D9D0] shadow-sm flex items-center justify-between hover:border-[#5D4037] transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white`} style={{ backgroundColor: child.tagColor || '#D7CCC8' }}>
                          <span>#{child.serialNumber}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#5D4037]">{child.type}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${child.gender === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                              {child.gender === 'male' ? 'ذكر' : 'أنثى'}
                            </span>
                          </div>
                          <span className="text-[9px] text-[#8D6E63] font-bold mt-1">
                            العمر: {getAnimalAgeLabel(child.birthDate, child.type, child.gender)} • الموقع: {getPenName(child.penId)}
                          </span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-gray-400 block font-bold">تاريخ الولادة</span>
                        <span className="text-[10px] font-bold text-[#5D4037]" dir="ltr">{child.birthDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
