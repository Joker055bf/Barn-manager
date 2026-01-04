import React, { useState, useEffect } from 'react';
import {
  Plus, Search, MoreVertical, LayoutGrid, Calendar, LogOut, ChevronLeft, ArrowRight, Star, Dna, Settings, Check, X, Filter,
  Warehouse, Wheat, ShieldCheck, Activity, Wallet, Eye, Edit, Trash2, Syringe, ArrowRightLeft, Skull, FileText, LayoutDashboard
} from 'lucide-react';
import { PenModal } from './components/PenModal';
import { SheepModal } from './components/SheepModal';
import { MoveSheepModal } from './components/MoveSheepModal';
import { MedicalModal } from './components/MedicalModal';
import { VaccinationGuide } from './components/VaccinationGuide';
import { ProductionStats } from './components/ProductionStats';
import { FeedManager } from './components/FeedManager';
import { ExpensesManager } from './components/ExpensesManager';
import { SheepStatsModal } from './components/SheepStatsModal';
import { ReportsModal } from './components/ReportsModal';
import { Pen, MedicalRecord, FeedItem, FeedLogEntry, Sheep, SheepType, ChatMessage, Expense } from './types';
import { getAnimalMetadata, calculateVaccineDueDate } from './utils/animalHelpers';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pens' | 'sheepList' | 'vaccines' | 'feed' | 'expenses'>('pens');

  // Navigation State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPenId, setSelectedPenId] = useState<string | null>(null);
  const [barnTab, setBarnTab] = useState<'pens' | 'feed' | 'vaccines' | 'expenses' | 'deaths'>('pens');

  // Data States
  const [pens, setPens] = useState<Pen[]>([]);
  const [allSheep, setAllSheep] = useState<Sheep[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ownerName, setOwnerName] = useState('المالك'); // Default owner name

  // Dashboard Stats
  const totalAnimals = allSheep.length;
  // Define sick as having active medical records (simplified logic: has pending vaccines or recent medical record)
  // For now, let's assume 'sick' if they have a medical record in the last 7 days that isn't a vaccine?
  // Or just use the user request "Healthy vs Sick".
  // Let's count "Sick" as animals currently in a "Sick" pen or having a note derived from medical?
  // User didn't specify exact logic, so I'll stick to a simple proxy:
  // Sick = Animals in a 'Medical/Isolation' pen (if exists) OR explicitly marked.
  // Actually, better: Sick = `medicalRecords` with `status: 'active'` (if we had that).
  // Let's use a proxy: "Sick" = count of unique animals with any medical record in last 14 days that is NOT a routine vaccine.
  // OR simpler: Just count total - healthy.
  // Let's assume all are healthy unless in mortality (which are dead).
  // Wait, the prompt says "Total", "Healthy", "Sick".
  // I will add a simplified heuristic: Sick = 0 for now unless we have a specific field.
  // Actually, I can check if they are in a pen named "Isolation" or similar.
  // Let's make it editable or just 0 for now to avoid confusion, or assume all in Pens are healthy.
  const sickCount = 0;
  const healthyCount = totalAnimals - sickCount;


  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheepModalOpen, setIsSheepModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);


  // Editing / Action States
  const [editingPen, setEditingPen] = useState<Pen | undefined>(undefined);
  const [editingSheep, setEditingSheep] = useState<Sheep | undefined>(undefined);
  const [selectedSheepForAction, setSelectedSheepForAction] = useState<Sheep | undefined>(undefined);

  // Batch Action State
  const [batchAction, setBatchAction] = useState<{ type: string, action: 'move' | 'vaccinate' } | null>(null);

  const isAddingGroup = activeTab === 'dashboard';

  // --- Logic for Automatic Feed Deduction (Retroactive Check) ---
  const processAutoFeedDeduction = (items: FeedItem[]): FeedItem[] => {
    const now = new Date();
    let hasChanges = false;

    const updatedItems = items.map(item => {
      // Skip if no daily consumption set or empty stock
      if (!item.dailyConsumption || item.dailyConsumption <= 0 || item.quantity <= 0) {
        return item;
      }

      // Determine when we last checked (or last updated manually)
      const lastCheckStr = item.lastAutoDeduction || item.lastUpdated;
      const lastCheck = new Date(lastCheckStr);

      // We want to find how many "8:00 AM" milestones have occurred between lastCheck and now
      let deductionsCount = 0;

      // Start checking from the day of lastCheck
      let cursorDate = new Date(lastCheck);
      // Set cursor to 8:00 AM of that day
      cursorDate.setHours(8, 0, 0, 0);

      // If the last check was already AFTER 8 AM on that day, move to the next day's 8 AM to start counting
      if (lastCheck >= cursorDate) {
        cursorDate.setDate(cursorDate.getDate() + 1);
      }

      // Loop to count how many 8 AMs we passed until now
      while (cursorDate <= now) {
        deductionsCount++;
        cursorDate.setDate(cursorDate.getDate() + 1); // Move to next day
      }

      if (deductionsCount > 0) {
        hasChanges = true;
        const totalToDeduct = item.dailyConsumption * deductionsCount;
        // Don't go below zero
        const newQuantity = Math.max(0, item.quantity - totalToDeduct);
        const actualDeducted = item.quantity - newQuantity;

        if (actualDeducted > 0) {
          // Create a log entry for this auto deduction
          const logEntry: FeedLogEntry = {
            id: crypto.randomUUID(),
            date: now.toISOString(), // Logged at current time
            amount: actualDeducted,
            type: 'consume',
            isAuto: true // Mark as automatic
          };

          // Append to logs (keep last 50)
          const newLogs = [logEntry, ...(item.logs || [])].slice(0, 50);

          return {
            ...item,
            quantity: newQuantity,
            lastAutoDeduction: now.toISOString(), // Update last check time
            logs: newLogs
          };
        }
      }

      return item;
    });

    return hasChanges ? updatedItems : items;
  };

  // Load from LocalStorage & Data Migration
  useEffect(() => {
    const savedPens = localStorage.getItem('rai_pens');
    const savedSheep = localStorage.getItem('rai_sheep');
    const savedFeed = localStorage.getItem('rai_feed');
    const savedExpenses = localStorage.getItem('rai_expenses');

    // Sheep loading moved to after Pen loading for validation
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

    // Load Feed and Process Auto Deductions
    if (savedFeed) {
      let parsedFeed: FeedItem[] = JSON.parse(savedFeed);
      const processedFeed = processAutoFeedDeduction(parsedFeed);
      setFeedItems(processedFeed);

      // Save updates if auto-deduction happened
      if (JSON.stringify(processedFeed) !== savedFeed) {
        localStorage.setItem('rai_feed', JSON.stringify(processedFeed));
      }
    }

    // --- Nuclear Data Sanitization Helper ---
    const sanitizeApplicationData = (
      rawPens: Pen[],
      rawSheep: Sheep[]
    ): { cleanPens: Pen[]; cleanSheep: Sheep[] } => {
      // 1. Filter Pens (Strict Ban List)
      const bannedKeywords = ['ذهبان', 'المهات', 'المهات 1', 'لببق', 'الزربه الرئيسية', 'الزربه الرئيسيه', 'امهات'];
      const cleanPens = rawPens.filter(p => !bannedKeywords.some(banned => p.name.includes(banned)));

      // 2. Filter Sheep (Referential Integrity Check)
      const validPenIds = new Set(cleanPens.map(p => p.id));
      // Allow mortality/transport/sales pens (usually prefixed or specific IDs)
      const isSystemPen = (id: string) => id.includes('mortality') || id === 'transport' || id === 'sales';

      let cleanSheep = rawSheep.filter(s => validPenIds.has(s.penId) || isSystemPen(s.penId));

      // 3. Fix Parent Relationships (Recursive Cleanup)
      const validSheepIds = new Set(cleanSheep.map(s => s.id));
      cleanSheep = cleanSheep.map(s => ({
        ...s,
        // If parent ID doesn't exist in our valid sheep list, remove the link
        motherId: s.motherId && validSheepIds.has(s.motherId) ? s.motherId : undefined,
        fatherId: s.fatherId && validSheepIds.has(s.fatherId) ? s.fatherId : undefined,
      }));

      // 4. Force Save Back to minimize "phantom" recurrence
      if (rawPens.length !== cleanPens.length || rawSheep.length !== cleanSheep.length) {
        console.log(`Sanitization Report: Removed ${rawPens.length - cleanPens.length} pens and ${rawSheep.length - cleanSheep.length} sheep.`);
        localStorage.setItem('rai_pens', JSON.stringify(cleanPens));
        localStorage.setItem('rai_sheep', JSON.stringify(cleanSheep));
      }

      return { cleanPens, cleanSheep };
    };

    try {
      if (savedPens) {
        let rawPens: Pen[] = [];
        try {
          rawPens = JSON.parse(savedPens);
        } catch (e) {
          console.error("Failed to parse pens", e);
          rawPens = [];
        }

        let rawSheep: Sheep[] = [];
        if (savedSheep) {
          try {
            rawSheep = JSON.parse(savedSheep);
          } catch (e) {
            console.error("Failed to parse sheep", e);
            rawSheep = [];
          }
        }

        // Ensure arrays
        if (!Array.isArray(rawPens)) rawPens = [];
        if (!Array.isArray(rawSheep)) rawSheep = [];

        // Perform Nuclear Clean
        const { cleanPens, cleanSheep } = sanitizeApplicationData(rawPens, rawSheep);

        setPens(cleanPens);
        setAllSheep(cleanSheep);

        // Data Migration: Ensure Main Pen exists
        let updatedPensForMigration = [...cleanPens];
        let dataChanged = false;

        const groups = updatedPensForMigration.filter(p => p.isGroup);
        groups.forEach(group => {
          const children = updatedPensForMigration.filter(p => p.parentId === group.id);
          if (children.length > 0) {
            const hasMain = children.some(p => p.isMain);
            if (!hasMain) {
              updatedPensForMigration = updatedPensForMigration.map(p =>
                p.id === children[0].id ? { ...p, isMain: true } : p
              );
              dataChanged = true;
            }
          }
        });

        setPens(updatedPensForMigration);
        if (dataChanged) {
          localStorage.setItem('rai_pens', JSON.stringify(updatedPensForMigration));
        }
      }
    } catch (err) {
      console.error("CRITICAL: Data loading failed", err);
      // Fallback to prevent white screen
      setPens([]);
      setAllSheep([]);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('rai_pens', JSON.stringify(pens));
  }, [pens]);

  useEffect(() => {
    localStorage.setItem('rai_sheep', JSON.stringify(allSheep));
  }, [allSheep]);

  useEffect(() => {
    localStorage.setItem('rai_feed', JSON.stringify(feedItems));
  }, [feedItems]);

  useEffect(() => {
    localStorage.setItem('rai_expenses', JSON.stringify(expenses));
  }, [expenses]);


  // --- Pen/Group Handlers ---

  const handleSavePen = (pen: Pen) => {
    if (editingPen) {
      setPens(pens.map(p => p.id === pen.id ? pen : p));
    } else {
      let isMainPen = false;
      if (!isAddingGroup && selectedGroupId) {
        const siblings = pens.filter(p => p.parentId === selectedGroupId);
        if (siblings.length === 0) {
          isMainPen = true;
        }
      }

      const newPen = {
        ...pen,
        isGroup: isAddingGroup,
        parentId: isAddingGroup ? undefined : selectedGroupId || undefined,
        isMain: isMainPen
      };
      setPens([...pens, newPen]);
    }
    setEditingPen(undefined);
  };

  const handleDeletePen = (id: string, isGroup: boolean) => {
    const msg = isGroup
      ? 'حذف الحظيرة الرئيسية سيؤدي لحذف جميع الأقسام بداخلها. هل أنت متأكد؟'
      : 'هل أنت متأكد من حذف هذا القسم؟ سيتم نقل جميع الحيوانات إلى القسم الرئيسي إن وجد.';

    if (confirm(msg)) {
      if (isGroup) {
        setPens(pens.filter(p => p.id !== id && p.parentId !== id));
      } else {
        const penToDelete = pens.find(p => p.id === id);
        if (penToDelete && penToDelete.parentId) {
          // Find Main Pen (sibling)
          const mainPen = pens.find(p => p.parentId === penToDelete.parentId && p.isMain && p.id !== id);

          if (mainPen) {
            // Move animals to Main Pen
            const animalsToMove = allSheep.filter(s => s.penId === id);
            if (animalsToMove.length > 0) {
              setAllSheep(allSheep.map(s => s.penId === id ? { ...s, penId: mainPen.id } : s));

              // Update counts
              setPens(pens.map(p => {
                if (p.id === id) return p; // Will be deleted anyway
                if (p.id === mainPen.id) return { ...p, currentCount: (p.currentCount || 0) + animalsToMove.length };
                return p;
              }).filter(p => p.id !== id));
            } else {
              setPens(pens.filter(p => p.id !== id));
            }
          } else {
            // No main pen, just delete (or maybe prevent? but current logic deletes)
            setPens(pens.filter(p => p.id !== id));
            setAllSheep(allSheep.filter(s => s.penId !== id));
          }
        } else {
          setPens(pens.filter(p => p.id !== id));
          setAllSheep(allSheep.filter(s => s.penId !== id));
        }
      }

      if (selectedGroupId === id) {
        setSelectedGroupId(null);
        setActiveTab('dashboard');
      }
    }
  };

  const openEditModal = (pen: Pen) => {
    setEditingPen(pen);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingPen(undefined);
    setIsModalOpen(true);
  };

  const enterGroup = (id: string) => {
    setSelectedGroupId(id);
    setActiveTab('pens');
    setBarnTab('pens'); // Default to pens tab
  };

  // --- Sheep Handlers ---

  const enterSheepList = (penId: string) => {
    setSelectedPenId(penId);
    setActiveTab('sheepList');
  }

  const handleSaveSheep = (sheepData: Sheep | Sheep[]) => {
    if (editingSheep && !Array.isArray(sheepData)) {
      setAllSheep(allSheep.map(s => s.id === sheepData.id ? sheepData : s));
    } else {
      const newList = Array.isArray(sheepData) ? sheepData : [sheepData];
      setAllSheep([...allSheep, ...newList]);

      // Update pen counts
      const countsByPen = newList.reduce((acc, s) => {
        acc[s.penId] = (acc[s.penId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const updatedPens = pens.map(p => {
        if (countsByPen[p.id]) {
          return { ...p, currentCount: (p.currentCount || 0) + countsByPen[p.id] };
        }
        return p;
      });
      setPens(updatedPens);
    }
    setEditingSheep(undefined);
  };

  const handleDeleteSheep = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الرأس؟')) {
      const sheepToDelete = allSheep.find(s => s.id === id);
      setAllSheep(allSheep.filter(s => s.id !== id));

      if (sheepToDelete) {
        const updatedPens = pens.map(p => {
          if (p.id === sheepToDelete.penId) {
            return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - 1) };
          }
          return p;
        });
        setPens(updatedPens);
      }
    }
  };

  const openNewSheepModal = () => {
    setEditingSheep(undefined);
    setIsSheepModalOpen(true);
  };

  const openEditSheepModal = (sheep: Sheep) => {
    setEditingSheep(sheep);
    setIsSheepModalOpen(true);
  };

  // --- Move Sheep Logic ---
  const openMoveModal = (sheep: Sheep) => {
    setSelectedSheepForAction(sheep);
    setIsMoveModalOpen(true);
  };

  const handleMoveSheep = (targetPenId: string, quantity?: number, gender?: 'male' | 'female', reason?: string) => {
    if (!targetPenId) return;

    // Handle Batch Move
    if (batchAction && batchAction.action === 'move') {
      const typeToMove = batchAction.type;
      const allTypeSheep = allSheep.filter(s =>
        s.penId === selectedPenId &&
        s.type === typeToMove &&
        (!gender || s.gender === gender)
      );
      const sheepToMove = quantity ? allTypeSheep.slice(0, quantity) : allTypeSheep;

      if (sheepToMove.length === 0) return;

      const idsToMove = new Set(sheepToMove.map(s => s.id));
      setAllSheep(allSheep.map(s => {
        if (idsToMove.has(s.id)) {
          return {
            ...s,
            penId: targetPenId,
            notes: reason && targetPenId.includes('mortality') ? reason : s.notes
          };
        }
        return s;
      }));

      // Update Counts
      setPens(pens.map(p => {
        if (p.id === selectedPenId) return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - sheepToMove.length) };
        if (p.id === targetPenId) return { ...p, currentCount: (p.currentCount || 0) + sheepToMove.length };
        return p;
      }));

      setBatchAction(null);
      setIsMoveModalOpen(false);
      return;
    }

    // Handle Single Move
    if (!selectedSheepForAction) return;
    const oldPenId = selectedSheepForAction.penId;

    const targetPen = pens.find(p => p.id === targetPenId);
    const isExclusionPen = targetPen?.isExclusion;

    const updatedSheep = {
      ...selectedSheepForAction,
      penId: targetPenId,
      notes: reason && targetPenId.includes('mortality') ? reason : selectedSheepForAction.notes,
      exclusionDate: isExclusionPen ? new Date().toISOString() : selectedSheepForAction.exclusionDate
    };

    setAllSheep(allSheep.map(s => s.id === selectedSheepForAction.id ? updatedSheep : s));

    setPens(pens.map(p => {
      if (p.id === oldPenId) return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - 1) };
      if (p.id === targetPenId) return { ...p, currentCount: (p.currentCount || 0) + 1 };
      return p;
    }));

    setIsMoveModalOpen(false);
    setSelectedSheepForAction(undefined);
  };


  // --- Medical Record Logic ---
  const openMedicalModal = (sheep: Sheep) => {
    setSelectedSheepForAction(sheep);
    setIsMedicalModalOpen(true);
  };

  const handleAddMedicalRecord = (record: MedicalRecord) => {
    // Handle Batch Vaccination
    if (batchAction && batchAction.action === 'vaccinate') {
      const typeToVaccinate = batchAction.type;
      const sheepToVaccinate = allSheep.filter(s => s.penId === selectedPenId && s.type === typeToVaccinate);

      const idsToUpdate = new Set(sheepToVaccinate.map(s => s.id));
      setAllSheep(allSheep.map(s => {
        if (idsToUpdate.has(s.id)) {
          return { ...s, medicalRecords: [...(s.medicalRecords || []), record] };
        }
        return s;
      }));

      setBatchAction(null);
      setIsMedicalModalOpen(false);
      return;
    }

    // Handle Single Vaccination
    if (!selectedSheepForAction) return;
    const updatedSheep = {
      ...selectedSheepForAction,
      medicalRecords: [...(selectedSheepForAction.medicalRecords || []), record]
    };
    setAllSheep(allSheep.map(s => s.id === updatedSheep.id ? updatedSheep : s));
    setSelectedSheepForAction(updatedSheep);
  };

  // --- Helpers ---
  const getOccupancyColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 0.9) return 'bg-red-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const calculateAgeDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const birth = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} سنة`;
    return `${months} شهر`;
  };

  const getAnimalAgeLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }

    const totalMonths = (years * 12) + months;

    if (totalMonths >= 0 && totalMonths <= 6) return 'طفل';
    if (totalMonths > 6 && totalMonths <= 12) return 'جذع';
    if (totalMonths > 12 && totalMonths <= 24) return 'ثني';
    if (totalMonths > 24 && totalMonths <= 36) return 'رباع';
    if (totalMonths > 36 && totalMonths <= 48) return 'سداس';
    return 'تام';
  };


  const hasPendingVaccines = (sheep: Sheep) => {
    const metadata = getAnimalMetadata(sheep.type);
    const vaccines = metadata?.vaccines || [];
    return vaccines.some(v => {
      const record = sheep.medicalRecords?.find(r => r.type === 'vaccine' && r.name === v.name);
      if (record) return false; // Taken

      const dueDate = calculateVaccineDueDate(sheep.birthDate, v.age);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 7;
    });
  };

  // --- Renderers ---
  // --- Renderers ---



  const renderDeceasedSheepRow = (sheep: Sheep) => {
    // Helper to resolve parent serial
    const getParentSerial = (id: string | undefined) => {
      if (!id) return '-';
      const parent = allSheep.find(s => s.id === id || s.serialNumber === id);
      return parent ? parent.serialNumber : id;
    };

    return (
      <div key={sheep.id} className="bg-white border border-red-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-sm transition gap-4 opacity-75">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500">
            <Skull size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              {sheep.serialNumber}
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sheep.type}</span>
            </h4>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <span>{calculateAgeDisplay(sheep.birthDate)}</span>
              <span>•</span>
              <span className="text-red-400">{sheep.notes}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dna size={14} className="text-gray-400" />
          <span className="text-xs">الأم: {getParentSerial(sheep.motherId)} / الأب: {getParentSerial(sheep.fatherId)}</span>
        </div>
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end">
          <button onClick={() => handleDeleteSheep(sheep.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف نهائي">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  const handleSellAnimal = (idOrType: string, reason: string, isBatch: boolean = false, quantity: number = 1, gender?: string) => {
    if (isBatch) {
      if (!selectedGroupId || !quantity || quantity <= 0) return;

      const type = idOrType;
      // Find candidate sheep in the current group
      const candidates = allSheep.filter(s =>
        pens.find(p => p.id === s.penId)?.parentId === selectedGroupId &&
        s.type === type &&
        (!gender || s.gender === gender)
      );

      // Limit by quantity
      const sheepToSell = candidates.slice(0, quantity);

      if (sheepToSell.length === 0) return;

      if (confirm(`هل أنت متأكد من بيع ${sheepToSell.length} رأس من ${type}؟ سيتم نقلهم إلى سجل المستبعدة.`)) {
        const targetMortalityPenId = `mortality:${selectedGroupId} `;
        const idsToSell = new Set(sheepToSell.map(s => s.id));

        // Update Sheep
        setAllSheep(allSheep.map(s => {
          if (idsToSell.has(s.id)) {
            return { ...s, penId: targetMortalityPenId, notes: reason || 'تم البيع' };
          }
          return s;
        }));

        // Update Pen Counts
        // We need to decrease counts from their respective pens
        const countsByPen = sheepToSell.reduce((acc, s) => {
          acc[s.penId] = (acc[s.penId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setPens(pens.map(p => {
          if (countsByPen[p.id]) {
            return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - countsByPen[p.id]) };
          }
          return p;
        }));
      }

    } else {
      // Single Animal Logic (Existing)
      const serialNumber = idOrType;
      const sheepToSell = allSheep.find(s => s.serialNumber === serialNumber && pens.find(p => p.id === s.penId)?.parentId === selectedGroupId);

      if (!sheepToSell) return;

      if (confirm(`هل أنت متأكد من بيع الحيوان #${serialNumber}؟ سيتم نقله إلى سجل المستبعدة.`)) {
        const targetMortalityPenId = selectedGroupId ? `mortality:${selectedGroupId} ` : '';
        if (!targetMortalityPenId) return;

        const updatedSheep = {
          ...sheepToSell,
          penId: targetMortalityPenId,
          notes: reason || 'تم البيع'
        };

        setAllSheep(allSheep.map(s => s.id === updatedSheep.id ? updatedSheep : s));

        setPens(pens.map(p => {
          if (p.id === sheepToSell.penId) {
            return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - 1) };
          }
          return p;
        }));
      }
    }
  };

  const [viewingSheep, setViewingSheep] = useState<Sheep | undefined>(undefined);

  const renderSheepRow = (sheep: Sheep) => (
    <div
      key={sheep.id}
      onClick={() => setViewingSheep(sheep)}
      className={`border border - gray - 100 rounded - 2xl p - 3 flex flex - col items - center justify - center gap - 2 hover: shadow - lg transition - all cursor - pointer hover: border - emerald - 200 group h - auto min - h - [90px] ${sheep.gender === 'male' ? 'bg-blue-50' : 'bg-pink-50'} `}
    >
      <div
        className={`w - 10 h - 8 rounded - lg flex items - center justify - center shadow - sm border border - white / 50 text - white ${sheep.tagColor ? '' : (sheep.gender === 'male' ? 'bg-[#795548]' : 'bg-pink-600')} `}
        style={{ backgroundColor: sheep.tagColor || undefined }}
      >
        <span className="font-bold text-lg leading-none">{sheep.serialNumber}</span>
      </div>

      <span className={`text - xs font - bold ${sheep.gender === 'male' ? 'text-blue-800' : 'text-pink-800'} `}>{sheep.type}</span>

      {hasPendingVaccines(sheep) && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
      )}
    </div>
  );

  const calculateDetailedAge = (dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} سنة`);
    if (months > 0) parts.push(`${months} شهر`);
    if (days > 0) parts.push(`${days} يوم`);

    return parts.length > 0 ? parts.join(' و ') : 'اليوم';
  };



  const renderDetailCard = (sheep: Sheep) => {
    return (
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm mx-auto shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w - 12 h - 12 rounded - full flex items - center justify - center font - bold text - lg ${sheep.tagColor ? 'text-white shadow-sm' : (sheep.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')} `}
              style={{ backgroundColor: sheep.tagColor || undefined }}
            >
              {/* Gender letter removed as requested */}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-800 text-xl">{sheep.serialNumber}</h4>
                <span className="text-lg font-bold text-black">
                  {sheep.type}
                  {sheep.nickname && <span className="text-sm text-gray-500 font-normal mr-1">({sheep.nickname})</span>}
                </span>
              </div>
              <div className="flex flex-col text-sm text-gray-500 mt-1">
                {/* Nickname moved to header */}
                <div className="flex flex-col mt-1">
                  <span className="text-sm font-bold text-gray-700">
                    {sheep.gender === 'male' ? 'ذكر' : 'أنثى'} ({getAnimalAgeLabel(sheep.birthDate)})
                  </span>
                  <span className="text-xs text-emerald-600 font-medium" dir="rtl">{calculateDetailedAge(sheep.birthDate)}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setViewingSheep(undefined)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {sheep.notes && (
          <div className="text-sm text-gray-600 bg-[#fcfbf4] border border-gray-100 rounded-xl p-3 mb-6 text-right">
            <span className="font-bold text-gray-400 block mb-1 text-[10px]">ملاحظات</span>
            {sheep.notes}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => { setViewingSheep(undefined); openMedicalModal(sheep); }} className="relative flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition">
            <Syringe size={20} className="mb-1" />
            تطعيم
            {hasPendingVaccines(sheep) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>
          <button onClick={() => { setViewingSheep(undefined); openMoveModal(sheep); }} className="flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition">
            <ArrowRightLeft size={20} className="mb-1" />
            نقل
          </button>
          <button onClick={() => { setViewingSheep(undefined); openEditSheepModal(sheep); }} className="flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-bold text-[#3E2723] bg-blue-50 hover:bg-blue-100 rounded-xl transition">
            <Edit size={20} className="mb-1" />
            تعديل
          </button>
        </div>
      </div>
    );
  };

  // --- Logic for Views ---

  // Unified Display Logic: If selectedGroupId exists, show children. If NOT, show Root Groups/Pens.
  const displayedPens = selectedGroupId
    ? pens.filter(p => p.parentId === selectedGroupId)
    : pens.filter(p => p.isGroup); // Showing only groups at root level as per original dashboard logic, or should we show all root items? Let's assume Root Groups (Barns).

  const selectedGroup = pens.find(p => p.id === selectedGroupId);
  const selectedPen = pens.find(p => p.id === selectedPenId);
  const displayedSheep = selectedPenId
    ? allSheep.filter(s => s.penId === selectedPenId)
    : selectedGroupId
      ? allSheep.filter(s => pens.find(p => p.id === s.penId)?.parentId === selectedGroupId)
      : [];

  // Mortality & Available Pens
  const mortalityPenId = selectedGroupId ? `mortality:${selectedGroupId} ` : '';
  const deceasedSheep = mortalityPenId ? allSheep.filter(s => s.penId === mortalityPenId) : [];

  const availablePensForMove = selectedGroupId ? [
    ...pens.filter(p => p.parentId === selectedGroupId && p.id !== selectedPenId && !p.isGroup),
    {
      id: mortalityPenId,
      name: 'المستبعدة',
      capacity: 9999,
      currentCount: deceasedSheep.length,
      isMain: false,
      parentId: selectedGroupId
    } as Pen
  ] : [];

  // Filter global sheep list for the current barn (for vaccines view)
  // We assume sheep belong to sub-pens of the barn.
  const barnSheep = selectedGroupId
    ? allSheep.filter(s => pens.find(p => p.id === s.penId)?.parentId === selectedGroupId)
    : [];

  const currentMetadata = getAnimalMetadata(selectedGroup?.animalType || 'sheep');

  // --- Renderers ---
  const renderPenCard = (pen: Pen) => (
    <div
      key={pen.id}
      onClick={() => pen.isGroup ? enterGroup(pen.id) : enterSheepList(pen.id)}
      className={`h - full flex flex - col bg - white rounded - [2rem] p - 5 shadow - sm border transition - all duration - 300 group relative animate - scale -in cursor - pointer hover: shadow - md ${pen.isMain ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100 hover:border-emerald-200'} `}
    >
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-2xl text-gray-800 flex items-center gap-2">
          {pen.name}
        </h3>
        {pen.isMain && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Star size={12} className="fill-current" />
            رئيسي
          </span>
        )}
      </div>

      <div className="mb-6 flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xl font-bold text-gray-800" dir="ltr">
            {pen.currentCount || 0} <span className="text-gray-400 text-sm font-normal">/ {pen.capacity || 50}</span>
          </span>
          <span className="text-sm text-gray-500 font-medium">السعة الحالية</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-100/80 rounded-full overflow-hidden">
          <div
            className={`h - full rounded - full transition - all duration - 500 ${pen.currentCount && pen.currentCount > (pen.capacity || 50) ? 'bg-red-500' : 'bg-emerald-500'} `}
            style={{ width: `${Math.min(100, ((pen.currentCount || 0) / (pen.capacity || 50)) * 100)}% ` }}
          ></div>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); handleDeletePen(pen.id, pen.isGroup || false); }}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition"
        >
          <Trash2 size={20} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); openEditModal(pen); }}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition"
        >
          <Edit size={20} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); pen.isGroup ? enterGroup(pen.id) : enterSheepList(pen.id); }}
          className="flex-1 bg-[#795548] text-white h-12 rounded-2xl text-base font-bold hover:bg-[#5D4037] transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Eye size={20} />
          عرض
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-800 bg-[#fcfbf4]">

      {/* Global Header - Simplified/Restored */}
      {/* Hide Header on Dashboard AND Root Pens View (My Barns List) */}
      {activeTab !== 'dashboard' && !(activeTab === 'pens' && !selectedGroupId) && (
        <div className="bg-white p-4 shadow-sm sticky top-0 z-30 mb-4 md:mb-0 hidden md:block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {(activeTab === 'pens' && selectedGroupId) || (activeTab === 'sheepList') ? (
                <button
                  onClick={() => {
                    if (activeTab === 'sheepList') { setSelectedPenId(null); setActiveTab('pens'); }
                    else { setSelectedGroupId(null); /* Stay in Pens, go to Root */ }
                  }}
                  className="p-2 rounded-xl bg-[#fcfbf4] hover:bg-gray-100 text-gray-500 transition"
                >
                  <ArrowRight size={20} className="rtl:rotate-180" />
                </button>
              ) : null}

              <h1 className="text-xl font-bold text-[#3E2723] flex items-center gap-3">
                {selectedPen ? selectedPen.name : (selectedGroup?.name || 'مزرعتي')}
              </h1>
            </div>
            {/* Top actions removed as per request to move to bottom center menu */}
          </div>
        </div>
      )}


      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* Unified Pens/Dashboard View */}
        {
          activeTab === 'pens' && (
            <div className="p-4 md:p-8 space-y-6 animate-fade-in h-full flex flex-col">


              {/* Content Area */}
              <div className="flex-1">
                {barnTab === 'pens' && (
                  <>

                    {/* Root View (Barns List) - Reverted to List View */}
                    {!selectedGroupId ? (
                      <div className="w-full max-w-md mx-auto">
                        {/* Simple Header */}
                        <div className="mb-4">
                          <h2 className="text-2xl font-bold text-[#3E2723]">حظائري</h2>
                        </div>

                        {/* Simple List View for Barns */}
                        <div className="space-y-2 mb-24">
                          {displayedPens.map(pen => (
                            <div
                              key={pen.id}
                              onClick={() => enterGroup(pen.id)}
                              className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#795548]/10 text-[#795548]">
                                  <Warehouse size={20} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base text-gray-800">
                                    {pen.name}
                                  </h3>
                                  <span className="text-xs text-gray-400">
                                    {pen.currentCount || 0} رأس
                                  </span>
                                </div>
                              </div>
                              <ChevronLeft className="text-gray-300 rtl:rotate-180" size={18} />
                            </div>
                          ))}
                        </div>

                        {displayedPens.length === 0 && (
                          <div className="text-center text-gray-400 py-12">
                            <Warehouse size={48} className="mx-auto mb-4 text-gray-200" />
                            <p>لا توجد حظائر مضافة</p>
                          </div>
                        )}

                        {/* Add Barn Button */}
                        <div className="fixed bottom-20 left-0 right-0 p-4 bg-[#fcfbf4]">
                          <button
                            onClick={openNewModal}
                            className="w-full bg-[#795548] text-white py-3 rounded-xl font-bold hover:bg-[#5D4037] transition flex items-center justify-center gap-2"
                          >
                            <Plus size={20} />
                            إضافة حظيرة
                          </button>
                        </div>

                      </div>
                    ) : (
                      /* Inner Group View (Sections) */
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-2xl font-bold text-[#3E2723]">الأقسام</h2>
                          <button
                            onClick={openNewModal}
                            className="bg-[#795548] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#5D4037] transition flex items-center gap-2"
                          >
                            <Plus size={20} />
                            إضافة قسم
                          </button>
                        </div>

                        {/* Grid View for Sections - Kept as Cards for Sections as per usual flow, or should this be list too? 
                           User said "Revert UI to v1.0.6", usually sections were cards. Keeping as cards for sections. */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          {displayedPens.map(pen => renderPenCard(pen))}
                        </div>

                        {displayedPens.length === 0 && (
                          <div className="text-center text-gray-400 py-8">لا توجد أقسام مضافة</div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {barnTab === 'feed' && selectedGroup && (
                  <div className="max-w-5xl mx-auto">
                    <FeedManager items={feedItems} onUpdate={setFeedItems} penId={selectedGroup.id} animalType={selectedGroup.animalType} />
                  </div>
                )}

                {barnTab === 'vaccines' && selectedGroup && (
                  <div className="max-w-4xl mx-auto">
                    <VaccinationGuide sheepList={barnSheep} animalType={selectedGroup.animalType} />
                  </div>
                )}

                {barnTab === 'expenses' && selectedGroup && (
                  <div className="max-w-5xl mx-auto">
                    <ExpensesManager
                      expenses={expenses}
                      onUpdate={setExpenses}
                      penId={selectedGroup.id}
                      animals={displayedSheep}
                      animalType={selectedGroup.animalType}
                      onSellAnimal={handleSellAnimal}
                    />
                  </div>
                )}

                {barnTab === 'deaths' && (
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <Skull size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-red-800">سجل المستبعدة</h2>
                        <p className="text-sm text-red-600"> الحيوانات المستبعدة من هذه الحظيرة ({deceasedSheep.length})</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {deceasedSheep.length > 0 ? (
                        (() => {
                          const grouped = deceasedSheep.reduce((acc, sheep) => {
                            const key = `${sheep.type} -${sheep.gender} -${sheep.notes} `;
                            // Only group if it's a "Batch" operation (indicated by similar notes or being poultry)
                            // For safety, let's group if type/gender/notes match.
                            // But we want to preserve individual dates if they differ?
                            // Batch sales usually happen at same time with same note.

                            if (!acc[key]) {
                              acc[key] = { ...sheep, _count: 1 };
                            } else {
                              acc[key]._count = (acc[key]._count || 1) + 1;
                            }
                            return acc;
                          }, {} as Record<string, Sheep & { _count?: number }>);

                          return Object.values(grouped).map((sheep: Sheep & { _count?: number }) => {
                            if (sheep._count && sheep._count > 1) {
                              return (
                                <div key={sheep.id} className="bg-white border border-red-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-sm transition gap-4 opacity-75">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500 relative">
                                      <Skull size={20} />
                                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {sheep._count}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        {sheep.type} ({sheep.gender === 'male' ? 'ذكور' : 'إناث'})
                                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">مجموعة ({sheep._count})</span>
                                      </h4>
                                      <p className="text-xs text-gray-400 mt-1">{calculateAgeDisplay(sheep.birthDate)}</p>
                                      {sheep.notes && <p className="text-xs text-red-500 font-medium mt-1">السبب: {sheep.notes}</p>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return renderDeceasedSheepRow(sheep);
                          });
                        })()
                      ) : (
                        <div className="text-center py-20 text-gray-400">
                          <Skull size={48} className="mx-auto mb-4 text-gray-200" />
                          <p>سجل المستبعدة نظيف</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Inner Barn View (Sections List) */}
              {selectedGroupId && barnTab === 'pens' && (
                <div className="max-w-5xl mx-auto space-y-6 pb-32">
                  <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedGroupId(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                        <ChevronLeft size={24} className="rtl:rotate-180" />
                      </button>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                          {selectedGroup?.name}
                          {selectedGroup?.isMain && <Star size={16} className="text-orange-500 fill-current" />}
                        </h2>
                        <p className="text-gray-500 mt-1">
                          {displayedPens.length === 0
                            ? 'لا يوجد أقسام'
                            : `${displayedPens.length} قسم`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={openNewModal}
                      className="bg-[#795548] text-white py-2 px-4 rounded-xl text-sm font-bold hover:bg-[#5D4037] transition flex items-center gap-2 shadow-sm"
                    >
                      <Plus size={18} />
                      إضافة قسم
                    </button>
                  </header>

                  {displayedPens.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedPens.map(pen => renderPenCard(pen))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                      <LayoutGrid size={48} className="mb-4 text-gray-200" />
                      <p>لم يتم إضافة أقسام بعد</p>
                      <button onClick={openNewModal} className="mt-4 text-[#795548] font-bold hover:underline">
                        + إضافة أول قسم
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* Bottom Navigation Bar - Only Visible Inside a Barn (Group) */}
              {selectedGroupId && (
                <div className="fixed bottom-0 md:bottom-4 left-0 right-0 md:left-64 md:right-4 z-50 flex justify-center pointer-events-none">
                  <div className="bg-white border border-gray-100 rounded-t-[30px] md:rounded-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] w-full md:max-w-lg pointer-events-auto flex items-end justify-between px-2 pb-2">

                    {/* Left Group (Financial, Vaccines) */}
                    <button onClick={() => selectedGroup ? setBarnTab('expenses') : alert('اختر حظيرة أولاً')} className={`flex - 1 flex flex - col items - center justify - center gap - 1 py - 3 transition ${barnTab === 'expenses' ? 'text-[#795548] font-bold' : 'text-gray-400 hover:text-gray-600'} `}>
                      <div className={`p - 1 rounded - xl ${barnTab === 'expenses' ? 'bg-[#795548]/10' : ''} `}>
                        <Wallet size={24} strokeWidth={barnTab === 'expenses' ? 2.5 : 2} />
                      </div>
                      <span className="text-[10px]">المالية</span>
                    </button>

                    <button onClick={() => selectedGroup ? setBarnTab('vaccines') : alert('اختر حظيرة أولاً')} className={`flex - 1 flex flex - col items - center justify - center gap - 1 py - 3 transition ${barnTab === 'vaccines' ? 'text-[#795548] font-bold' : 'text-gray-400 hover:text-gray-600'} `}>
                      <div className={`p - 1 rounded - xl ${barnTab === 'vaccines' ? 'bg-[#795548]/10' : ''} `}>
                        <ShieldCheck size={24} strokeWidth={barnTab === 'vaccines' ? 2.5 : 2} />
                      </div>
                      <span className="text-[10px]">التحصين</span>
                    </button>


                    {/* Center Main Action Button (Plus) */}
                    <div className="relative -top-6 mx-2">
                      <button
                        onClick={() => setIsDashboardOpen(true)}
                        className="w-14 h-14 bg-[#795548] rounded-full shadow-lg shadow-[#795548]/40 flex items-center justify-center text-white border-4 border-[#fcfbf4] transform transition active:scale-95"
                      >
                        <Plus size={32} strokeWidth={3} />
                      </button>
                    </div>

                    {/* Right Group (Stock, Pens) */}
                    <button onClick={() => selectedGroup ? setBarnTab('feed') : alert('اختر حظيرة أولاً')} className={`flex - 1 flex flex - col items - center justify - center gap - 1 py - 3 transition ${barnTab === 'feed' ? 'text-[#795548] font-bold' : 'text-gray-400 hover:text-gray-600'} `}>
                      <div className={`p - 1 rounded - xl ${barnTab === 'feed' ? 'bg-[#795548]/10' : ''} `}>
                        <Wheat size={24} strokeWidth={barnTab === 'feed' ? 2.5 : 2} />
                      </div>
                      <span className="text-[10px]">المخزون</span>
                    </button>

                    <button onClick={() => setBarnTab('pens')} className={`flex - 1 flex flex - col items - center justify - center gap - 1 py - 3 transition ${barnTab === 'pens' ? 'text-gray-800 font-bold' : 'text-gray-400 hover:text-gray-600'} `}>
                      <div className={`p - 2 rounded - 2xl ${barnTab === 'pens' ? 'bg-[#dcfce7]' : ''} transition - colors duration - 300`}>
                        <Warehouse size={24} strokeWidth={barnTab === 'pens' ? 2.5 : 2} className={barnTab === 'pens' ? 'text-[#3E2723]' : ''} />
                      </div>
                      <span className="text-[10px]">الأقسام</span>
                    </button>

                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* Sheep List (Drill Down from Pen) */}
        {
          activeTab === 'sheepList' && selectedPen && (
            <div className="p-4 md:p-8 space-y-6 animate-fade-in h-full">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedPenId(null); setActiveTab('pens'); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition" title="عودة للأقسام">
                    <ArrowRight size={24} className="rtl:rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                      {selectedPen.name}
                      {selectedPen.isMain && <Star size={16} className="text-orange-500 fill-current" />}
                    </h2>
                    <p className="text-gray-500 mt-1">{displayedSheep.length} {currentMetadata.headLabel} من {currentMetadata.label.plural}</p>

                  </div>
                </div>



              </header>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {displayedSheep.length > 0 ? (
                  <div className={`p - 3 ${(selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') ? '' : 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'} `}>
                    {(selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') && (
                      <div className="mb-6 grid grid-cols-2 gap-3">
                        {/* Grouped View for Poultry with Breakdowns and Actions */}
                        {Object.values(
                          displayedSheep.reduce((acc, sheep) => {
                            const type = sheep.type;
                            if (!acc[type]) acc[type] = { type, male: 0, female: 0 };
                            if (sheep.gender === 'male') acc[type].male++;
                            else acc[type].female++;
                            return acc;
                          }, {} as Record<string, { type: string; male: number; female: number }>)
                        ).map((group: { type: string; male: number; female: number }) => (
                          <div key={group.type} className="bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition h-full flex flex-col justify-between">
                            <div className="flex flex-col gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                  <Dna size={18} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base text-gray-800">{group.type}</h3>
                                  <p className="text-[10px] text-gray-400">إجمالي: {group.male + group.female}</p>
                                </div>
                              </div>

                              {/* Batch Actions */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setBatchAction({ type: group.type, action: 'vaccinate' });
                                    setIsMedicalModalOpen(true);
                                  }}
                                  className="flex-1 flex justify-center items-center gap-1 py-1 px-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                                >
                                  <Syringe size={12} /> تطعيم
                                </button>
                                <button
                                  onClick={() => {
                                    setBatchAction({ type: group.type, action: 'move' });
                                    setIsMoveModalOpen(true);
                                  }}
                                  className="flex-1 flex justify-center items-center gap-1 py-1 px-1 text-[10px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                                >
                                  <ArrowRightLeft size={12} /> نقل
                                </button>
                              </div>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-blue-50/50 rounded-lg p-2 text-center border border-blue-100">
                                <span className="block text-gray-500 text-[10px] mb-0.5">ذكور</span>
                                <span className="text-lg font-bold text-[#3E2723]">{group.male}</span>
                              </div>
                              <div className="bg-pink-50/50 rounded-lg p-2 text-center border border-pink-100">
                                <span className="block text-gray-500 text-[10px] mb-0.5">إناث</span>
                                <span className="text-lg font-bold text-pink-700">{group.female}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed View for Sheep/Others (Hide for Poultry) */}
                    {!(selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') &&
                      displayedSheep.map(sheep => renderSheepRow(sheep))
                    }
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                    <div className="bg-[#fcfbf4] p-6 rounded-full mb-4"><Dna size={40} className="text-gray-300" /></div>
                    <p className="text-lg font-medium">لا توجد {currentMetadata.label.plural} في هذا القسم</p>
                    {selectedPen.isMain ? (
                      <p className="text-sm">أضف {currentMetadata.label.plural} لمتابعتها</p>
                    ) : (
                      <p className="text-sm">قم بنقل {currentMetadata.label.plural} من القسم الرئيسي إلى هنا</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      </main>

      {/* Dashboard Summary Modal */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fcfbf4] w-full max-w-lg h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative">

            {/* Header */}
            <div className="p-6 pb-2 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#3E2723] flex items-center gap-2">
                <LayoutDashboard className="text-orange-600" />
                ملخص المزرعة
              </h2>
              <button onClick={() => setIsDashboardOpen(false)} className="p-2 bg-white rounded-full hover:bg-gray-100 transition shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Owner Name */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-orange-100">
                <label className="text-xs font-bold text-gray-400 mb-2 block">مالك المزرعة</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl border-2 border-orange-100">
                    {ownerName.charAt(0)}
                  </div>
                  {isEditingOwner ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="flex-1 border-b-2 border-orange-300 focus:outline-none bg-transparent font-bold text-lg text-gray-800"
                        autoFocus
                      />
                      <button onClick={() => setIsEditingOwner(false)} className="bg-green-500 text-white p-2 rounded-full"><Check size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex-1 flex justify-between items-center cursor-pointer" onClick={() => setIsEditingOwner(true)}>
                      <h3 className="text-xl font-bold text-gray-800">{ownerName}</h3>
                      <Edit size={16} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <span className="block text-gray-400 text-xs font-bold mb-1">الإجمالي</span>
                  <span className="text-2xl font-black text-gray-800">{allSheep.length}</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-100 text-center">
                  <span className="block text-emerald-600/70 text-xs font-bold mb-1">سليم</span>
                  <span className="text-2xl font-black text-emerald-700">{allSheep.filter(s => s.status === 'healthy').length}</span>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100 text-center">
                  <span className="block text-red-600/70 text-xs font-bold mb-1">مريض</span>
                  <span className="text-2xl font-black text-red-700">{allSheep.filter(s => s.status === 'sick').length}</span>
                </div>
              </div>

              {/* Distribution */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 text-sm">التوزيع حسب الحظيرة</h3>
                <div className="space-y-4">
                  {pens.filter(p => p.parentId === null).map((barn) => {
                    const count = allSheep.filter(s => {
                      const pen = pens.find(p => p.id === s.penId);
                      return pen?.parentId === barn.id || pen?.id === barn.id;
                    }).length;
                    if (count === 0) return null;
                    return (
                      <div key={barn.id}>
                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                          <span>{barn.name}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#795548]" style={{ width: `${(count / allSheep.length) * 100}% ` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 pb-4">
                <button onClick={() => { setIsDashboardOpen(false); openNewSheepModal(); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-200 transition group">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-full group-hover:scale-110 transition"><Dna size={20} /></div>
                  <span className="font-bold text-sm text-gray-700">إضافة رأس</span>
                </button>
                <button onClick={() => { setIsDashboardOpen(false); openNewModal(); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition group">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition"><Warehouse size={20} /></div>
                  <span className="font-bold text-sm text-gray-700">إضافة حظيرة</span>
                </button>
                <button onClick={() => { setIsDashboardOpen(false); setIsReportsModalOpen(true); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-teal-50 hover:border-teal-200 transition group">
                  <div className="p-3 bg-teal-100 text-teal-600 rounded-full group-hover:scale-110 transition"><FileText size={20} /></div>
                  <span className="font-bold text-sm text-gray-700">التقارير والمبيعات</span>
                </button>
                <button onClick={() => { setIsDashboardOpen(false); setIsStatsModalOpen(true); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200 transition group">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:scale-110 transition"><Activity size={20} /></div>
                  <span className="font-bold text-sm text-gray-700">السجل العام</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Action Menu (Top Right Dropdown) */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/20 backdrop-blur-sm" onClick={() => setIsActionMenuOpen(false)}>
          <div className="bg-white w-64 mt-12 rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="p-2 space-y-1">
              <button onClick={() => { setIsActionMenuOpen(false); setIsReportsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                <FileText size={18} className="text-teal-600" />
                التقارير والمبيعات
              </button>
              <button onClick={() => { setIsActionMenuOpen(false); setIsStatsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                <Activity size={18} className="text-purple-600" />
                السجل العام
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button onClick={() => { setIsActionMenuOpen(false); setIsDashboardOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                <LayoutDashboard size={18} className="text-orange-600" />
                لوحة التحكم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductionStats
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        allSheep={allSheep}
        pens={pens}
      />
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        allSheep={allSheep}
        feedItems={feedItems}
        expenses={expenses}
        pens={pens}
      />
      <PenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePen} initialData={editingPen} isGroupMode={isAddingGroup} />
      <SheepModal isOpen={isSheepModalOpen} onClose={() => setIsSheepModalOpen(false)} onSave={handleSaveSheep} initialData={editingSheep} penId={selectedPenId || (selectedGroupId ? pens.find(p => p.parentId === selectedGroupId && p.isMain)?.id : '') || ''} animalType={selectedGroup?.animalType} existingSheep={allSheep} pens={pens} />
      <MedicalModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        sheep={selectedSheepForAction}
        onAddRecord={handleAddMedicalRecord}
      />
      <MoveSheepModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleMoveSheep}
        currentPenId={selectedPenId || ''}
        availablePens={availablePensForMove}
        breakdown={batchAction && batchAction.action === 'move' ? {
          male: displayedSheep.filter(s => s.type === batchAction.type && s.gender === 'male').length,
          female: displayedSheep.filter(s => s.type === batchAction.type && s.gender === 'female').length
        } : undefined}
      />
      {/* Detail View Modal */}
      {
        viewingSheep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingSheep(undefined)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              {renderDetailCard(viewingSheep)}
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
