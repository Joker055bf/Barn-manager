export const translations = {
    ar: {
        // General
        appName: 'مدير الحظيرة',
        settings: 'الإعدادات',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        view: 'عرض',
        back: 'رجوع',
        confirm: 'تأكيد',

        // Dashboard
        dashboard: 'لوحة التحكم',
        myBarns: 'حظائري',
        addBarn: 'إضافة حظيرة',
        productionStats: 'سجل الانتاج و الاحصائيات',
        recentEvents: 'سجل الأحداث',
        noEvents: 'لا توجد أحداث',

        // Filters & Search
        searchPlaceholder: 'بحث...',
        dateFrom: 'من:',
        dateTo: 'إلى:',
        clearDate: 'مسح التاريخ',

        // Barn/Group
        ownerName: 'المالك',
        barnName: 'اسم الحظيرة',
        animalType: 'نوع الحيوان',
        sheepCount: 'العدد',

        // Navigation
        main: 'الرئيسية',
        financial: 'المالية',
        vaccinations: 'التحصينات',
        feed: 'الأعلاف',
        inventory: 'المخزون',

        // Modals
        close: 'إغلاق',
        language: 'اللغة',
        appearance: 'المظهر',
        darkMode: 'وضع الليل',
        lightMode: 'وضع النهار',

        // Dashboard Stats
        farmSummary: 'ملخص المزرعة',
        nameLabel: 'اسم مالك المزرعة',
        males: 'ذكور',
        females: 'إناث',
        total: 'إجمالي',
        vaccinate: 'تطعيم',
        move: 'نقل',
        barnOwner: 'مالك الحظيرة',
        farmOwner: 'مالك المزرعة',
        logout: 'تسجيل الخروج',
        shareApp: 'مشاركة التطبيق',
        sections: 'الأقسام',
        addSection: 'إضافة قسم',
        typeStats: 'إحصائيات النوع',
        details: 'التفاصيل',
        head: 'رأس',
        stock: 'المخزون',
        financials: 'المالية',
        vaccination: 'التحصين',
        male: 'ذكر',
        female: 'أنثى',
        year: 'سنة',
        month: 'شهر',
        day: 'يوم',
        today: 'اليوم',
        invalidDate: 'تاريخ غير صحيح',
    },
    en: {
        // General
        appName: 'Barn Manager',
        settings: 'Settings',
        save: 'Save Changes',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        back: 'Back',
        confirm: 'Confirm',

        // Dashboard
        dashboard: 'Dashboard',
        myBarns: 'My Barns',
        addBarn: 'Add Barn',
        productionStats: 'Production & Statistics',
        recentEvents: 'Recent Events',
        noEvents: 'No events found',

        // Filters & Search
        searchPlaceholder: 'Search...',
        dateFrom: 'From:',
        dateTo: 'To:',
        clearDate: 'Clear Date',

        // Barn/Group
        ownerName: 'Owner',
        barnName: 'Barn Name',
        animalType: 'Animal Type',
        sheepCount: 'Count',

        // Navigation
        main: 'Home',
        financial: 'Financial',
        vaccinations: 'Vaccinations',
        feed: 'Feed',
        inventory: 'Inventory',

        // Modals
        close: 'Close',
        language: 'Language',
        appearance: 'Appearance',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',

        // Dashboard Stats
        farmSummary: 'Farm Summary',
        nameLabel: 'Farm Owner Name',
        males: 'Males',
        females: 'Females',
        total: 'Total',
        vaccinate: 'Vaccinate',
        move: 'Move',
        barnOwner: 'Barn Owner',
        farmOwner: 'Farm Owner',
        logout: 'Logout',
        shareApp: 'Share App',
        sections: 'Sections',
        addSection: 'Add Section',
        typeStats: 'Type Statistics',
        details: 'Details',
        head: 'Head',
        stock: 'Stock',
        financials: 'Financials',
        vaccination: 'Vaccination',
        male: 'Male',
        female: 'Female',
        year: 'Year',
        month: 'Month',
        day: 'Day',
        today: 'Today',
        invalidDate: 'Invalid Date',
    }
};

export type TranslationKey = keyof typeof translations.ar;
