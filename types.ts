
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
  name: string;
  quantity: number;
  category?: 'grain' | 'fodder'; // New field
  unit: string;
  dailyConsumption: number;
  lastUpdated: string;
  lastAutoDeduction?: string;
  logs?: FeedLogEntry[];
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
}

export enum SheepType {
  NAIMI = 'نعيمي',
  HARI = 'حري',
  NAJDI = 'نجدي',
  SAWAKNI = 'سواكني',
  OTHER = 'أخرى'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
