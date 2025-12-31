
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
}

export interface MedicalRecord {
  id: string;
  date: string;
  type: 'vaccine' | 'treatment' | 'checkup';
  name: string;
  notes?: string;
}

export interface FeedLogEntry {
  id: string;
  date: string;
  amount: number;
  type: 'add' | 'consume';
  isAuto?: boolean;
}

export interface FeedItem {
  id: string;
  penId: string; // Linked to a specific Barn/Group
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
  category: 'feed' | 'medical' | 'maintenance' | 'labor' | 'sales' | 'other';
  notes?: string;
  relatedAnimalId?: string;
  quantity?: number; // For poultry counts
  gender?: 'male' | 'female'; // For specifying poultry gender in sales
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
  nickname?: string;
  exclusionDate?: string;
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
  QUAIL = 'سمان'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
