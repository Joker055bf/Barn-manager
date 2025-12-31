import React, { useState, useMemo } from 'react';
import { ShieldCheck, Info, Syringe, Search, Calendar, FileText, BookOpen, Activity } from 'lucide-react';
import { Sheep } from '../types';
import { getAnimalMetadata } from '../utils/animalHelpers';

interface VaccinationGuideProps {
  sheepList?: Sheep[];
  animalType?: string;
}

export const VaccinationGuide: React.FC<VaccinationGuideProps> = ({ sheepList = [], animalType = 'sheep' }) => {
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
    <div className="space-y-6 animate-fade-in">

      {/* Tab Switcher */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition font-bold ${activeTab === 'log' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText size={20} />
          سجل العمليات ({medicalHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition font-bold ${activeTab === 'guide' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <BookOpen size={20} />
          دليل التطعيمات
        </button>
      </div>

      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
          <div className="bg-purple-600 p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-8 h-8" />
              دليل التطعيمات الأساسية
            </h2>
            <p className="text-purple-100 mt-1 text-sm">جدول استرشادي لأهم التحصينات الدورية {metadata.label.plural === 'أغنام' ? 'للأغنام' : `لـ ${metadata.label.plural}`}</p>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-purple-50 text-purple-800">
                    <th className="p-4 rounded-r-xl font-bold whitespace-nowrap">المرض / اللقاح</th>
                    <th className="p-4 font-bold whitespace-nowrap">العمر المناسب</th>
                    <th className="p-4 font-bold whitespace-nowrap">التكرار</th>
                    <th className="p-4 rounded-l-xl font-bold min-w-[200px]">ملاحظات هامة</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {vaccines.map((v, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4 font-bold flex items-center gap-2">
                        <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600">
                          <Syringe size={16} />
                        </div>
                        {v.name}
                      </td>
                      <td className="p-4">{v.age}</td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                          {v.frequency}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500 flex items-start gap-1">
                        <Info size={14} className="mt-0.5 flex-shrink-0" />
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-purple-600" />
                سجل العمليات المنفذة
              </h2>
              <p className="text-gray-500 text-sm mt-1">قائمة بجميع التطعيمات والعلاجات المسجلة {metadata.label.plural === 'أغنام' ? 'للأغنام' : `لـ ${metadata.label.plural}`}</p>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="بحث برقم الرأس أو الاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="p-0">
            {medicalHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="text-purple-300 w-8 h-8" />
                </div>
                <p className="text-gray-400 font-medium">لم يتم تسجيل أي عمليات حتى الآن</p>
                <p className="text-xs text-gray-300 mt-1">أضف تطعيم أو علاج من صفحة {metadata.label.plural}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-semibold">رقم الرأس</th>
                      <th className="p-4 font-semibold">النوع</th>
                      <th className="p-4 font-semibold">الإجراء</th>
                      <th className="p-4 font-semibold">الاسم</th>
                      <th className="p-4 font-semibold">التاريخ</th>
                      <th className="p-4 font-semibold">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map((record) => (
                        <tr key={record.recordId} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 font-bold text-gray-800">#{record.serialNumber}</td>
                          <td className="p-4 text-gray-600 text-sm">{record.sheepType}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${record.type === 'vaccine' ? 'bg-purple-100 text-purple-700' :
                              record.type === 'treatment' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                              {record.type === 'vaccine' ? 'تطعيم' : (record.type === 'treatment' ? 'علاج' : 'فحص')}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-800">
                            {record.name}
                          </td>
                          <td className="p-4 text-gray-600 text-sm flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {record.date}
                          </td>
                          <td className="p-4 text-gray-500 text-sm max-w-xs truncate">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          لا توجد نتائج تطابق بحثك
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