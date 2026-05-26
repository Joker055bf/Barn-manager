import React, { useState, useMemo } from 'react';
import { X, Info, ArrowRightLeft, Baby, HeartPulse, CheckCircle2, XCircle } from 'lucide-react';
import { Sheep, Pen, ActivityEntry } from '../types';

interface AnimalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep: Sheep;
  allSheep: Sheep[];
  pens: Pen[];
  activityLog?: ActivityEntry[];
}


export const AnimalProfileModal: React.FC<AnimalProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-4">الملف الشخصي للحيوان</h2>
        <p className="text-gray-500 mb-6">هذا المكون غير مستخدم حالياً في النسخة الحالية.</p>
        <button onClick={onClose} className="w-full bg-[#795548] text-white py-3 rounded-2xl">إغلاق</button>
      </div>
    </div>
  );
};

/* SCRAMBLED CONTENT START
export const AnimalProfileModal: React.FC<AnimalProfileModalProps> = ({
  isOpen,
  onClose,
  sheep,
  allSheep,
  pens,
  activityLog = []
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'movements' | 'births'>('basic');

  // Helpers
  const getPenName = (penId: string) => {
    const pen = pens.find(p => p.id === penId);
    return pen ? pen.name : 'غير محدد';
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

  const getAgeString = (birthDate: string) => {
    if (!birthDate) return 'غير محدد';
    const months = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return 'أقل من شهر';
    if (months < 12) return `${months} شهر`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return `${years} سنة${remMonths > 0 ? ` و ${remMonths} شهر` : ''}`;
  };

  // Movements from log
  const movements = useMemo(() => {
    return activityLog.filter(log =>
      (log.action === 'نقل حيوان' || log.action === 'تحريك حيوان' || log.action === 'نقل جماعي') &&
      log.detail.includes(`#${sheep.serialNumber}`)
    ).map(log => {
      // Try to extract 
<truncated 15801 bytes>
import { Sheep, Pen } from '../types';

interface AnimalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep: Sheep;
  allSheep: Sheep[];
  pens: Pen[];
  currentUser: any;
  activityLog?: any[];
  language?: 'ar' | 'en';
  onShowAlert: (type: 'success' | 'error', msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative w-full max-w-5xl bg-[#fcfbf4] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50">
             <h2 className="text-xl sm:text-2xl font-black text-[#3E2723] dark:text-gray-100">Animal Profile</h2>
             <button onClick={onClose} className="p-2 bg-gray-100 text-gray-500 rounded-full"><X size={20}/></button>
          </div>
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
             <div className="text-center p-8">
               <p className="text-gray-500 font-bold">Profile details are currently unavailable.</p>
             </div>
          </div>
       </div>
    </div>
  );
};











  const [birthLitterType, setBirthLitterType] = useState<'single' | 'twin' | 'triplet'>('single');
  const [newborns, setNewborns] = useState<Array<{ serialNumber: string; gender: 'male' | 'female'; tagColor: string }>>([
    { serialNumber: '', gender: 'female', tagColor: '#EC4899' }
  ]);

  // Abortion Action States
        fullText: log.detail
      };
    });
  }, [activityLog, sheep.serialNumber]);

  // Births (Children)
  const children = useMemo(() => {
    return allSheep
      .filter(s => s.motherId === sheep.serialNumber)
      .sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime());
  }, [allSheep, sheep.serialNumber]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-[#3E2723] to-[#795548] p-6 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center text-2xl font-black shadow-inner">
                #{sheep.serialNumber}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter">{sheep.type}</h2>
    ar: {
      profileTitle: 'الملف الشامل للحيوان',
      basicTab: 'ملخص الحالة',
      timelineTab: 'المسار الزمني',
      productionTab: 'سجل الإنتاج',
      serialNumber: 'رقم السارية',
      breed: 'النوع',
      gender: 'الجنس',
      age: 'العمر الدقيق',
      tagColor: 'لون القيد',
      nickname: 'اللقب',
      notes: 'الملاحظات',
      noNotes: 'لا توجد ملاحظات مسجلة لهذا الحيوان.',
      healthStatus: 'الحالة الصحية',
      healthy: 'سليم',
    1.  **غير مضرع (اللون الكهرماني/الأصفر):** يظهر عندما تكون الشاة فارغة. عند الضغط عليه، يتحول لون الزر فوراً إلى **اللون الأحمر النبضي** وتتغير حالتها إلى **"مضرع" (حامل)** لمدة أقصاها 5 أشهر (150 يوماً).
    2.  **تنبيه تجاوز الحمل (اللون الأحمر المتحرك):** في حال تجاوزت مدة الحمل 5 أشهر دون تسجيل ولادة، يتحول الزر تلقائياً إلى حالة تنبيهية نابضة (`animate-bounce`) ويظهر **بانر تنبيهي أحمر صارخ** يعلم المربي: *"تنبيه: تجاوزت هذه الشاة مدة الحمل القصوى (5 أشهر)!"*
    3.  **مضرع -> أم (تسجيل الولادة):** عند نقر المربي على زر "مضرع" الأحمر، يسأله النظام عما إذا كانت قد ولدت، وبمجرد التأكيد، تتحول حالتها تلقائياً إلى **"أم مرضعة"** (باللون الوردي الأنيق) ويبدأ الموقت التنازلي التلقائي لـ 3 أشهر (90 يوماً).
    4.  **الفطام الآلي بعد 3 أشهر:** تم دمج **نظام فحص ذكي بالخلفية (`checkAutomaticWeaning`)** في التطبيق يعمل تلقائياً وبمجرد تجاوز 3 أشهر على الولادة، يقوم النظام ذاتياً بإرجاع حالة الشاة إلى **"غير مضرع"** ويقوم بتوثيق الفطام في السجلات دون تدخل بشري! كما يمكن إتمام الفطام يدوياً مبكراً بالضغط على زر "أم مرضعة".

      matingBtn: 'تسجيل تلقيح',
      birthBtn: 'تسجيل ولادة',
      abortBtn: 'إلغاء الحمل / إجهاض',
      completeWeaning: 'إتمام الفطام يدوياً',
      matingDate: 'تاريخ التلقيح',
      sireId: 'رقم الفحل',
      expectedBirthDate: 'تاريخ الولادة المتوقع',
      daysLeft: 'يوم متبقي',
      daysAgo: 'يوم مضى',
          >
            <ArrowRightLeft size={16} />
            التنقلات
          </button>
          {sheep.gender === 'female' && (
            <button
              onClick={() => setActiveTab('births')}
              className={`flex items-center gap-2 px-5 py-3 font-black text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === 'births' ? 'border-[#795548] text-[#795548] dark:border-orange-400 dark:text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500'}`}
            >
              <Baby size={16} />
              الولادات
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
          
          {/* 1. General Info */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">النوع</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{sheep.type}</span>
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
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">اللون</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(sheep.tagColor || sheep.color) && (
                      <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: sheep.tagColor || sheep.color }}></div>
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{sheep.color || ''}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-slate-800" />

              <div className="space-y-4">
                <h3 className="font-black text-sm text-gray-800 flex items-center gap-2 dark:text-white">
                  <HeartPulse size={16} className="text-rose-500" />
                  الحالة الصحية والإنجابية
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${sheep.healthStatus === 'sick' ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400'}`}>
                    {sheep.healthStatus === 'sick' ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">الحالة الصحية</span>
                      <span className="text-sm font-bold">{sheep.healthStatus === 'sick' ? 'مريض' : 'سليم'}</span>
                    </div>
                  </div>

                  {sheep.gender === 'female' && (
                    <div className="p-4 rounded-2xl border bg-purple-50 border-purple-100 text-purple-700 flex items-center gap-3 dark:bg-purple-900/20 dark:border-purple-800/30 dark:text-purple-400">
                      <Baby size={24} />
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">حالة الإنجاب</span>
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

          {/* 2. Movements */}
          {activeTab === 'movements' && (
            <div className="space-y-4 animate-fade-in">
              {movements.length > 0 ? (
                <div className="relative pl-4 border-l-2 border-gray-100 dark:border-slate-800 mr-2 space-y-6">
                  {movements.map((move, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -right-[25px] w-4 h-4 rounded-full bg-white border-4 border-orange-200 dark:bg-slate-900 dark:border-orange-900/50" />
                      <div className="bg-gray-50 p-4 rounded-2xl dark:bg-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-gray-400">{move.date} - {move.time}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                          <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 text-center dark:bg-slate-900 dark:border-slate-700">
                            <span className="block text-[10px] text-gray-400 mb-1">من</span>
                            {move.from}
                          </div>
                          <ArrowRightLeft size={16} cla
      offsprings: 'Offsprings',
      viewProfile: 'View Profile',
      matingLogTitle: 'Record New Mating',
      abortionLogTitle: 'Abort Mating / Emergency',
      abortionReason: 'Abortion Reason / Notes',
      permissionError: 'You do not have permission to execute this action.',
      autoWeaningSuccess: 'Sheep lactation weaning completed automatically.'
    }
  }[language];

  // Helper: Detailed Age
  const calculateDetailedAge = (dateStr: string) => {
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



















                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <span>ولادة: {child.birthDate}</span>
                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <span>ولادة: {child.birthDate}</span>
                            {child.tagColor && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.tagColor }}></div>
                                  <span>{child.tagColor}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المكان الحالي</span>
                        <span className="text-xs font-bold text-[#795548] bg-orange-50 px-2 py-1 rounded-lg dark:bg-orange-900/20 dark:text-orange-300">
                          {getPenName(child.penId)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <Baby size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">لم يتم تسجيل أي مواليد لهذه الأنثى</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};



































































            reproductionHistory: updatedHistory
          }));

          if (onActivityLogged) {
            onActivityLogged(
              language === 'ar' ? 'إجراء فطام يدوي' : 'Manual Weaning',
              language === 'ar' 
                ? `تم إتمام فطام الشاة #${sheep.serialNumber} يدوياً وإرجاعها لحالة غير مضرع` 
                : `Ewe #${sheep.serialNumber} has been manually weaned and set back to empty`
            );
          }
          onShowAlert('success', language === 'ar' ? 'تم الفطام' : 'Weaned', language === 'ar' ? 'تم إنهاء فترة الرضاعة بنجاح.' : 'Lactation finished successfully.');
        } catch (e) {
          console.error(e);
          onShowAlert('error', 'خطأ', 'فشل في تحديث البيانات.');
        }
      }
    );
  };

  // Action: Save Mating
  const handleSaveMating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onShowAlert('error', 'خطأ', loc.permissionError);
      return;
    }
    if (!matingSireId.trim()) {
      onShowAlert('error', 'حقل مطلوب', language === 'ar' ? 'يرجى إدخال أو اختيار رقم الفحل' : 'Please input sire ID');
      return;
    }

    if (!ownerId) return;
    try {
      const expectedBirth = new Date(matingDate);
      expectedBirth.setDate(expectedBirth.getDate() + 150);




























































































































































































































































































    } catch (e) {
      console.error(e);
      onShowAlert('error', 'خطأ', 'فشل في حفظ بيانات الولادة.');
    }
  };

  // Compile timeline events
  const getTimelineEvents = () => {
    const events: Array<{ id: string; date: string; type: string; title: string; detail: string; color: string }> = [];

    // 1. Add Reproduction Events
    if (sheep.reproductionHistory) {
      sheep.reproductionHistory.forEach((h: any) => {
        let typeStr = h.type;
        let title = '';
        let color = 'bg-[#6366f1] text-[#6366f1]'; // default indigo
        if (h.type === 'mating') {
          title = language === 'ar' ? 'تلقيح وإخصاب' : 'Mating';
          color = 'bg-blue-500 text-blue-500';
        } else if (h.type === 'birth') {
          title = language === 'ar' ? 'ولادة وإنتاج' : 'Birth Delivery';
          color = 'bg-emerald-500 text-emerald-500';
        } else if (h.type === 'abortion') {
          title = language === 'ar' ? 'حالة إجهاض' : 'Abortion / Emergency';
          color = 'bg-red-500 text-red-500';
        } else if (h.type === 'weaning') {
          title = language === 'ar' ? 'إتمام الفطام' : 'Weaning Completed';
          color = 'bg-purple-500 text-purple-500';
        }

        events.push({
          id: h.id || generateId(),
          date: h.date,
          type: typeStr,
      






















        });
      });
    }

    // 3. Add Transfer Events from global activityLog
    activityLog.forEach((log: any) => {
      const isRelated = log.detail?.includes(`#${sheep.serialNumber}`) || log.action?.includes(`#${sheep.serialNumber}`);
      const isMove = log.action?.includes('نقل') || log.action?.includes('نقل جماعي') || log.action?.includes('Move');
      if (isRelated && isMove) {
        events.push({
          id: log.id,
          date: log.timestamp?.split('T')[0] || '',
          type: 'transfer',
          title: language === 'ar' ? 'نقل الحظيرة' : 'Barn Transfer',
          detail: log.detail,
          color: 'bg-amber-500 text-amber-500'
        });
      }
    });

    // Sort newest to oldest
    return events.sort((a, b) => b.date.localeCompare(a.date));
  };

  // Compile Production statistics (for females only)
  const getProductionStats = () => {
    if (sheep.gender !== 'female') return { count: 0, averageLitter: 0, history: [], stars: 0, label: '' };
    
    const births = (sheep.reproductionHistory || []).filter((h: any) => h.type === 'birth');
    let totalKids = 0;
    
    births.forEach((b: any) => {
      if (b.offspringSerials) {
        totalKids += b.offspringSerials.length;
      } else if (b.details.includes('توأم') || b.details.includes('twin')) {
        totalKids += 2;
      } else if (b.details.includes('ثلاثة') || b.details.includes('triplet')) {
        totalKids += 3;
      } else {
        totalKids += 1;
      }
    });

    const averageLitter = births.length > 0 ? Number((totalKids / births.length).toFixed(1)) : 0;
    
    // Quality Index logic
    let stars = 0;
    let label = loc.newProducer;

    if (births.length > 0) {
      if (averageLitter >= 2.0) {
        stars = 5;
        label = loc.excellent;
      } else if (averageLitter >= 1.5) {
        stars = 4;
        label = loc.veryGood;
      } else if (averageLitter >= 1.0) {
        stars = 3;
        label = loc.good;
      } else {
        stars = 2;
        label = loc.average;
      }
    }

    return {
      count: births.length,
      averageLitter,
      totalKids,
      history: births,
      stars,
      label
    };
  };

  const timelineEvents = getTimelineEvents();
  const prodStats = getProductionStats();
  const gestation = getGestationStats();
  const weaning = getWeaningStats();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[#fcfbf4] w-full max-w-2xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative dark:bg-slate-950 border border-white/20">
        
        {/* Header Section */}
        <div className="p-6 pb-4 flex justify-between items-center bg-white border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800">
          <button 
            onClick={onClose} 
            className="p-2.5 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition active:scale-95 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-red-950/20"
          >
            <X size={20} />
          </button>
          
          <h2 className="text-xl md:text-2xl font-black text-[#3E2723] flex items-center gap-3 dark:text-gray-100">
            {loc.profileTitle}
            <Sparkles className="text-orange-500 animate-pulse" size={24} />
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-gray-50 border-b border-gray-100 dark:bg-slate-900/50 dark:border-slate-800/80 p-2 gap-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'basic' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <Dna size={16} />
            {loc.basicTab}
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'timeline' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <ArrowRightLeft size={16} />
            {loc.timelineTab}
            {timelineEvents.length > 0 && (
              <span className="bg-[#795548]/10 text-[#795548] px-2 py-0.5 rounded-full text-[10px] font-black dark:bg-white/10 dark:text-white">
                {timelineEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`flex-1 py-3 text-xs md:text-sm font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'production' 
                ? 'bg-[#795548] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100 hover:text-[#795548] dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <Award size={16} />
            {sheep.gender === 'female' ? loc.productionTab : (language === 'ar' ? 'سجل النسل والنتاج' : 'Offspring & Lineage')}
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white dark:bg-slate-900">
          
          {/* TAB 1: BASIC INFORMATION & BREEDING */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-orange-50/50 to-orange-100/10 border border-orange-100/50 rounded-3xl p-6 dark:from-slate-850 dark:to-slate-850/20 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div 

























































































                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-pink-500 uppercase tracking-wider block">{loc.motherLabel}</span>
                            <span className="font-black text-sm text-gray-800 dark:text-gray-100">#{m ? m.serialNumber : sheep.motherId}</span>
                          </div>
                        </div>
                      );
                    })()}
                    {sheep.fatherId && (() => {
                      const f = allSheep.find(s => s.id === sheep.fatherId || s.serialNumber === sheep.fatherId);
                      return (
                        <div 
                          onClick={() => f && onNavigateToSheep && onNavigateToSheep(f)}
                          className={`flex-1 flex items-center gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 ${f && onNavigateToSheep ? 'cursor-pointer hover:border-blue-300' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white shadow-sm" style={{ backgroundColor: f?.tagColor || '#3B82F6' }} />
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wider block">{loc.fatherLabel}</span>
                            <span className="font-black text-sm text-gray-800 dark:t












                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                  <h4 className="text-lg font-black text-[#3E2723] dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={18} />
                    {loc.statusCardTitle}
                  </h4>

                  {/* Status Indicator Banner */}
                  <div className={`p-5 rounded-3xl border flex flex-col md:flex-row justify-between items-center gap-4 ${
                    sheep.reproductionStatus === 'pregnant'
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                      : sheep.reproductionStatus === 'mother'
                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40 text-blue-800 dark:text-blue-300'
                        : 'bg-gray-50 border-gray-200 dark:bg-slate-850/50 dark:border-slate-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        sheep.reproductionStatus === 'pregnant' ? 'bg-amber-100 dark:bg-amber-900/40' :
                        sheep.reproductionStatus === 'mother' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-slate-700'
                      }`}>
                        {sheep.reproductionStatus === 'pregnant' ? <Baby size={22} className="text-amber-600" /> :
                         sheep.reproductionStatus === 'mother' ? <Heart size={22} className="text-blue-600" /> :














































































































































































                          </strong>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">{language === 'ar' ? 'فترة الرضاعة' : 'Lactation Duration'}</span>
                          <span className="text-xs font-black text-blue-600 mt-1 block">
                            {weaning.daysPassed} {language === 'ar' ? 'يوم مضى' : 'days passed'}
                          </span>
                        </div>
                      </div>

                      {/* Weaning Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full h-3 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full rounded-full transition-all duration-550 bg-blue-500"
                            style={{ width: `${weaning.percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-gray-400">{loc.weaningProgress} ({weaning.percent.toFixed(0)}%)</span>
                          <span className="text-blue-500">{weaning.daysLeft} {loc.daysLeft}</span>
                        </div>
                      </div>

                      {sheep.lastBirthDate && (
                        <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-slate-800/80 pt-3 text-gray-500">
                          <span>{language === 'ar' ? 'تاريخ الولادة:' : 'Birth Date:'} <strong>{sheep.lastBirthDate}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BIRTH REGISTRATION FORM (INLINE) */}
                  {showBirthForm && (
                    <form onSubmit={handleSaveBirth} className="bg-gray-50 dark:bg-slate-850 p-5 rounded-3xl border border-gray-100 dark:border-slate-800/80 space-y-4 mt-4 animate-slide-up max-h-[50vh] overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-center">
                        <h5 className="font-black text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Baby size={16} />
                          {language === 'ar' ? 'تسجيل مواليد جدد' : 'Register Delivery / Birth'}
                        </h5>
                        <button type="button" onClick={() => setShowBirthForm(false)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                          <X size={16} />
                        </button>
                      </div>

                      {/* Mating Context */}
               








                          <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">{loc.weaningDate}</span>
                          <strong className="text-sm font-black text-gray-800 dark:text-gray-100 mt-1 block">
                            {sheep.weaningDate}
                          </strong>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">{language === 'ar' ? 'فترة الرضاعة' : 'Lactation Duration'}</span>
                          <span className="text-xs font-black text-blue-600 mt-1 block">
                            {weaning.daysPassed} {language === 'ar' ? 'يوم مضى' : 'days passed'}
                          </span>
                        </div>
                      </div>

                      {/* Weaning Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full h-3 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full rounded-full transition-all duration-550 bg-blue-500"
                            style={{ width: `${weaning.percent}%` }}
                          />
                        </div>
                        <div className="flex justify-bet























                                  type="text"
                                  value={n.serialNumber}
                                  onChange={(e) => {
                                    const updated = [...newborns];
                                    updated[index].serialNumber = e.target.value;
                                    setNewborns(updated);
                                  }}
                                  placeholder="001"
                                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-[#795548] outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] font-black text-gray-400 mb-1">{loc.gender}</label>
                                <div className="flex bg-gray-50 dark:bg-slate-800 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newborns];
                                      updated[index].gender = 'female';
                                      updated[index].tagColor = '#EC4899';
                                      setNewborns(updated);
                                    }}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded ${
                                      n.gender === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500'
                                    }`}
                                  >
                                    {loc.female}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newborns];
                                      updated[index].gender = 'male';
                                      updated[index].tagColor = '#3B82F6';
                                      setNewborns(updated);
                                    }}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded ${
                                      n.gender === 'male' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'
                                    }`}
                                  >
                                    {loc.male}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9px] font-black text-gray-400 mb-1">{loc.tagColor}</label>
                                <div className="flex gap-1.5 items-center mt-1">
                                  {['#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map(color 










                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 transition mt-4"
                      >
                        {loc.saveBirth}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIFIED CHRONOLOGICAL TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-fade-in">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center opacity-40">
                  <ArrowRightLeft className="text-gray-400 mb-3" size={48} />
                  <p className="text-gray-500 font-bold text-sm">{loc.noTimeline}</p>
                </div>
              ) : (
                <div className="relative pr-6 pl-2 border-r-2 border-gray-100 dark:border-slate-800 space-y-6">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative group">
























                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 transition mt-4"
                      >
                        {loc.saveBirth}
                      </button>
                    </form>
                  )}
              )}

              {/* Bottom Quick Action Controls */}
              <div className="flex gap-2 w-full mt-6 border-t border-gray-100 dark:border-slate-800/80 pt-4">
                <button
                  onClick={handleToggleHealth}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black transition premium-shadow ${
                    sheep.status === 'sick' 
                      ? 'text-white bg-red-500 hover:bg-red-600 animate-pulse animate-duration-1000' 
                      : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                  }`}
                >
                  <Activity size={18} />
                </button>

                {currentUser && (isOwner || currentUser.permissions?.canAddMedical) && onVaccinateSheep && (
                  <button 
                    onClick={() => { onClose(); onVaccinateSheep(sheep); }} 
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 transition premium-shadow dark:bg-purple-900/20 dark:text-purple-300"
                  >
                    <Syringe size={18} />
                    {language === 'ar' ? 'تحصين / علاج' : 'Vaccinate'}
                  </button>
                )}

                {currentUser && (isOwner || currentUser.permissions?.canMoveAnimals) && onMoveSheep && (
                  <button 
                    onClick={() => { onClose(); onMoveSheep(sheep); }} 
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black text-orange-700 bg-orange-50 hover:bg-orange-100 transition premium-shadow dark:bg-orange-900/20 dark:text-orange-300"
                  >
                    <ArrowRightLeft size={18} />
                    {language === 'ar' ? 'نقل القسم' : 'Move Section'}
                  </button>
                )}

                {currentUser && (isOwner || currentUser.permissions?.canEditAnimals) && onEditSheep && (
                  <button 
                    onClick={() => { onClose(); onEditSheep(sheep); }} 
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 transition premium-shadow dark:bg-blue-900/20 dark:text-blue-300"
                  >
                    <Edit size={18} />
                    {language === 'ar' ? 'تعديل البيانات' : 'Edit Info'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED C          {/* TAB 3: PRODUCTION & PEDIGREE RECORDS */}
          {activeTab === 'production' && (
            <div className="space-y-6 animate-fade-in">
              {sheep.gender === 'female' ? (
                <>
                  {/* Product Statistics Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-3xl text-center dark:bg-emerald-950/10 dark:border-emerald-900/20">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">{loc.birthCountLabel}</span>
                      <strong className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2 block">{prodStats.count}</strong>
                    </div>
                    <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-3xl text-center dark:bg-blue-950/10 dark:border-blue-900/20">
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block">{language === 'ar' ? 'إجمالي النتاج' : 'Total Kids'}</span>
                      <strong className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-2 block">{prodStats.totalKids}</strong>
                    </div>
                    <div className="bg-purple-50/30 border border-purple-100/50 p-4 rounded-3xl text-
                        event.type === 'birth' ? 'bg-emerald-500' :
                        event.type === 'abortion' ? 'bg-red-500' :
                        event.type === 'weaning' ? 'bg-purple-500' :
                        event.type === 'medical' ? 'bg-indigo-500' : 'bg-amber-500'
                      }`} />

                      {/* Event Details Card */}
                    <div>
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">{loc.qualityIndex}</span>
                      <strong className="text-base font-black text-gray-800 dark:text-gray-100 mt-1.5 block">{prodStats.label}</strong>
                    </div>
                    <div className="flex gap-1">
                      {prodStats.count > 0 ? (
                        Array.from({ length: 5 }, (_, i) => (
                          <Star 
                            key={i} 
                            size={18} 
                            className={i < prodStats.stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700'} 
                          />
                        ))
                      ) : (
                        <Award size={28} className="text-gray-300" />
                      )}
                    </div>
                  </div>

                  {/* Deliveries Timeline List */}
                  <div className="space-y-4">
                    <h5 className="font-black text-sm text-[#3E2723] dark:text-white uppercase tracking-widest">{language === 'ar' ? 'سجل الولادات السابقة' : 'Past Deliveries History'}</h5>

                    {prodStats.history.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-gray-200 rounded-3xl opacity-40">
                        <p className="text-xs text-gray-400 font-bold">{loc.noProduction}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {prodStats.history.map((birth: any, i) => {
                          return (
                            <div key={birth.id || i} className="bg-gray-50 dark:bg-slate-850/30 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                              <div>
                                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">{loc.deliveryDate}</span>
                                <strong className="text-sm font-black text-gray-800 dark:text-gray-100 mt-1 block">{birth.date}</strong>
                              </div>

                              <div classN
              {/* Quality Rating Index Card */}
              <div className="bg-gradient-to-r from-orange-50/50 to-orange-100/10 border border-orange-100/30 p-5 rounded-3xl dark:from-slate-850 dark:to-slate-850/20 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block">{loc.qualityIndex}</span>
                  <strong className="text-base font-black text-gray-800 dark:text-gray-100 mt-1.5 block">{prodStats.label}</strong>
                </div>
                <div className="flex gap-1">
                  {prodStats.count > 0 ? (
                    Array.from({ length: 5 }, (_, i) => (
                      <Star 
                                <div className="flex flex-wrap gap-1.5 items-center justify-end">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block w-full text-right md:w-auto md:text-left mr-2">
                                    {loc.offsprings}:
                                  </span>
                                  {birth.offspringSerials.map((serial: string) => {
                                    const foundKid = allSheep.find(s => s.serialNumber === serial && s.status !== 'dead');
                                    return (
                                      <button
                                        key={serial}
                                        type="button"
                                        onClick={() => foundKid && onNavigateToSheep && onNavigateToSheep(foundKid)}
                                        disabled={!foundKid || !onNavigateToSheep}
                                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                                          foundKid && onNavigateToSheep
                                            ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'
                                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700'
                                        }`}
                                      >
                                        #{serial}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                (() => {
                  const sireOffspring = allSheep.filter(s => s.fatherId === sheep.id || s.fatherId === sheep.serialNumber);
                  const deliveriesMap = sireOffspring.reduce((acc: any, child) => {
                    const key = `${child.birthDate}_${child.motherId || 'unknown'}`;
                    if (!acc[key]) {
                      acc[key] = {
                        date: child.birthDate,
                        motherId: child.motherId,
                        kids: []
                      };
                    }
                    acc[key].kids.push(child);
                    return acc;
                  }, {});
                  const sireDeliveries = Object.values(deliveriesMap).sort((a: any, b: any) => b.date.localeCompare(a.date)) as any[];
                  const sireTotalKids = sireOffspring.length;
                  const sireDeliveriesCount = sireDeliveries.length;
                  const sireAverageL
                                    type="button"
                                    onClick={() => foundKid && onNavigateToSheep && onNavigateToSheep(foundKid)}
                                    disabled={!foundKid || !onNavigateToSheep}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                                      foundKid && onNavigateToSheep
                                        ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'
                                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700'
                                    }`}
                                  >
                                    #{serial}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};


































































                                      }`}
                                    >
                                      #{foundMother ? foundMother.serialNumber : del.motherId || 'غير معروف'}
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 items-center justify-end">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block w-full text-right md:w-auto md:text-left mr-2">
                                      {language === 'ar' ? 'المواليد:' : 'Offsprings:'}
                                    </span>
                                    {del.kids.map((kid: Sheep) => (
                                      <button
                                        key={kid.id}
                                        type="button"
                                        onClick={() => onNavigateToSheep && onNavigateToSheep(kid)}
                                        disabled={!onNavigateToSheep}
                                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg border bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 transition`}
                                      >
                                        #{kid.serialNumber} ({kid.gender === 'male' ? (language === 'ar' ? 'ذكر' : 'M') : (language === 'ar' ? 'أنثى' : 'F')})
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}                      {birth.offspringSerials 
                                ? (birth.offspringSerials.length === 1 ? loc.single : birth.offspringSerials.length === 2 ? loc.twin : `${birth.offspringSerials.length} ${language === 'ar' ? 'توائم' : 'Kids'}`)
    
                            </span>
                          </div>

                          {/* Offspring quick profile link tags */}
                          {birth.offspringSerials && birth.offspringSerials.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center justify-end">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block w-full text-right md:w-auto md:text-left mr-2">
                                {loc.offsprings}:
                              </span>
                              {birth.offspringSerials.map((serial: string) => {
                                const foundKid = allSheep.find(s => s.serialNumber === serial && s.status !== 'dead');
                                return (
                                  <button
                                    key={serial}
                                    type="button"
                                    onClick={() => foundKid && onNavigateToSheep && onNavigateToSheep(foundKid)}
                                    disabled={!foundKid || !onNavigateToSheep}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition ${
                                      foundKid && onNavigateToSheep
                                        ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30'
                                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700'
                                    }`}
                                  >
                                    #{serial}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
*/
