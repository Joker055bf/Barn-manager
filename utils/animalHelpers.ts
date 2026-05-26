
import { Bird, Cat, Dog, Fish, Rabbit, Squirrel, Warehouse, Wheat, Zap, Info, ShieldCheck, DollarSign, Activity } from 'lucide-react';
import React from 'react';

export type AnimalType = 'sheep' | 'camels' | 'cows' | 'chickens' | 'pigeons' | 'horses' | 'other';

interface AnimalMetadata {
    label: { single: string; plural: string };
    headLabel: string;
    barnLabel: string;
    genderTerms: { male: string; female: string };
    defaultIcon: React.ElementType;
    vaccines?: { name: string; age: string; frequency?: string; notes?: string }[];
}

export function calculateVaccineDueDate(birthDate: string, ageStr: string): Date {
    const date = new Date(birthDate);
    if (ageStr.includes('أسبوع')) {
        const weeks = parseInt(ageStr) || 1;
        date.setDate(date.getDate() + weeks * 7);
    } else if (ageStr.includes('شهر')) {
        const months = parseInt(ageStr) || 1;
        date.setMonth(date.getMonth() + months);
    } else if (ageStr.includes('سنة')) {
        const years = parseInt(ageStr) || 1;
        date.setFullYear(date.getFullYear() + years);
    } else if (ageStr.includes('يوم')) {
        const days = parseInt(ageStr) || 0;
        date.setDate(date.getDate() + days);
    }
    return date;
};

export const getAnimalMetadata = (type: string = 'sheep'): AnimalMetadata => {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
        case 'chickens':
            return {
                label: { single: 'دجاجة', plural: 'دواجن' },
                headLabel: 'طير',
                barnLabel: 'قن',
                genderTerms: { male: 'ديك', female: 'دجاجة' },
                defaultIcon: Bird,
                vaccines: [
                    { name: 'نيوكاسل', age: '1 يوم', frequency: 'كل 3 أشهر', notes: 'قطرة في العين أو الرش' },
                    { name: 'جمبورو', age: '14 يوم', frequency: 'مرة واحدة', notes: 'في ماء الشرب' },
                    { name: 'جدري', age: '6 أسابيع', frequency: 'سنوي', notes: 'وخز في الجناح' }
                ]
            };
        case 'pigeons':
            return {
                label: { single: 'حمامة', plural: 'حمام' },
                headLabel: 'طير',
                barnLabel: 'عشة / برج',
                genderTerms: { male: 'ذكر', female: 'أنثى' },
                defaultIcon: Bird,
                vaccines: [
                    { name: 'باراميكسو', age: '3 أسابيع', frequency: 'سنوي', notes: 'حقن تحت الجلد' },
                    { name: 'جدري الحمام', age: '4 أسابيع', frequency: 'مرة واحدة', notes: 'وخز' }
                ]
            };
        case 'cows':
            return {
                label: { single: 'بقرة', plural: 'أبقار' },
                headLabel: 'رأس',
                barnLabel: 'حظيرة',
                genderTerms: { male: 'ثور', female: 'بقرة' },
                defaultIcon: Warehouse,
                vaccines: [
                    { name: 'حمى قلاعية', age: '4 أشهر', frequency: 'كل 6 أشهر', notes: 'حقن' },
                    { name: 'تسمم دموي', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' }
                ]
            };
        case 'camels':
            return {
                label: { single: 'ناقة/جمل', plural: 'إبل' },
                headLabel: 'رأس',
                barnLabel: 'شبك',
                genderTerms: { male: 'جمل', female: 'ناقة' },
                defaultIcon: Warehouse,
                vaccines: [
                    { name: 'جدري الإبل', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
                    { name: 'تسمم معوي', age: '3 أشهر', frequency: 'سنوي', notes: 'حقن' }
                ]
            };
        case 'horses':
            return {
                label: { single: 'حصان', plural: 'خيول' },
                headLabel: 'رأس',
                barnLabel: 'اسطبل',
                genderTerms: { male: 'حصان', female: 'فرس' },
                defaultIcon: Activity,
                vaccines: [
                    { name: 'إنفلونزا الخيل', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' },
                    { name: 'تيتانوس', age: '6 أشهر', frequency: 'سنوي', notes: 'حقن' }
                ]
            };
        case 'sheep':
        default: // Sheep
            return {
                label: { single: 'شاة', plural: 'أغنام' },
                headLabel: 'رأس',
                barnLabel: 'شبك / حظيرة',
                genderTerms: { male: 'ذكر (فحل/طلي)', female: 'أنثى (شاة/رخال)' },
                defaultIcon: Warehouse,
                vaccines: [
                    { name: 'اللاهوائيات (7 أمراض)', age: '2 أسبوع', frequency: 'سنوي', notes: 'حقن' },
                    { name: 'التسمم المعوي (الدموي)', age: '2 شهر', frequency: 'سنوي', notes: 'حقن' },
                    { name: 'القلاعية (FMD)', age: '3 أشهر', frequency: 'كل 6 أشهر', notes: 'حقن' },
                    { name: 'الجدري', age: '3 أشهر', frequency: 'سنوي', notes: 'حقن - يفضل 3-4 أشهر' },
                    { name: 'الطاعون (PPR)', age: '3 أشهر', frequency: 'مرة واحدة بالعمر', notes: 'حقن - يفضل 3-4 أشهر' },
                    { name: 'البروسيلا (المالطية)', age: '3 أشهر', frequency: 'مرة واحدة', notes: 'إناث فقط - من عمر 3-6 أشهر' }
                ]
            };
    }
};


