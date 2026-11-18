// Recommended vaccination schedule per animal type. No React imports: the daily push job on
// Vercel (api/dailyAlerts.ts) reads this too, so the app and the server agree on what is due.

export interface VaccineInfo {
  name: string;
  /** Target age, e.g. "3 أشهر", "2 أسبوع", "14 يوم" */
  age: string;
  frequency?: string;
  notes?: string;
}

export const VACCINES = {
  chickens: [
    { name: 'نيوكاسل', age: '1 يوم', frequency: 'كل 3 أشهر', notes: 'قطرة في العين أو الرش' },
    { name: 'جمبورو', age: '14 يوم', frequency: 'مرة واحدة', notes: 'في ماء الشرب' },
    { name: 'جدري', age: '6 أسابيع', frequency: 'سنوي', notes: 'وخز في الجناح' },
  ],
  pigeons: [
    { name: 'باراميكسو', age: '3 أسابيع', frequency: 'سنوي', notes: 'حقن تحت الجلد' },
    { name: 'جدري الحمام', age: '4 أسابيع', frequency: 'مرة واحدة', notes: 'وخز' },
  ],
  cows: [
    { name: 'حمى قلاعية', age: '4 أشهر', frequency: 'كل 6 أشهر', notes: 'حقن' },
    { name: 'تسمم دموي', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
  ],
  camels: [
    { name: 'جدري الإبل', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
    { name: 'تسمم معوي', age: '3 أشهر', frequency: 'سنوي', notes: 'حقن' },
  ],
  horses: [
    { name: 'إنفلونزا الخيل', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
    { name: 'تيتانوس', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
  ],
  sheep: [
    { name: 'اللاهوائيات (7 أمراض)', age: '2 أسبوع', frequency: 'سنوي', notes: 'حقن' },
    { name: 'التسمم المعوي (الدموي)', age: '2 شهر', frequency: 'سنوي', notes: 'حقن' },
    { name: 'القلاعية (FMD)', age: '3 أشهر', frequency: 'كل 6 أشهر', notes: 'حقن' },
    { name: 'الجدري', age: '3 أشهر', frequency: 'سنوي', notes: 'حقن - يفضل 3-4 أشهر' },
    { name: 'الطاعون (PPR)', age: '3 أشهر', frequency: 'مرة واحدة بالعمر', notes: 'حقن - يفضل 3-4 أشهر' },
    { name: 'البروسيلا (المالطية)', age: '3 أشهر', frequency: 'مرة واحدة', notes: 'إناث فقط - من عمر 3-6 أشهر' },
  ],
} satisfies Record<string, VaccineInfo[]>;

/** Same type matching as getAnimalMetadata() in utils/animalHelpers.ts. */
export const vaccinesForType = (type: string = 'sheep'): VaccineInfo[] => {
  const t = (type || 'sheep').toLowerCase();
  if (t === 'دجاج' || t === 'chickens') return VACCINES.chickens;
  if (t === 'حمام' || t === 'pigeons') return VACCINES.pigeons;
  if (t === 'أبقار' || t === 'cows') return VACCINES.cows;
  if (t === 'إبل' || t === 'camels') return VACCINES.camels;
  if (t === 'خيول' || t === 'horses') return VACCINES.horses;
  return VACCINES.sheep;
};

/** "3 أشهر" -> 90 (same rule as the medical card in MedicalModal.tsx). */
export const parseVaccineAgeToDays = (ageStr: string): number => {
  const normalized = ageStr.toLowerCase().trim();
  const num = parseInt(normalized.replace(/[^0-9]/g, '')) || 0;
  if (normalized.includes('يوم') || normalized.includes('day')) return num;
  if (normalized.includes('أسبوع') || normalized.includes('اسبوع') || normalized.includes('أسابيع') || normalized.includes('week')) return num * 7;
  if (normalized.includes('شهر') || normalized.includes('أشهر') || normalized.includes('month')) return num * 30;
  if (normalized.includes('سنة') || normalized.includes('year')) return num * 365;
  return num;
};
