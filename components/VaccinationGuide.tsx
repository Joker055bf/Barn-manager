import React, { useState, useMemo } from 'react';
import { ShieldCheck, Info, Syringe, Search, Calendar, FileText, BookOpen, Activity } from 'lucide-react';
import { Sheep } from '../types';
import { getAnimalMetadata } from '../utils/animalHelpers';
import { translations } from '../constants/translations';

interface VaccinationGuideProps {
  sheepList?: Sheep[];
  animalType?: string;
  language?: 'ar' | 'en';
}

export const VaccinationGuide: React.FC<VaccinationGuideProps> = ({ sheepList = [], animalType = 'sheep', language = 'ar' }) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'log' | 'guide'>('log');
  const [searchTerm, setSearchTerm] = useState('');
  const metadata = getAnimalMetadata(animalType);
  const vaccines = metadata.vaccines;

  // Flatten and filter medical records
  const medicalHistory = useMemo(() => {
    return sheepList.flatMap(s =>
      (s.medicalRecords || [])
        .map(r => ({
          recordId: r.id,
          sheepId: s.id,
          serialNumber: s.serialNumber,
          sheepType: s.type,
          type: r.type, // vaccine, treatment, checkup
          name: r.name,
          date: r.date,
          notes: r.notes
        }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sheepList]);

  const filteredHistory = medicalHistory.filter(item =>
    item.serialNumber.includes(searchTerm) ||
    item.name.includes(searchTerm)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-6">
      {/* Tab Switcher */}
      <div className="flex bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-1.5 dark:bg-slate-900/50 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all duration-300 font-black text-sm uppercase tracking-wider ${activeTab === 'log' ? 'bg-purple-600 text-white shadow-xl premium-shadow' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          <FileText size={18} />
          {language === 'en' ? 'Operation Log' : 'سجل العمليات'} ({medicalHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all duration-300 font-black text-sm uppercase tracking-wider ${activeTab === 'guide' ? 'bg-purple-600 text-white shadow-xl premium-shadow' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
          <BookOpen size={18} />
          {language === 'en' ? 'Vaccination Guide' : 'دليل التحصين'}
        </button>
      </div>

      {activeTab === 'guide' && (
        <div className="glass-effect rounded-[2.5rem] shadow-2xl border border-gray-100/50 overflow-hidden animate-scale-in dark:border-slate-800 dark:bg-slate-900/60">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white relative overflow-hidden flex flex-col items-center text-center">
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-2xl font-black flex items-center gap-3 tracking-tighter justify-center">
                <ShieldCheck className="w-10 h-10" />
                دليل التطعيمات
              </h2>
              <p className="text-purple-100 mt-3 text-sm font-bold opacity-90 max-w-xs">الجدول الاسترشادي للتحصينات الدورية للأغنام والماعز</p>
            </div>
            <Syringe className="absolute -right-8 -bottom-8 w-40 h-40 text-white/10 rotate-12" />
          </div>

          <div className="p-4 sm:p-8">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh] rounded-2xl border border-gray-50 dark:border-slate-800">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-purple-50/50 text-purple-900 border-b border-purple-100/30 dark:bg-purple-900/10 dark:text-purple-300 dark:border-purple-800/30">
                    <th className="p-3 font-black text-[10px] uppercase tracking-widest whitespace-nowrap text-center">المرض / اللقاح</th>
                    <th className="p-3 font-black text-[10px] uppercase tracking-widest whitespace-nowrap text-center">العمر</th>
                    <th className="p-3 font-black text-[10px] uppercase tracking-widest whitespace-nowrap text-center">التكرار</th>
                    <th className="p-3 font-black text-[10px] uppercase tracking-widest text-center">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  {vaccines.map((v, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition dark:border-slate-800/50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-black text-xs text-gray-900 dark:text-gray-100">
                        <div className="flex flex-col items-center gap-2 text-center">
                           <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                             <Syringe size={14} />
                           </div>
                           {v.name}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-xs text-center">{v.age}</td>
                      <td className="p-3 text-xs text-center">
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase dark:bg-indigo-900/20 dark:text-indigo-300">
                          {v.frequency}
                        </span>
                      </td>
                      <td className="p-3 text-[9px] text-gray-500 leading-relaxed dark:text-gray-400 text-center">
                        {v.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div className="glass-effect rounded-[2.5rem] shadow-2xl border border-gray-100/50 overflow-hidden dark:bg-slate-900/60 dark:border-slate-800">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 tracking-tighter">
                <FileText className="text-purple-600 w-6 h-6" />
                سجل العمليات
              </h2>
              <p className="text-gray-500 text-[10px] mt-0.5 font-bold opacity-70">توثيق كامل للعمليات الطبية</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="بحث برقم الرأس أو نوع الإجراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="p-0">
            {medicalHistory.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-purple-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 dark:bg-purple-900/20">
                  <Activity className="text-purple-300 w-10 h-10" />
                </div>
                <p className="text-gray-800 font-black text-xl dark:text-gray-200">لا يوجد سجلات حتى الآن</p>
                <p className="text-sm text-gray-400 mt-2 font-bold">ابدأ بإضافة تحصين أو علاج من بطاقة الحيوان</p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/30 text-gray-400">
                      <th className="p-3 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">رقم الرأس</th>
                      <th className="p-3 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">الإجراء</th>
                      <th className="p-3 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">الاسم</th>
                      <th className="p-3 font-black text-[9px] uppercase tracking-widest whitespace-nowrap">التاريخ</th>
                      <th className="p-3 font-black text-[9px] uppercase tracking-widest">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map((record) => (
                        <tr key={record.recordId} className="hover:bg-gray-50/50 transition dark:hover:bg-slate-800/20">
                          <td className="p-3">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                               <span className="font-black text-gray-900 dark:text-gray-100 text-sm">{record.serialNumber}</span>
                             </div>
                          </td>
                          <td className="p-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${record.type === 'vaccine' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                              record.type === 'treatment' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                              }`}>
                              {record.type === 'vaccine' ? (language === 'en' ? 'Vaccine' : 'تحصين') : (record.type === 'treatment' ? (language === 'en' ? 'Treatment' : 'علاج') : (language === 'en' ? 'Checkup' : 'فحص'))}
                            </span>
                          </td>
                          <td className="p-3 font-black text-xs text-gray-800 dark:text-gray-200">
                            {record.name}
                          </td>
                          <td className="p-5 text-gray-500 text-xs font-bold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                               <Calendar size={12} />
                               {record.date}
                            </div>
                          </td>
                          <td className="p-5 text-gray-400 text-xs font-medium max-w-sm">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">
                          عذراً، لم نجد نتائج تطابق بحثك...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};