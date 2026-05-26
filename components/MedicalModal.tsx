import React, { useState } from 'react';
import { X, Syringe, Plus, Calendar, Activity } from 'lucide-react';
import { Sheep, MedicalRecord } from '../types';

interface MedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep?: Sheep;
  onAddRecord: (record: MedicalRecord) => void;
}

export const MedicalModal: React.FC<MedicalModalProps> = ({ isOpen, onClose, sheep, onAddRecord }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('history');
  
  // Form State
  const [recordType, setRecordType] = useState<'vaccine' | 'treatment' | 'checkup'>('vaccine');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

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

  if (!isOpen || !sheep) return null;

  const records = sheep.medicalRecords || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-purple-50">
          <div>
            <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <Activity size={24} className="text-purple-600" />
              السجل الطبي
            </h2>
            <p className="text-sm text-purple-600 mt-1">رقم الرأس: #{sheep.serialNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'history' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            سجل التطعيمات ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'add' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            إضافة جديد
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'add' ? (
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
                    <div className={`mt-1 p-2 rounded-full ${
                        rec.type === 'vaccine' ? 'bg-purple-100 text-purple-600' :
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
