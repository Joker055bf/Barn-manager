import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Calculator, Check, Hash, ChevronDown, Calendar, Tag, ShoppingBag, Skull } from 'lucide-react';
import { Sheep, SheepType, Pen } from '../types';
import { getAnimalMetadata, generateId } from '../utils/animalHelpers';
import { CustomSelect } from './CustomSelect';
import { translations } from '../constants/translations';

interface SheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sheep: Sheep | Sheep[], expense?: { amount: number, date: string }) => void;
  initialData?: Sheep;
  penId: string;
  animalType?: string;
  existingSheep?: Sheep[];
  currentGroupId?: string | null;
  pens?: Pen[];
  onMarkAsSold?: (sheep: Sheep, price: number, buyer: string, date: string) => Promise<void>;
  onMarkAsDead?: (sheep: Sheep, reason: string, date: string) => Promise<void>;
  language?: 'ar' | 'en';
  onShowAlert?: (type: any, title: string, message: string) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const SheepModal: React.FC<SheepModalProps> = ({ 
  isOpen, onClose, onSave, initialData, penId, animalType = 'sheep', existingSheep = [], pens = [], currentGroupId, onMarkAsSold, onMarkAsDead, language = 'ar',
  onShowAlert, onShowConfirm
}) => {
  const t = translations[language];

  // ... (existing code omitted) ...

  // ... (inside the return statement, finding the relevant blocks to keep context, but replace_file_content replaces contiguous blocks)
  // I need to use MultiReplace because the Prop Interface change is at the top, and the usage is down below.
  // Or I can just make two separate calls or use multi_replace_file_content.
  // I will use multi_replace_file_content.

  // Standard Fields
  const [serialNumber, setSerialNumber] = useState('');
  const [type, setType] = useState<SheepType | ''>('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeBirthDate, setIncludeBirthDate] = useState(false);
  const [ageString, setAgeString] = useState('');
  const [fatherId, setFatherId] = useState('');
  const [motherId, setMotherId] = useState('');
  const [notes, setNotes] = useState('');
  const [tagColor, setTagColor] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedPenId, setSelectedPenId] = useState(penId);
  const [motherSearchQuery, setMotherSearchQuery] = useState('');
  const [fatherSearchQuery, setFatherSearchQuery] = useState('');
  // Batch Fields (for Chickens/Pigeons)
  const [count, setCount] = useState<number>(1); // Single count for batch
  const [source, setSource] = useState<'born' | 'purchase'>('born');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const metadata = getAnimalMetadata(animalType);
  const isBatchMode = ['chickens', 'pigeons', 'ducks', 'quail', 'turkeys', 'guinea fowl', 'دجاج', 'حمام', 'بط', 'سمان'].some(t => animalType?.includes(t));
  // Check against Arabic string 'إبل' or English 'camels'
  const isCamels = animalType === 'camels' || animalType === 'camel' || animalType === 'إبل';
  // Default to sheep if not batch (bird) and not camel
  const isSheep = !isBatchMode && !isCamels;
  const colorInputRef = useRef<HTMLInputElement>(null);

  const colorNames: { [key: string]: string } = {
    '#EF4444': 'أحمر',
    '#F59E0B': 'برتقالي',
    '#10B981': 'أخضر',
    '#3B82F6': 'أزرق',
    '#6366F1': 'نيلي',
    '#8B5CF6': 'بنفسجي',
    '#EC4899': 'وردي',
    '#FACC15': 'أصفر'
  };

  useEffect(() => {
    if (colorInputRef.current) {
      colorInputRef.current.setCustomValidity('');
    }
  }, [tagColor]);

  useEffect(() => {
    if (initialData) {
      setSerialNumber(initialData.serialNumber);
      setType(initialData.type);
      setGender(initialData.gender);
      setBirthDate(initialData.birthDate);
      setIncludeBirthDate(!!initialData.birthDate);
      setFatherId(initialData.fatherId || '');
      setMotherId(initialData.motherId || '');
      setNotes(initialData.notes || '');
      setTagColor(initialData.tagColor || '');
      setNickname(initialData.nickname || '');
      setSelectedPenId(initialData.penId);
      calculateAge(initialData.birthDate);

      // Resolve Parent Search Queries
      if (initialData.motherId) {
        const mother = existingSheep.find(s => s.id === initialData.motherId || s.serialNumber === initialData.motherId);
        setMotherSearchQuery(mother ? mother.serialNumber : initialData.motherId);
        // If it was a legacy serial number link, try to upgrade to UUID if unique
        if (mother && mother.id !== initialData.motherId) {
          // We don't auto-upgrade here to avoid side effects, but the UI will show the match
          setMotherId(mother.id); // Auto-select if found by ID logic? No, keep as is or let user select.
          // Actually, better to just set the ID if we found a match to ensure consistency
          if (existingSheep.filter(s => s.serialNumber === initialData.motherId).length === 1) {
            setMotherId(mother.id);
          }
        }
      }
      if (initialData.fatherId) {
        const father = existingSheep.find(s => s.id === initialData.fatherId || s.serialNumber === initialData.fatherId);
        setFatherSearchQuery(father ? father.serialNumber : initialData.fatherId);
        if (father && father.id !== initialData.fatherId) {
          if (existingSheep.filter(s => s.serialNumber === initialData.fatherId).length === 1) {
            setFatherId(father.id);
          }
        }
      }

      // Initialize Source
      if (initialData.motherId || initialData.fatherId) {
        setSource('born');
      } else {
        setSource('purchase');
      }

    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  // Calculate age whenever birthDate changes
  useEffect(() => {
    calculateAge(birthDate);
  }, [birthDate]);

  // Auto-generate next available serial number when type and color change
  useEffect(() => {
    if (type && tagColor && !isBatchMode) {
      if (initialData && initialData.type === type && initialData.tagColor === tagColor) {
        return; // Keep original serial number if editing and type/color haven't changed
      }
      
      const matchingAnimals = existingSheep.filter(
        (s) => s.type === type && (s.tagColor || '') === tagColor && s.id !== initialData?.id
      );

      let maxNum = 0;
      matchingAnimals.forEach((s) => {
        const num = parseInt(s.serialNumber || '0', 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });

      const nextNum = String(maxNum + 1).padStart(3, '0');
      setSerialNumber(nextNum);
    }
  }, [type, tagColor, isBatchMode, existingSheep, initialData]);

  const calculateAge = (dateStr: string) => {
    if (!dateStr) {
      setAgeString('');
      return;
    }
    const birth = new Date(dateStr);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      // Get days in previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) {
      setAgeString(t.invalidDate);
      return;
    }

    let parts = [];
    if (years > 0) parts.push(`${years} ${t.year}`);
    if (months > 0) parts.push(`${months} ${t.month}`);
    if (days > 0) parts.push(`${days} ${t.day}`);

    if (parts.length === 0) {
      setAgeString(t.today);
    } else {
      setAgeString(parts.join(language === 'ar' ? ' و ' : ' & '));
    }
  };

  const resetForm = () => {
    setSerialNumber('');
    setType('');
    setGender('female');
    setBirthDate(new Date().toISOString().split('T')[0]);
    setIncludeBirthDate(false);
    setAgeString('');
    setFatherId('');
    setMotherId('');
    setNotes('');
    setTagColor('');
    setNickname('');
    setSelectedPenId(penId);
    setCount(1);
    setMotherSearchQuery('');
    setFatherSearchQuery('');
    setFatherSearchQuery('');
    setSource('born');
    setPurchaseAmount('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  };

  const [isSelling, setIsSelling] = useState(false);
  const [isReportingDeath, setIsReportingDeath] = useState(false);
  const [actionPrice, setActionPrice] = useState('');
  const [actionBuyer, setActionBuyer] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);

  const handleQuickSale = async () => {
    if (!initialData || !onMarkAsSold || !actionPrice) return;
    await onMarkAsSold(initialData, Number(actionPrice), actionBuyer, actionDate);
    onClose();
  };

  const handleQuickDeath = async () => {
    if (!initialData || !onMarkAsDead || !actionReason) return;
    await onMarkAsDead(initialData, actionReason, actionDate);
    onClose();
  };

  const getSheepLocation = (serial: string) => {
    if (!serial) return '';
    const sheep = existingSheep.find(s => s.serialNumber === serial);
    if (!sheep) return '';
    const pen = pens.find(p => p.id === sheep.penId);
    return pen ? pen.name : 'غير معروف';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isBatchMode && !initialData) {
      if (!type) {
        if (onShowAlert) onShowAlert('warning', 'تنبيه', 'الرجاء اختيار النوع');
        return;
      }
      const newAnimals: Sheep[] = [];
      const baseDate = new Date().toISOString();

      // Generate Batch
      const genderPrefix = gender === 'male' ? 'M' : 'F';

      for (let i = 0; i < count; i++) {
        newAnimals.push({
          id: generateId(),
          penId: selectedPenId,
          serialNumber: `${genderPrefix}-${Date.now()}-${i}`,
          type: type,
          gender: gender, // Use selected gender
          birthDate: includeBirthDate ? (birthDate || baseDate) : '', // Empty if optional
          notes,
          medicalRecords: []
        });
      }

      if (newAnimals.length > 0) {
        onSave(newAnimals);
        onClose();
        resetForm();
      }
      return;
    }

    // Standard Single Save
    // Native validation handles the checks now

    // Validation: Check for duplicate Serial Number + Tag Color
    if (existingSheep.length > 0) {
      const duplicateSheep = existingSheep.find(s =>
        s.id !== (initialData?.id) && // Exclude self if editing
        s.serialNumber === serialNumber &&
        (s.tagColor || '') === (tagColor || '') &&
        s.type === type // Only duplicate if same type
      );

      if (duplicateSheep) {
        // Check if excluded
        if (duplicateSheep.exclusionDate) {
          const exclusionDate = new Date(duplicateSheep.exclusionDate);
          const now = new Date();
          const diffMonths = (now.getFullYear() - exclusionDate.getFullYear()) * 12 + (now.getMonth() - exclusionDate.getMonth());

          // If less than 3 months, BLOCK
          if (diffMonths < 3) {
            const availableDate = new Date(exclusionDate);
            availableDate.setMonth(availableDate.getMonth() + 3);
            const msg = `هذا الرقم محجوز لحيوان مستبعد (${duplicateSheep.serialNumber} - ${colorNames[duplicateSheep.tagColor || ''] || 'بدون لون'}). سيكون متاحاً بعد: ${availableDate.toLocaleDateString('ar-SA')}`;
            if (onShowAlert) onShowAlert('error', 'تنبيه', msg);
            return;
          }
          // If >= 3 months, ALLOW (Implicitly continues)
        } else {
          // Normal duplicate (Active animal)
          if (onShowAlert) onShowAlert('error', 'خطأ', 'يوجد حيوان نشط بنفس الرقم التسلسلي ولون العلامة. الرجاء تغيير أحدهما.');
          return;
        }
      }
    }

    // Resolve IDs if not set but unique match exists, otherwise use raw text
    let finalMotherId = motherId;
    let finalFatherId = fatherId;

    if (isSheep) {
      if (!motherId && motherSearchQuery) {
        const matches = existingSheep.filter(s =>
          s.serialNumber === motherSearchQuery &&
          s.gender === 'female' &&
          s.type === type &&
          !s.penId.includes('mortality')
        );
        if (matches.length === 1) finalMotherId = matches[0].id;
        else finalMotherId = motherSearchQuery;
      }
      if (!fatherId && fatherSearchQuery) {
        const matches = existingSheep.filter(s =>
          s.serialNumber === fatherSearchQuery &&
          s.gender === 'male' &&
          s.type === type &&
          !s.penId.includes('mortality')
        );
        if (matches.length === 1) finalFatherId = matches[0].id;
        else finalFatherId = fatherSearchQuery;
      }
    }

    const sheepData: Sheep = {
      id: initialData ? initialData.id : generateId(),
      penId: selectedPenId,
      serialNumber,
      type,
      gender,
      birthDate: (!isBatchMode || includeBirthDate) ? birthDate : '',
      fatherId: isSheep ? finalFatherId : undefined,
      motherId: isSheep ? finalMotherId : undefined,
      notes,
      medicalRecords: initialData?.medicalRecords || [],
      tagColor,
      nickname
    };


    let expenseData;
    if (source === 'purchase' && purchaseAmount) {
      expenseData = {
        amount: parseFloat(purchaseAmount),
        date: purchaseDate
      };
    }

    onSave(sheepData, expenseData);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-[#795548] to-[#5D4037] p-6 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-3xl font-black tracking-tighter">
                {initialData ? `تعديل ${metadata.headLabel}` : `إضافة ${metadata.headLabel}`}
              </h2>
              <p className="text-orange-100/60 text-[10px] font-bold mt-1 uppercase tracking-widest leading-none">
                نظام إدارة {metadata.label.plural}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
            >
              <X size={22} />
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white/30 dark:bg-transparent">

          {/* Type Selection and Count / Serial logic */}
          {isBatchMode && !initialData ? (
            /* Batch Mode: Type + Count + Gender + Common Date */
            <div className="space-y-4">

              {/* Pen Selector for Batch Mode */}
              <div>
                <CustomSelect
                  label="القسم / الحظيرة"
                  value={selectedPenId}
                  onChange={(val) => setSelectedPenId(val)}
                  options={pens
                    .filter(p =>
                      !p.isGroup &&
                      !p.isExclusion &&
                      !p.id.includes('mortality') &&
                      (!currentGroupId || p.parentId === currentGroupId) &&
                      !['ذهبان', 'المهات 1', 'لببق', 'الزربه الرئيسية', 'الزربه الرئيسيه'].some(banned => p.name.includes(banned))
                    )
                    .map(p => ({ value: p.id, label: p.name }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type Selection */}
                <div className="space-y-1">
                  <CustomSelect
                    label="النوع"
                    value={type}
                    onChange={(val) => setType(val as SheepType)}
                    options={Object.values(SheepType)
                      .filter(t => {
                        const birdTypes = [SheepType.CHICKEN, SheepType.PIGEON, SheepType.DUCK, SheepType.GUINEA_FOWL, SheepType.TURKEY, SheepType.QUAIL];
                        // Only show bird types in batch mode (checking against modal 'animalType' prop logic which sets isBatchMode)
                        return birdTypes.includes(t) || t === SheepType.OTHER;
                      })
                      .sort((a, b) => a === SheepType.OTHER ? 1 : b === SheepType.OTHER ? -1 : 0) // Move Other to end
                      .map(t => ({ value: t, label: t }))}
                  />
                </div>
                {/* Count Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">العدد</label>
                  <input
                    type="number"
                    min="1"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#795548] focus:bg-white outline-none transition-all font-bold text-center text-sm"
                  />
                </div>
              </div>

              {/* Gender Selection for Batch */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">الجنس</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer relative overflow-hidden rounded-xl border transition-all p-2.5 flex items-center justify-center gap-2 ${gender === 'male' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                    <input type="radio" name="batch-gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${gender === 'male' ? 'border-[#795548] bg-[#795548]/100 text-white' : 'border-gray-300'}`}>
                      {gender === 'male' && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`font-bold text-sm ${gender === 'male' ? 'text-emerald-700' : 'text-gray-600'}`}>{t.males}</span>
                  </label>

                  <label className={`cursor-pointer relative overflow-hidden rounded-xl border transition-all p-2.5 flex items-center justify-center gap-2 ${gender === 'female' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                    <input type="radio" name="batch-gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${gender === 'female' ? 'border-[#795548] bg-[#795548]/100 text-white' : 'border-gray-300'}`}>
                      {gender === 'female' && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`font-bold text-sm ${gender === 'female' ? 'text-emerald-700' : 'text-gray-600'}`}>{t.females}</span>
                  </label>
                </div>
              </div>

              {/* Common Fields (Date/Age) for Batch Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">تاريخ الميلاد</label>
                    <label className="flex items-center gap-1.5 cursor-pointer bg-[#fcfbf4] px-2 py-0.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                      <input
                        type="checkbox"
                        checked={includeBirthDate}
                        onChange={e => {
                          setIncludeBirthDate(e.target.checked);
                          if (!e.target.checked) {
                            setBirthDate('');
                            setAgeString('');
                          }
                        }}
                        className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-[#795548]"
                      />
                      <span className="text-[10px] font-bold text-gray-600">تفعيل</span>
                    </label>
                  </div>

                  {includeBirthDate ? (
                    <input
                      required
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#795548] focus:bg-white outline-none transition-all shadow-sm font-medium text-sm"
                    />
                  ) : (
                    <div className="w-full px-3 py-2.5 bg-[#fcfbf4] text-gray-400 border border-gray-200 rounded-xl text-xs text-center font-medium shadow-sm">
                      بدون تاريخ
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">العمر (تلقائي)</label>
                  <div className="w-full px-3 py-2.5 bg-[#795548]/10/50 text-emerald-800 border border-emerald-100 rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
                    <Calculator size={14} className="text-[#795548]" />
                    <span className="font-bold text-sm">{ageString || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Mode: Serial No + Type + Color + Nickname (One Row) */
            <div className="space-y-2">
              {/* Pen Selector */}
              <div>
                <CustomSelect
                  label="القسم / الحظيرة"
                  value={selectedPenId}
                  onChange={(val) => setSelectedPenId(val)}
                  options={pens
                    .filter(p =>
                      !p.isGroup &&
                      !p.isExclusion &&
                      !p.id.includes('mortality') &&
                      (!currentGroupId || p.parentId === currentGroupId) &&
                      !['ذهبان', 'المهات 1', 'لببق', 'الزربه الرئيسية', 'الزربه الرئيسيه'].some(banned => p.name.includes(banned))
                    )
                    .map(p => ({ value: p.id, label: p.name }))}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Type */}
                <div className="space-y-1">
                  <CustomSelect
                    label="النوع"
                    value={type}
                    onChange={(val) => setType(val as SheepType)}
                    options={Object.values(SheepType)
                      .filter(t => {
                        const birdTypes = [SheepType.CHICKEN, SheepType.PIGEON, SheepType.DUCK, SheepType.GUINEA_FOWL, SheepType.TURKEY, SheepType.QUAIL];
                        const camelTypes = [SheepType.MAJAHEEM, SheepType.WADAH, SheepType.SAFAR, SheepType.SHAAL, SheepType.HOMR];

                        if (isCamels) {
                          // If it's a camel barn, only show camel types
                          return camelTypes.includes(t);
                        }

                        if (isSheep) {
                          // If it's a sheep barn, exclude birds and camels
                          return !birdTypes.includes(t) && !camelTypes.includes(t);
                        }

                        // If it's birds (batch mode), logic is slightly different (usually handled by isBatchMode UI, but for type dropdown):
                        // We likely want to show specific bird type? Or maybe all birds?
                        // For now, let's just make sure camels don't show up in birds
                        return !camelTypes.includes(t);
                      })
                      .sort((a, b) => a === SheepType.OTHER ? 1 : b === SheepType.OTHER ? -1 : 0) // Move Other to end
                      .map(t => ({ value: t, label: t }))}
                  />
                </div>

                {/* Color Picker */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block text-center">اللون</label>
                  <div className="relative w-full">
                    <input
                      ref={colorInputRef}
                      type="text"
                      required
                      value={tagColor}
                      onChange={() => { }}
                      className="absolute inset-0 w-full h-full opacity-0 z-0 cursor-pointer pointer-events-none"
                      tabIndex={-1}
                    />
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full h-[38px] px-1 bg-[#fcfbf4] border border-gray-200 rounded-lg hover:bg-white hover:border-emerald-300 transition-all flex items-center justify-center gap-1 shadow-sm group"
                    >
                      {tagColor ? (
                        <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm ring-1 ring-white" style={{ backgroundColor: tagColor }} />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 group-hover:border-emerald-400" />
                      )}
                      <span className={`font-bold text-sm truncate max-w-[50px] ${tagColor ? 'text-gray-900' : 'text-gray-400'}`}>
                        {tagColor ? (colorNames[tagColor] || '..') : 'اختر'}
                      </span>
                    </button>

                    {showColorPicker && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1.5 w-40 animate-scale-in">
                        {Object.entries(colorNames).map(([c, name]) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setTagColor(c); setShowColorPicker(false); }}
                            className={`w-6 h-6 rounded-full border transition hover:scale-110 hover:shadow-md ${tagColor === c ? 'ring-2 ring-offset-2 ring-emerald-500' : 'border-gray-100'}`}
                            style={{ backgroundColor: c }}
                            title={name}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => { setTagColor(''); setShowColorPicker(false); }}
                          className="w-full col-span-4 text-[10px] text-red-500 py-1 hover:bg-red-50 rounded-lg font-bold transition-colors"
                        >
                          إزالة
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Serial Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block text-center">
                    الرقم
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={serialNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                      setSerialNumber(val);
                    }}
                    placeholder="000"
                    className="w-full h-[38px] bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#795548] focus:bg-white outline-none transition-all font-mono text-base tracking-wider text-center shadow-sm"
                  />
                </div>

                {/* Nickname */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block text-center">الكنية</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="اختياري"
                    className="w-full h-[38px] px-1 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#795548] focus:bg-white outline-none transition-all font-medium text-center shadow-sm placeholder:text-gray-300 text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Date + Age */}
              <div className="grid grid-cols-2 gap-2">
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block text-center">الميلاد</label>
                  <div className="relative">
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <Calendar size={14} />
                    </div>
                    <input
                      required
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full h-[38px] px-3 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#795548] focus:bg-white outline-none transition-all shadow-sm font-medium text-center text-sm"
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block text-center">العمر</label>
                  <div className="w-full h-[38px] px-1 bg-[#795548]/10/50 text-emerald-800 border border-emerald-100 rounded-lg flex items-center justify-center gap-1 shadow-sm overflow-hidden">
                    <span className="font-bold text-[10px] whitespace-nowrap">{ageString || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Gender Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block text-center">الجنس</label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Male Button */}
                  <label className={`cursor-pointer relative overflow-hidden rounded-lg border transition-all h-[38px] flex items-center justify-center gap-2 ${gender === 'male' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                    <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${gender === 'male' ? 'border-[#795548] bg-[#795548]/100 text-white' : 'border-gray-300'}`}>
                      {gender === 'male' && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`font-bold text-sm ${gender === 'male' ? 'text-emerald-700' : 'text-gray-600'}`}>{t.male}</span>
                  </label>

                  {/* Female Button */}
                  <label className={`cursor-pointer relative overflow-hidden rounded-lg border transition-all h-[38px] flex items-center justify-center gap-2 ${gender === 'female' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                    <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${gender === 'female' ? 'border-[#795548] bg-[#795548]/100 text-white' : 'border-gray-300'}`}>
                      {gender === 'female' && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`font-bold text-sm ${gender === 'female' ? 'text-emerald-700' : 'text-gray-600'}`}>{t.female}</span>
                  </label>
                </div>
              </div>
            </div>
          )}


          {/* Parents - Only for Sheep/Camels/Cows (Not batch mode) */}
          {(!isBatchMode || initialData) && isSheep && (
            <div className="space-y-4 pt-4 border-t border-gray-100">

              <div className="grid grid-cols-2 gap-3 mb-2">
                <label className={`cursor-pointer relative overflow-hidden rounded-xl border transition-all p-2.5 flex items-center justify-center gap-2 ${source === 'purchase' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                  <input type="radio" name="source" value="purchase" checked={source === 'purchase'} onChange={() => setSource('purchase')} className="hidden" />
                  <span className={`font-bold text-sm ${source === 'purchase' ? 'text-emerald-700' : 'text-gray-600'}`}>شراء</span>
                </label>

                <label className={`cursor-pointer relative overflow-hidden rounded-xl border transition-all p-2.5 flex items-center justify-center gap-2 ${source === 'born' ? 'border-[#795548] bg-[#795548]/10/50' : 'border-gray-100 bg-[#fcfbf4] hover:border-gray-200'}`}>
                  <input type="radio" name="source" value="born" checked={source === 'born'} onChange={() => setSource('born')} className="hidden" />
                  <span className={`font-bold text-sm ${source === 'born' ? 'text-emerald-700' : 'text-gray-600'}`}>مولود</span>
                </label>
              </div>

              {source === 'purchase' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in bg-[#fcfbf4] p-3 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block text-right">سعر الشراء</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      placeholder="0"
                      className="w-full h-[40px] px-3 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#795548] outline-none transition-all shadow-sm text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block text-right">تاريخ الشراء</label>
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full h-[40px] px-3 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#795548] outline-none transition-all shadow-sm text-center text-xs"
                    />
                  </div>
                </div>
              )}

              {source === 'born' && (
                <>
                  <label className="text-xs font-bold text-gray-700">بيانات الأب والأم <span className="text-[10px] text-gray-400 font-normal">(اختياري)</span></label>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Mother Selector */}
                    {/* Mother Selector */}
                    {(() => {
                      const matches = motherSearchQuery ? existingSheep.filter(s =>
                        s.serialNumber.includes(motherSearchQuery) &&
                        s.gender === 'female' &&
                        s.type === type && // Enforce same type
                        !s.penId.includes('mortality') // Exclude dead animals
                      ) : [];
                      const selectedMother = motherId ? existingSheep.find(s => s.id === motherId) : null;

                      return (
                        <div className="space-y-2 relative group/parent">
                          <label className="text-[10px] font-bold text-pink-400 block text-center">الأم</label>
                          <div className="flex flex-col gap-2">
                            {/* Number Input with Tooltip */}
                            <div className="relative w-full">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={motherSearchQuery}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setMotherSearchQuery(val);
                                  setMotherId(''); // Reset selection on edit

                                  // exact match check
                                  const exactMatches = existingSheep.filter(s =>
                                    s.serialNumber === val &&
                                    s.gender === 'female' &&
                                    !s.penId.includes('mortality')
                                  );
                                  if (exactMatches.length === 1) {
                                    setMotherId(exactMatches[0].id);
                                  }
                                }}
                                placeholder="رقم الأم"
                                className={`w-full px-2 py-3 bg-white text-gray-900 border ${selectedMother ? 'border-pink-500 ring-1 ring-pink-500/20' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-center font-bold text-lg shadow-sm placeholder:text-gray-300 placeholder:text-sm transition-all`}
                              />
                              {selectedMother && (
                                <>
                                  <div
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white"
                                    style={{ backgroundColor: selectedMother.tagColor || '#e5e7eb' }}
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/parent:block z-50 whitespace-nowrap">
                                    <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-2">
                                      <span>{pens.find(p => p.id === selectedMother.penId)?.name || 'غير معروف'}</span>
                                      {selectedMother.tagColor && (
                                        <span className="w-2 h-2 rounded-full ring-1 ring-white/50" style={{ backgroundColor: selectedMother.tagColor }}></span>
                                      )}
                                    </div>
                                    <div className="w-2 h-2 bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Dropdown for Matches */}
                          {!motherId && matches.length > 0 && (
                            <div className="absolute top-[60px] left-0 right-0 z-30 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl p-2 flex flex-col gap-1 animate-scale-in max-h-48 overflow-y-auto custom-scrollbar">
                              {matches.map(match => (
                                <button
                                  key={match.id}
                                  type="button"
                                  onClick={() => {
                                    setMotherSearchQuery(match.serialNumber);
                                    setMotherId(match.id);
                                  }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-50 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700 transition-all text-xs group w-full text-right"
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full ring-1 ring-gray-100 shrink-0 ${match.tagColor ? '' : 'bg-gray-200'}`} style={{ backgroundColor: match.tagColor || undefined }} />
                                  <span className="font-bold text-gray-700 group-hover:text-pink-700 truncate flex-1">
                                    {match.serialNumber}
                                  </span>
                                  <span className="text-[10px] text-gray-400 group-hover:text-pink-400">
                                    {pens.find(p => p.id === match.penId)?.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {!motherId && matches.length === 0 && motherSearchQuery.length >= 2 && (
                            <div className="absolute top-[60px] left-0 right-0 z-30 mt-1 bg-white border border-gray-100 rounded-xl shadow-sm p-3 text-center">
                              <p className="text-xs font-bold text-gray-800">لا يوجد نتائج</p>
                              <p className="text-[10px] text-gray-400 mt-1">تأكد من رقم الأم</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Father Selector */}
                    {(() => {
                      const matches = fatherSearchQuery ? existingSheep.filter(s =>
                        s.serialNumber.includes(fatherSearchQuery) &&
                        s.gender === 'male' &&
                        s.type === type && // Enforce same type
                        !s.penId.includes('mortality')
                      ) : [];
                      const selectedFather = fatherId ? existingSheep.find(s => s.id === fatherId) : null;

                      return (
                        <div className="space-y-2 relative group/parent">
                          <label className="text-[10px] font-bold text-blue-400 block text-center">الأب</label>
                          <div className="flex flex-col gap-2">
                            {/* Number Input with Tooltip */}
                            <div className="relative w-full">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={fatherSearchQuery}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setFatherSearchQuery(val);
                                  setFatherId(''); // Reset selection on edit

                                  const exactMatches = existingSheep.filter(s =>
                                    s.serialNumber === val &&
                                    s.gender === 'male' &&
                                    !s.penId.includes('mortality')
                                  );
                                  if (exactMatches.length === 1) {
                                    setFatherId(exactMatches[0].id);
                                  }
                                }}
                                placeholder="رقم الأب"
                                className={`w-full px-2 py-3 bg-white text-gray-900 border ${selectedFather ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-lg shadow-sm placeholder:text-gray-300 placeholder:text-sm transition-all`}
                              />
                              {selectedFather && (
                                <>
                                  <div
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white"
                                    style={{ backgroundColor: selectedFather.tagColor || '#e5e7eb' }}
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/parent:block z-50 whitespace-nowrap">
                                    <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-2">
                                      <span>{pens.find(p => p.id === selectedFather.penId)?.name || 'غير معروف'}</span>
                                      {selectedFather.tagColor && (
                                        <span className="w-2 h-2 rounded-full ring-1 ring-white/50" style={{ backgroundColor: selectedFather.tagColor }}></span>
                                      )}
                                    </div>
                                    <div className="w-2 h-2 bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Dropdown for Matches */}
                          {!fatherId && matches.length > 0 && (
                            <div className="absolute top-[60px] left-0 right-0 z-30 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl p-2 flex flex-col gap-1 animate-scale-in max-h-48 overflow-y-auto custom-scrollbar">
                              {matches.map(match => (
                                <button
                                  key={match.id}
                                  type="button"
                                  onClick={() => {
                                    setFatherSearchQuery(match.serialNumber);
                                    setFatherId(match.id);
                                  }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-xs group w-full text-right"
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full ring-1 ring-gray-100 shrink-0 ${match.tagColor ? '' : 'bg-gray-200'}`} style={{ backgroundColor: match.tagColor || undefined }} />
                                  <span className="font-bold text-gray-700 group-hover:text-blue-700 truncate flex-1">
                                    {match.serialNumber}
                                  </span>
                                  <span className="text-[10px] text-gray-400 group-hover:text-blue-400">
                                    {pens.find(p => p.id === match.penId)?.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {!fatherId && matches.length === 0 && fatherSearchQuery.length >= 2 && (
                            <div className="absolute top-[60px] left-0 right-0 z-30 mt-1 bg-white border border-gray-100 rounded-xl shadow-sm p-3 text-center">
                              <p className="text-xs font-bold text-gray-800">لا يوجد نتائج</p>
                              <p className="text-[10px] text-gray-400 mt-1">تأكد من رقم الأب</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </>
              )}
            </div>
          )}



          <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-[#fcfbf4] hover:border-gray-300 transition-all text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-[#795548] text-white font-bold hover:bg-[#5D4037] transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-sm"
            >
              <Save size={18} />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
