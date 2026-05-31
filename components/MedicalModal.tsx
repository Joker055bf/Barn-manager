import React, { useState, useEffect } from 'react';
import { X, Syringe, Plus, Calendar, Activity, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Sheep, MedicalRecord } from '../types';
import { getAnimalMetadata } from '../utils/animalHelpers';

interface MedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep?: Sheep;
  onAddRecord: (record: MedicalRecord) => void;
}

export const MedicalModal: React.FC<MedicalModalProps> = ({ isOpen, onClose, sheep, onAddRecord }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'guide'>('history');

  useEffect(() => {
    if (isOpen && sheep) {
      const records = sheep.medicalRecords || [];
      const metadata = getAnimalMetadata(sheep.type);
      const vaccines = metadata?.vaccines || [];
      const hasTaken = vaccines.some(v => 
        records.some(rec => rec.type === 'vaccine' && rec.name.toLowerCase().includes(v.name.toLowerCase()))
      );
      setActiveTab(hasTaken ? 'guide' : 'history');
    }
  }, [isOpen, sheep]);
  
  // Form State
  const [recordType, setRecordType] = useState<'vaccine' | 'treatment' | 'checkup'>('vaccine');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  if (!isOpen || !sheep) return null;

  const records = sheep.medicalRecords || [];
  const metadata = getAnimalMetadata(sheep.type);
  const vaccines = metadata?.vaccines || [];

  // Determine which recommended vaccines have been taken vs not taken
  const takenVaccines = vaccines.filter(v => 
    records.some(rec => rec.type === 'vaccine' && rec.name.toLowerCase().includes(v.name.toLowerCase()))
  );

  const untakenVaccines = vaccines.filter(v => 
    !records.some(rec => rec.type === 'vaccine' && rec.name.toLowerCase().includes(v.name.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: MedicalRecord = {
      id: crypto.randomUUID(),
      type: recordType,
      name,
      date,
      notes
    };
    onAddRecord(newRecord);
    // Reset form but keep modal open or switch to history
    setName('');
    setNotes('');
    setActiveTab('history');
  };

  const handleQuickRegister = (vaccineName: string) => {
    const newRecord: MedicalRecord = {
      id: crypto.randomUUID(),
      type: 'vaccine',
      name: vaccineName,
      date: new Date().toISOString().split('T')[0],
      notes: 'تسجيل سريع'
    };
    onAddRecord(newRecord);
    setActiveTab('history');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col" dir="rtl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-purple-50">
          <div>
            <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <Activity size={24} className="text-purple-600" />
              السجل الطبي
            </h2>
            <p className="text-sm text-purple-600 mt-1">رقم الرأس: #{sheep.serialNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 font-extrabold text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'history' 
                ? 'text-purple-600 border-purple-600 bg-purple-50/30' 
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            تاريخ التحصين ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 font-extrabold text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'guide' 
                ? 'text-purple-600 border-purple-600 bg-purple-50/30' 
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            دليل التحصين ({takenVaccines.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 font-extrabold text-xs transition border-b-2 cursor-pointer ${
              activeTab === 'add' 
                ? 'text-purple-600 border-purple-600 bg-purple-50/30' 
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            إضافة جديد
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'add' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع الإجراء</label>
                <div className="flex gap-2">
                   <button type="button" onClick={() => setRecordType('vaccine')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${recordType === 'vaccine' ? 'bg-purple-100 border-purple-500 text-purple-750' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>تطعيم</button>
                   <button type="button" onClick={() => setRecordType('treatment')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${recordType === 'treatment' ? 'bg-blue-100 border-blue-500 text-blue-750' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>علاج</button>
                   <button type="button" onClick={() => setRecordType('checkup')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${recordType === 'checkup' ? 'bg-green-100 border-green-500 text-green-750' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>فحص</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {recordType === 'vaccine' ? 'اسم اللقاح' : (recordType === 'treatment' ? 'اسم الدواء' : 'نتيجة الفحص')}
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={recordType === 'vaccine' ? 'مثال: معوي، جدري' : '...'}
                  className="w-full h-[40px] px-3 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white outline-none transition-all font-medium shadow-sm text-sm"
                />

                {recordType === 'vaccine' && vaccines.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    <span className="text-[10px] font-black text-gray-400 block">لقاحات مقترحة (اختر للتعبئة السريعة):</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {vaccines.map((v, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setName(v.name)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                            name === v.name
                              ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                              : 'bg-purple-50/50 hover:bg-purple-100 border-purple-100 text-purple-700'
                          }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">التاريخ</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white outline-none transition-all font-bold shadow-sm text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="اختياري"
                  className="w-full p-3 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm resize-none shadow-sm"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-4 rounded-xl transition shadow-lg mt-4 cursor-pointer hover:shadow-xl active:scale-95"
              >
                <Plus size={18} />
                <span>حفظ في السجل</span>
              </button>
            </form>
          ) : activeTab === 'guide' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100/50 flex items-start gap-3">
                <ShieldCheck size={20} className="text-purple-600 shrink-0 mt-0.5 animate-bounce-subtle" />
                <p className="text-[11px] font-bold text-purple-950 leading-relaxed">
                  يعرض هذا التبويب <strong>التطبيعات الفعّالة والمأخوذة</strong> لهذا الحيوان من دليل التحصين المعتمد لـ <strong>{metadata.label.plural}</strong>.
                </p>
              </div>

              <div className="space-y-2.5">
                {takenVaccines.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-gray-100 text-gray-400">
                    <Info size={36} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">لم يتم تسجيل أي تطعيم مأخوذ بعد.</p>
                    <p className="text-[10px] text-gray-300 mt-1">تظهر هنا فقط التطعيمات التي تم إعطاؤها للحيوان.</p>
                  </div>
                ) : (
                  takenVaccines.map((v, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-emerald-100 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-gray-800 text-xs flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-green-500" />
                          {v.name}
                        </h4>
                        <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>العمر المستهدف: <strong className="text-gray-700">{v.age}</strong></span>
                          <span>•</span>
                          <span>التكرار: <strong className="text-gray-700">{v.frequency || 'مرة واحدة'}</strong></span>
                        </div>
                        {v.notes && <p className="text-[9px] text-gray-400 mt-1 italic">{v.notes}</p>}
                      </div>

                      <span className="px-2.5 py-1 text-[9px] font-black bg-green-50 text-green-700 border border-green-100 rounded-lg whitespace-nowrap shrink-0">
                        ✓ تم إعطاؤه
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Recommended vaccines NOT taken (Untaken) listed in History as per user request */}
              {untakenVaccines.length > 0 && (
                <div className="space-y-3 bg-amber-50/50 p-4 rounded-[1.5rem] border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <h4 className="text-[11px] font-black text-amber-800">تطعيمات متبقية/مطلوبة (لم يتم أخذها):</h4>
                  </div>
                  <div className="space-y-2">
                    {untakenVaccines.map((v, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-3 border border-amber-100 flex items-center justify-between gap-3 shadow-sm">
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-gray-800 text-xs">{v.name}</h5>
                          <p className="text-[9px] text-gray-400">العمر المستهدف: {v.age} • التكرار: {v.frequency || 'مرة واحدة'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickRegister(v.name)}
                          className="px-2.5 py-1.5 text-[9px] font-black bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                        >
                          + تسجيل سريع
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Records History */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">سجل التطعيمات والعلاجات السابقة:</h4>
                {records.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <Syringe size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">لا توجد سجلات طبية مسجلة</p>
                  </div>
                ) : (
                  records.map((rec) => (
                    <div key={rec.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                          rec.type === 'vaccine' ? 'bg-purple-100 text-purple-600' :
                          rec.type === 'treatment' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                          {rec.type === 'vaccine' ? <Syringe size={14} /> : <Activity size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-gray-800 text-xs truncate">{rec.name}</h4>
                          <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-150 shrink-0 font-bold">
                            {rec.date ? (rec.date.includes('T') ? rec.date.split('T')[0] : rec.date) : ''}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {rec.type === 'vaccine' ? 'تطعيم' : (rec.type === 'treatment' ? 'علاج' : 'فحص دوري')}
                        </p>
                        {rec.notes && <p className="text-xs text-gray-600 mt-2 bg-white p-2.5 rounded-lg border border-gray-100/50 leading-relaxed">{rec.notes}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
