
export interface Pen {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  currentCount?: number;
  type?: SheepType;
  notes?: string;
  lastCleaned?: string;
  showInDashboard?: boolean;
  isGroup?: boolean;
  parentId?: string;
  isMain?: boolean;
  animalType?: string;
  isExclusion?: boolean;
  ownerName?: string;
}

export interface MedicalRecord {
  id: string;
  date: string;
  type: 'vaccine' | 'treatment' | 'checkup';
  name: string;
  notes?: string;
  createdAt?: string;
}

export interface FeedLogEntry {
  id: string;
  date: string;
  amount: number;
  type: 'add' | 'consume';
  isAuto?: boolean;
  addedBy?: string;
}

export interface FeedItem {
  id: string;
  penId?: string; // Linked to a specific Barn/Group (optional for backward compat)
  name: string;
  quantity: number;
  category?: 'grain' | 'fodder';
  unit: string;
  dailyConsumption: number;
  lastUpdated: string;
  lastAutoDeduction?: string;
  logs?: FeedLogEntry[];
}

export interface Expense {
  id: string;
  penId: string;
  title: string;
  amount: number;
  date: string;
  category: 'feed' | 'medical' | 'maintenance' | 'labor' | 'purchase' | 'sales' | 'other';
  notes?: string;
  relatedAnimalId?: string;
  quantity?: number;
  gender?: 'male' | 'female';
  createdAt?: string;
}

export interface Sale {
  id: string;
  penId: string;
  title: string;
  amount: number;
  date: string;
  category: 'sheep' | 'wool' | 'milk' | 'manure' | 'poultry' | 'other';
  notes?: string;
  relatedAnimalId?: string;
  quantity?: number;
  buyer?: string;
  createdAt?: string;
}

export interface Death {
  id: string;
  penId: string;
  sheepId: string;
  serialNumber: string;
  date: string;
  reason: string;
  notes?: string;
  type: SheepType;
  gender: 'male' | 'female';
  ageAtDeath?: string;
  createdAt?: string;
}

export interface Sheep {
  id: string;
  penId: string;
  serialNumber: string;
  type: SheepType;
  gender: 'male' | 'female';
  birthDate: string;
  fatherId?: string;
  motherId?: string;
  notes?: string;
  medicalRecords?: MedicalRecord[];
  tagColor?: string;
  color?: string;
  nickname?: string;
  exclusionDate?: string;
  createdAt?: string;
  status?: 'healthy' | 'sick';
  healthStatus?: 'healthy' | 'sick';
  addedBy?: string;
  reproductionStatus?: 'empty' | 'pregnant' | 'mother';
  lastBirthDate?: string;
  weaningDate?: string;
  reproductionHistory?: any[];
  lastMatingDate?: string;
  expectedBirthDate?: string;
}

export enum SheepType {
  HARI = 'حري',
  NAIMI = 'نعيمي',
  NAJDI = 'نجدي',
  SAWAKNI = 'سواكني',
  GOAT = 'ماعز',
  OTHER = 'أخرى',
  CHICKEN = 'دجاج',
  PIGEON = 'حمام',
  DUCK = 'بط',
  GUINEA_FOWL = 'دجاج حبشي',
  TURKEY = 'ديك رومي',
  QUAIL = 'سمان',
  MAJAHEEM = 'مجاهيم',
  WADAH = 'وضح',
  SAFAR = 'صفر',
  SHAAL = 'شعل',
  HOMR = 'حمر'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface WorkerPermissions {
  canAddAnimals: boolean;
  canEditAnimals: boolean;
  canViewFinance: boolean;
  canAddExpenses: boolean;
  canViewFeed: boolean;
  canEditFeed: boolean;
  canAddMedical: boolean;
  canViewReports: boolean;
  canManagePens: boolean;
  canViewDeaths: boolean;
  canMoveAnimals: boolean;
  canViewActivity: boolean;
  canViewProduction: boolean;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: 'owner' | 'worker';
  action: string;
  detail: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'owner' | 'worker';
  name: string;
  createdAt: string;
  ownerId: string; // The ID of the owner this user belongs to
  permissions?: WorkerPermissions;
  settingsPin?: string;
  accessiblePens?: string[];
}

export const DEFAULT_WORKER_PERMISSIONS: WorkerPermissions = {
  canAddAnimals: true,
  canEditAnimals: true,
  canViewFinance: false,
  canAddExpenses: false,
  canViewFeed: true,
  canEditFeed: false,
  canAddMedical: true,
  canViewReports: false,
  canManagePens: false,
  canViewDeaths: true,
  canMoveAnimals: true,
  canViewActivity: false,
  canViewProduction: false,
};
