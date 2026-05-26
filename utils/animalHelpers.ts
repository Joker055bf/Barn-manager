import { Bird, Cat, Dog, Fish, Rabbit, Squirrel, Warehouse, Wheat, Zap, Info, ShieldCheck, DollarSign, Activity } from 'lucide-react';
import React from 'react';

export const generateId = () => {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export type AnimalType = 'sheep' | 'camels' | 'cows' | 'chickens' | 'pigeons' | 'horses' | 'other';

interface AnimalMetadata {
    label: { single: string; plural: string };
    headLabel: string;
    barnLabel: string;
    genderTerms: { male: string; female: string };
    defaultIcon: React.ElementType;
    vaccines?: { name: string; age: string; frequency?: string; notes?: string }[];
}

export const calculateVaccineDueDate = (birthDate: string, ageStr: string): Date => {
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

    // Check for Arabic types first (as per SheepType enum)
    if (normalizedType === 'دجاج' || normalizedType === 'chickens') {
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
    }
    if (normalizedType === 'حمام' || normalizedType === 'pigeons') {
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
    }
    if (normalizedType === 'أبقار' || normalizedType === 'cows') {
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
    }
    if (normalizedType === 'إبل' || normalizedType === 'camels') {
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
    }
    if (normalizedType === 'خيول' || normalizedType === 'horses') {
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
    }

    // Default / Sheep
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
};

export const getAnimalAgeLabel = (birthDateStr: string | undefined, type: string = 'sheep', gender: 'male' | 'female' = 'female'): string => {
    if (!birthDateStr) return 'غير معروف';
    const birth = new Date(birthDateStr);
    const now = new Date();

    // Calculate difference in days and months
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;

    const normalizedType = type.toLowerCase();

    // 1. CHICKENS (الدجاج) & TURKEYS (الرومي) & GUINEA FOWL (الحبشي)
    if (normalizedType === 'دجاج' || normalizedType === 'ديك رومي' || normalizedType === 'دجاج حبشي' || normalizedType.includes('دجاج') || normalizedType.includes('رومي') || normalizedType.includes('حبشي')) {
        if (days <= 14) return 'صوص'; // From day to 2 weeks
        if (months < 4) return 'فرخ'; // From 2 weeks (implied) to 3 months (end of 3rd month) -> actually "From month to 3 months". I'll cover the gap 15d-30d as 'فرخ' too.
        if (months < 6) return gender === 'male' ? 'عتريس' : 'بشارة'; // 4-5 months
        return gender === 'male' ? 'ديك' : 'دجاجة'; // 6 months+
    }

    // 2. PIGEONS (الحمام)
    if (normalizedType === 'حمام' || normalizedType.includes('حمام')) {
        if (days <= 30) return 'زغلول'; // 1-30 days
        if (months < 4) return 'فـريخ'; // 1-3 months
        if (months < 7) return 'شـاب'; // 4-6 months
        return 'شغال'; // 7 months+
    }

    // 3. DUCKS (البط)
    if (normalizedType === 'بط' || normalizedType.includes('بط')) {
        if (days <= 21) return 'صوص البط'; // 1 day to 3 weeks
        if (months < 5) return 'بط فتي'; // 1 month to 3 months (User said 1-3m, next starts at 5m. I'll extend this to < 5m to cover the gap)
        return gender === 'male' ? 'علج' : 'بطة'; // 5 months+
    }

    // 4. QUAIL (السمان)
    if (normalizedType === 'سمان' || normalizedType.includes('سمان')) {
        if (days <= 10) return 'صوص'; // 1-10 days
        if (days < 40) return 'فرخ'; // 2 weeks (14 days) - 4 weeks (28 days). Next starts at 40. I'll extend to < 40.
        return 'سمان'; // 40-50 days+
    }

    // 5. CAMELS (إبل)
    if (normalizedType === 'إبل' || normalizedType === 'camels' || normalizedType === 'camel' || normalizedType.includes('إبل') ||
        ['مجاهيم', 'وضح', 'صفر', 'شعل', 'حمر'].includes(normalizedType)) {
        if (months <= 6) return 'حوار';
        if (months < 12) return 'مخلول';
        if (months < 24) return 'مفرود'; // 1-2 years (Starts at 12m)
        if (months < 36) return 'لِقي'; // 2-3 years (Starts at 24m)
        if (months < 48) return 'حِقّ'; // 3-4 years
        if (months < 60) return 'جذع'; // 4-5 years
        if (months < 72) return 'ثني'; // 5-6 years
        if (months < 84) return 'رباع'; // 6-7 years
        if (months < 96) return 'سديس'; // 7-8 years
        if (months < 108) return 'بازل'; // 8-9 years
        if (months < 240) return 'مخلف'; // 9-19 years
        return gender === 'male' ? 'هرش' : 'فاطر'; // 20 years+
    }

    // DEFAULT (Sheep, Goats, Cows, Camels)
    // Using the logic found in ProductionStats
    if (months <= 6) return 'طفل';
    if (months <= 12) return 'جذع';
    if (months <= 24) return 'ثني';
    if (months <= 36) return 'رباع';
    if (months <= 48) return 'سداس';
    return 'تام';
};

export const getPossibleAgeLabels = (type: string = 'sheep', gender: 'male' | 'female' = 'female'): string[] => {
    const normalizedType = type.toLowerCase();

    // 1. CHICKENS
    if (normalizedType === 'دجاج' || normalizedType === 'ديك رومي' || normalizedType === 'دجاج حبشي' || normalizedType.includes('دجاج') || normalizedType.includes('رومي') || normalizedType.includes('حبشي')) {
        if (gender === 'male') return ['صوص', 'فرخ', 'عتريس', 'ديك'];
        return ['صوص', 'فرخ', 'بشارة', 'دجاجة'];
    }

    // 2. PIGEONS
    if (normalizedType === 'حمام' || normalizedType.includes('حمام')) {
        return ['زغلول', 'فـريخ', 'شـاب', 'شغال'];
    }

    // 3. DUCKS
    if (normalizedType === 'بط' || normalizedType.includes('بط')) {
        if (gender === 'male') return ['صوص البط', 'بط فتي', 'علج'];
        return ['صوص البط', 'بط فتي', 'بطة'];
    }

    // 4. QUAIL
    if (normalizedType === 'سمان' || normalizedType.includes('سمان')) {
        return ['صوص', 'فرخ', 'سمان'];
    }

    // 5. CAMELS
    if (normalizedType === 'إبل' || normalizedType === 'camels' || normalizedType === 'camel' || normalizedType.includes('إبل') ||
        ['مجاهيم', 'وضح', 'صفر', 'شعل', 'حمر'].includes(normalizedType)) {
        const oldLabel = gender === 'male' ? 'هرش' : 'فاطر';
        return ['حوار', 'مخلول', 'مفرود', 'لِقي', 'حِقّ', 'جذع', 'ثني', 'رباع', 'سديس', 'بازل', 'مخلف', oldLabel];
    }

    // DEFAULT (Sheep, Goats, Cows, Camels)
    return ['طفل', 'جذع', 'ثني', 'رباع', 'سداس', 'تام'];
};


