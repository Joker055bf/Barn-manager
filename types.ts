
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
  sortOrder?: number;
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
  consumptionMethod?: 'uniform' | 'varied';
  variedDailyConsumption?: {
    0?: number; // Sunday
    1?: number; // Monday
    2?: number; // Tuesday
    3?: number; // Wednesday
    4?: number; // Thursday
    5?: number; // Friday
    6?: number; // Saturday
  };
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
  source?: 'born' | 'purchase';
  reproductionStatus?: 'empty' | 'pregnant' | 'mother';
  lastBirthDate?: string;
  weaningDate?: string;
  reproductionHistory?: any[];
  lastMatingDate?: string;
  expectedBirthDate?: string;
  pregnancyDate?: string;
  lactationStartDate?: string;
  movementHistory?: {
    fromPenId: string;
    toPenId: string;
    fromPenName: string;
    toPenName: string;
    movedBy: string;
    date: string;
  }[];
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

export interface UserMessage {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  type: 'text' | 'audio';
  content: string;
  peaks?: number[];
  timestamp: string;
  read: boolean;
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
  canAddDeath: boolean;
  canMoveAnimals: boolean;
  canViewActivity: boolean;
  canViewProduction: boolean;
  canAddPens: boolean;
  canEditPens: boolean;
  canDeletePens: boolean;
  canReorderPens: boolean;
  canDeleteAnimals: boolean;
  canDeleteExpenses: boolean;
  canAddBarns: boolean;
  canEditBarns: boolean;
  canDeleteBarns: boolean;
  canViewEvents: boolean;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: 'owner' | 'worker';
  action: string;
  detail: string;
  timestamp: string;
  tagColor?: string;
  serialNumber?: string;
  changes?: string[];
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
  permissionsPerBarn?: { [barnId: string]: WorkerPermissions };
  avatar?: string;
  settingsPin?: string;
  accessiblePens?: string[];
  fcmToken?: string;
  email?: string;
  vapidKey?: string;
  firebaseApiKey?: string;
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
  canAddDeath: false,
  canMoveAnimals: true,
  canViewActivity: false,
  canViewProduction: false,
  canAddPens: false,
  canEditPens: false,
  canDeletePens: false,
  canReorderPens: false,
  canDeleteAnimals: false,
  canDeleteExpenses: false,
  canAddBarns: false,
  canEditBarns: false,
  canDeleteBarns: false,
  canViewEvents: true,
};
