import React, { useState } from 'react';
import { X, Syringe, Plus, Calendar, Activity, Check, ShieldCheck } from 'lucide-react';
import { Sheep, MedicalRecord } from '../types';
import { getAnimalMetadata, calculateVaccineDueDate } from '../utils/animalHelpers';

interface MedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep?: Sheep;
  onAddRecord: (record: MedicalRecord) => void;
}

export const MedicalModal: React.FC<MedicalModalProps> = ({ isOpen, onClose, sheep, onAddRecord }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'guide'>('guide');
  const [name, setName] = useState('');
  const [recordType, setRecordType] = useState<'vaccine' | 'treatment' | 'checkup'>('vaccine');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const metadata = sheep ? getAnimalMetadata(sheep.type) : null;
  const vaccines = metadata?.vaccines || [];
  const records = sheep?.medicalRecords || [];

  // Helper to check if vaccine is due
  const isVaccineDue = (vaccine: { age: string, name: string }) => {
    if (!sheep) return false;

    // Parse vaccine age
    let vaccineDays = 0;
    if (vaccine.age.includes('أسبوع')) vaccineDays = (parseInt(vaccine.age) || 1) * 7;
    else if (vaccine.age.includes('شهر')) vaccineDays = (parseInt(vaccine.age) || 1) * 30;
    else if (vaccine.age.includes('سنة')) vaccineDays = (parseInt(vaccine.age) || 1) * 365;
    else if (vaccine.age.includes('يوم')) vaccineDays = parseInt(vaccine.age) || 0;

    // Calculate sheep age in days
    const birthDate = new Date(sheep.birthDate);
    const today = new Date();
    const ageInDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if taken
    const hasTaken = sheep.medicalRecords?.some(r => r.type === 'vaccine' && r.name === vaccine.name);

    return ageInDays >= vaccineDays && !hasTaken;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && date) {
      onAddRecord({
        id: crypto.randomUUID(),
        type: recordType,
        name,
        date,
        notes
      });
      // Reset fields
      setName('');
      setNotes('');
      // Close modal on success
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-purple-50">
          <div>
            <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <Activity size={24} className="text-purple-600" />
              {sheep ? 'السجل الطبي والتطعيمات' : 'تطعيم/علاج جماعي'}
            </h2>
            {sheep && <p className="text-sm text-purple-600 mt-1">رقم الرأس: #{sheep.serialNumber}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        {sheep ? (
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'guide' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              التطعيمات المطلوبة
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'history' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              السجل السابق
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'add' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            >
              إضافة جديد
            </button>
          </div>
        ) : null}

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'guide' && sheep ? (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-full text-purple-600 mt-1">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900 text-sm mb-1">سجل التطعيمات المطلوب</h3>
                  <p className="text-xs text-purple-700">قائمة بالتطعيمات الموصى بها لنوع ({sheep.type}). يمكنك تسجيل التطعيم مباشرة من هنا.</p>
                </div>
              </div>

              <div className="space-y-3">
                {vaccines.filter(v => {
                  const record = sheep.medicalRecords?.find(r => r.type === 'vaccine' && r.name === v.name);
                  if (record) return false; // Hide if taken

                  const dueDate = calculateVaccineDueDate(sheep.birthDate, v.age);
                  const today = new Date();
                  const diffTime = dueDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return diffDays <= 7; // Show if due within 7 days or overdue
                }).map((v, idx) => {
                  const record = sheep.medicalRecords?.find(r => r.type === 'vaccine' && r.name === v.name);
                  const isTaken = !!record;
                  const isDue = isVaccineDue(v);

                  const dueDate = calculateVaccineDueDate(sheep.birthDate, v.age);
                  const formattedDueDate = dueDate.toLocaleDateString('ar-SA');
                  const isOverdue = !isTaken && new Date() > dueDate;

                  return (
                    <div key={idx} className={`border rounded-xl p-4 transition-all ${isTaken ? 'bg-green-50 border-green-200' : (isDue ? 'bg-white border-red-200 shadow-sm' : 'bg-white border-gray-100')}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-base ${isTaken ? 'text-green-800' : 'text-gray-800'}`}>{v.name}</h4>
                            {isDue && !isTaken && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">مستحق الآن</span>}
                            {isTaken && <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> تم التطعيم</span>}
                          </div>

                          <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                              <Calendar size={12} className="text-gray-400" />
                              تاريخ الاستحقاق: <span className={`font-bold ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>{formattedDueDate}</span>
                            </span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                              <Activity size={12} className="text-gray-400" />
                              التكرار: {v.frequency}
                            </span>
                          </div>

                          {isTaken && record && (
                            <div className="mt-2 text-xs text-green-700 bg-green-100/50 px-2 py-1 rounded-md inline-block">
                              تاريخ التطعيم: {record.date}
                            </div>
                          )}

                          {!isTaken && (
                            <p className="text-xs text-gray-400 mt-2">{v.notes}</p>
                          )}
                        </div>

                        {!isTaken && (
                          <button
                            onClick={() => {
                              setName(v.name);
                              setRecordType('vaccine');
                              setDate(new Date().toISOString().split('T')[0]);
                              setActiveTab('add');
                            }}
                            className={`flex flex-col items-center justify-center gap-1 min-w-[70px] py-2 px-1 rounded-xl transition text-xs font-bold ${isDue ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            <Syringe size={20} />
                            <span>تطعيم</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : activeTab === 'add' || !sheep ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الإجراء</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRecordType('vaccine')} className={`flex-1 py-2 rounded-lg text-sm border ${recordType === 'vaccine' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200'}`}>تطعيم</button>
                  <button type="button" onClick={() => setRecordType('treatment')} className={`flex-1 py-2 rounded-lg text-sm border ${recordType === 'treatment' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-200'}`}>علاج</button>
                  <button type="button" onClick={() => setRecordType('checkup')} className={`flex-1 py-2 rounded-lg text-sm border ${recordType === 'checkup' ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-200'}`}>فحص</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {recordType === 'vaccine' ? 'اسم اللقاح' : (recordType === 'treatment' ? 'اسم الدواء' : 'نتيجة الفحص')}
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={recordType === 'vaccine' ? 'مثال: معوي، جدري' : '...'}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg mt-4"
              >
                <Plus size={20} />
                <span>حفظ في السجل</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {records.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Syringe size={40} className="mx-auto mb-2 opacity-20" />
                  <p>لا توجد سجلات طبية</p>
                </div>
              ) : (
                records.map((rec) => (
                  <div key={rec.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-full ${rec.type === 'vaccine' ? 'bg-purple-100 text-purple-600' :
                      rec.type === 'treatment' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                      {rec.type === 'vaccine' ? <Syringe size={16} /> : <Activity size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">{rec.name}</h4>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">{rec.date}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {rec.type === 'vaccine' ? 'تطعيم' : (rec.type === 'treatment' ? 'علاج' : 'فحص دوري')}
                      </p>
                      {rec.notes && <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded-lg">{rec.notes}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
