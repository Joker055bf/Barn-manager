import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Edit, 
  Warehouse,
  MessageSquareQuote,
  MoreVertical,
  ArrowRight,
  ChevronLeft,
  Eye,
  Calendar,
  Dna,
  ArrowRightLeft,
  Syringe,
  Wheat,
  ShieldCheck,
  Activity,
  Star
} from 'lucide-react';
import { PenModal } from './components/PenModal';
import { SheepModal } from './components/SheepModal';
import { AdvisorChat } from './components/AdvisorChat';
import { MoveSheepModal } from './components/MoveSheepModal';
import { MedicalModal } from './components/MedicalModal';
import { VaccinationGuide } from './components/VaccinationGuide';
import { FeedManager } from './components/FeedManager';
import { Pen, SheepType, Sheep, MedicalRecord, FeedItem, FeedLogEntry } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pens' | 'advisor' | 'sheepList' | 'vaccines' | 'feed'>('dashboard');
  const [pens, setPens] = useState<Pen[]>([]);
  const [allSheep, setAllSheep] = useState<Sheep[]>([]); 
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]); 

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheepModalOpen, setIsSheepModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  
  // Editing / Action States
  const [editingPen, setEditingPen] = useState<Pen | undefined>(undefined);
  const [editingSheep, setEditingSheep] = useState<Sheep | undefined>(undefined); 
  const [selectedSheepForAction, setSelectedSheepForAction] = useState<Sheep | undefined>(undefined);

  // Navigation Selection
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPenId, setSelectedPenId] = useState<string | null>(null);
  
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

    if (savedSheep) setAllSheep(JSON.parse(savedSheep));
    
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

    if (savedPens) {
      let parsedPens: Pen[] = JSON.parse(savedPens);
      
      // Data Migration: Ensure Main Pen exists
      const groups = parsedPens.filter(p => p.isGroup);
      let dataChanged = false;

      groups.forEach(group => {
        const children = parsedPens.filter(p => p.parentId === group.id);
        if (children.length > 0) {
          const hasMain = children.some(p => p.isMain);
          if (!hasMain) {
            parsedPens = parsedPens.map(p => 
              p.id === children[0].id ? { ...p, isMain: true } : p
            );
            dataChanged = true;
          }
        }
      });

      setPens(parsedPens);
      if (dataChanged) {
        localStorage.setItem('rai_pens', JSON.stringify(parsedPens));
      }
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
      : 'هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الأغنام بداخله.';
      
    if (confirm(msg)) {
      if (isGroup) {
        setPens(pens.filter(p => p.id !== id && p.parentId !== id));
      } else {
        setPens(pens.filter(p => p.id !== id));
        setAllSheep(allSheep.filter(s => s.penId !== id));
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
  };

  // --- Sheep Handlers ---

  const enterSheepList = (penId: string) => {
    setSelectedPenId(penId);
    setActiveTab('sheepList');
  }

  const handleSaveSheep = (sheep: Sheep) => {
    if (editingSheep) {
      setAllSheep(allSheep.map(s => s.id === sheep.id ? sheep : s));
    } else {
      setAllSheep([...allSheep, sheep]);
      const updatedPens = pens.map(p => {
         if (p.id === sheep.penId) {
             return { ...p, currentCount: (p.currentCount || 0) + 1 };
         }
         return p;
      });
      setPens(updatedPens);
    }
    setEditingSheep(undefined);
  };

  const handleDeleteSheep = (id: string) => {
     if(confirm('هل أنت متأكد من حذف هذا الرأس؟')) {
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

  const handleMoveSheep = (targetPenId: string) => {
    if (!selectedSheepForAction || !targetPenId) return;

    const oldPenId = selectedSheepForAction.penId;
    setAllSheep(allSheep.map(s => s.id === selectedSheepForAction.id ? { ...s, penId: targetPenId } : s));

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

  // --- Renderers ---
  const renderPenCard = (pen: Pen) => (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border transition group relative animate-scale-in ${pen.isMain ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100 hover:border-emerald-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div onClick={() => enterSheepList(pen.id)} className="cursor-pointer">
          <h3 className="font-bold text-lg text-gray-800 hover:text-emerald-600 transition flex items-center gap-2">
            {pen.name}
            {pen.isMain && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200">
                <Star size={10} fill="currentColor" />
                الرئيسي
              </span>
            )}
          </h3>
        </div>
      </div>
      <div className="space-y-3 cursor-pointer" onClick={() => enterSheepList(pen.id)}>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">السعة الحالية</span>
            <span className="font-bold text-gray-900 ltr:ml-1" dir="ltr">{pen.currentCount || 0} / {pen.capacity || 0}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getOccupancyColor(pen.currentCount || 0, pen.capacity || 1)}`} 
              style={{ width: `${Math.min(100, ((pen.currentCount || 0) / (pen.capacity || 1)) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
        <button onClick={() => enterSheepList(pen.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm font-medium shadow-sm">
          <Eye size={16} /> عرض الأغنام
        </button>
        <div className="w-px h-6 bg-gray-200"></div>
        <div className="flex gap-1">
            <button onClick={() => openEditModal(pen)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition" title="تعديل">
            <Edit size={16} />
            </button>
            <button onClick={() => handleDeletePen(pen.id, false)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="حذف">
            <Trash2 size={16} />
            </button>
        </div>
      </div>
    </div>
  );

  const renderSheepRow = (sheep: Sheep) => (
      <div key={sheep.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-sm transition gap-4">
          <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${sheep.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                 {sheep.gender === 'male' ? 'ذ' : 'أ'}
              </div>
              <div>
                  <h4 className="font-bold text-gray-800">#{sheep.serialNumber}</h4>
                  <p className="text-xs text-gray-400">{sheep.type}</p>
              </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
             <div className="flex items-center gap-1">
                 <Calendar size={14} className="text-gray-400" />
                 <span>{calculateAgeDisplay(sheep.birthDate)}</span>
             </div>
             <div className="flex items-center gap-1">
                 <Dna size={14} className="text-gray-400" />
                 <span className="text-xs">الأم: {sheep.motherId || '-'} / الأب: {sheep.fatherId || '-'}</span>
             </div>
          </div>
          <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end">
              <button onClick={() => openMedicalModal(sheep)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition" title="تطعيمات">
                 <Syringe size={14} /> <span>تطعيم</span>
              </button>
              <button onClick={() => openMoveModal(sheep)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition" title="نقل">
                 <ArrowRightLeft size={14} /> <span>نقل</span>
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button onClick={() => openEditSheepModal(sheep)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="تعديل">
                  <Edit size={16} />
              </button>
              <button onClick={() => handleDeleteSheep(sheep.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                  <Trash2 size={16} />
              </button>
          </div>
      </div>
  );

  // --- Logic for Views ---

  const dashboardGroups = pens.filter(p => p.isGroup);
  const displayedPens = selectedGroupId ? pens.filter(p => p.parentId === selectedGroupId) : [];
  const selectedGroup = pens.find(p => p.id === selectedGroupId);
  const selectedPen = pens.find(p => p.id === selectedPenId);
  const displayedSheep = selectedPenId ? allSheep.filter(s => s.penId === selectedPenId) : [];
  const availablePensForMove = selectedGroupId ? pens.filter(p => p.parentId === selectedGroupId && p.id !== selectedPenId && !p.isGroup) : [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-800 bg-gray-50">
      
      {/* Mobile Header */}
      {activeTab !== 'dashboard' && (
        <div className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
            <Warehouse className="w-6 h-6" />
            {activeTab === 'vaccines' ? 'سجل التطعيمات' : activeTab === 'feed' ? 'المخزون (الأعلاف)' : (selectedPen ? selectedPen.name : (selectedGroup?.name || 'مزرعتي'))}
          </h1>
          {activeTab === 'pens' && selectedGroupId && (
             <button onClick={openNewModal} className="bg-emerald-600 text-white p-2 rounded-lg"> <Plus size={20} /> </button>
          )}
          {activeTab === 'sheepList' && selectedPenId && selectedPen?.isMain && (
             <button onClick={openNewSheepModal} className="bg-emerald-600 text-white p-2 rounded-lg"> <Plus size={20} /> </button>
          )}
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <nav className="bg-white md:w-64 border-l border-gray-200 hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 z-40">
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <div className="bg-emerald-100 p-2 rounded-lg">
             <Warehouse className="w-8 h-8 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">مزرعتي</h1>
            <p className="text-xs text-gray-500">نظام إدارة الحظائر</p>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-2">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedGroupId(null); setSelectedPenId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <LayoutDashboard size={20} /> <span>الرئيسية</span>
          </button>
          
          <button onClick={() => { setActiveTab('feed'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'feed' ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Wheat size={20} /> <span>المخزون (الأعلاف)</span>
          </button>

          <button onClick={() => { setActiveTab('vaccines'); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'vaccines' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <ShieldCheck size={20} /> <span>سجل التطعيمات</span>
          </button>

          <button onClick={() => { setActiveTab('advisor'); setSelectedGroupId(null); setSelectedPenId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'advisor' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <MessageSquareQuote size={20} /> <span>المستشار</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="flex justify-center items-center min-h-screen md:min-h-full p-4 md:p-8">
            <div className="bg-white w-full max-w-[380px] rounded-[30px] shadow-xl flex flex-col p-6 min-h-[680px] relative border border-gray-50">
              <div className="absolute top-6 left-6 flex gap-1">
                 <MoreVertical className="text-gray-300 w-5 h-5 rotate-90" />
              </div>
              <div className="flex justify-center mt-12 mb-6">
                <Warehouse className="w-14 h-14 text-blue-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-blue-700 text-center mb-2">متابعة حظائري</h2>
              <div className="w-12 h-1 bg-gray-100 mx-auto rounded-full mb-8"></div>
              
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto mb-8 px-1 custom-scrollbar">
                {dashboardGroups.map((group) => (
                  <div key={group.id} className="relative group w-full">
                    <button onClick={() => enterGroup(group.id)} className="w-full bg-white border border-gray-100 rounded-xl py-4 px-4 text-center shadow-sm hover:shadow-md hover:bg-gray-50 transition-all flex items-center justify-center relative">
                      <span className="font-bold text-gray-700 text-lg group-hover:text-blue-600 transition-colors">{group.name}</span>
                      <ChevronLeft className="w-5 h-5 text-gray-300 absolute left-4 group-hover:text-blue-400 transition-colors" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePen(group.id, true); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                       <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                {dashboardGroups.length === 0 && (
                  <div className="text-center py-10 opacity-60">
                    <p className="text-gray-400 font-medium">لا توجد حظائر</p>
                    <p className="text-xs text-gray-300 mt-2">اضغط الزر بالأسفل للإضافة</p>
                  </div>
                )}
              </div>

              <button onClick={openNewModal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition transform active:scale-95 mt-auto">
                <Plus className="w-6 h-6" /> <span className="text-lg">إضافة حظيرة جديدة</span>
              </button>
              <div className="text-center mt-6 text-xs text-gray-400 font-medium font-mono">JokeR_B :تطوير وبرمجة</div>
            </div>
          </div>
        )}

        {/* Barn Details */}
        {activeTab === 'pens' && selectedGroup && (
          <div className="p-4 md:p-8 space-y-6 animate-fade-in h-full">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedGroupId(null); setActiveTab('dashboard'); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition" title="عودة للقائمة">
                  <ArrowRight size={24} className="rtl:rotate-180" />
                </button>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{selectedGroup.name}</h2>
                  <p className="text-gray-500 mt-1">إدارة الأقسام داخل {selectedGroup.name}</p>
                </div>
              </div>
              <button onClick={openNewModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm hover:shadow-md">
                <Plus size={20} /> <span>إضافة قسم جديد</span>
              </button>
            </header>
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                {displayedPens.map(pen => <div key={pen.id} className="mb-6">{renderPenCard(pen)}</div>)}
                {displayedPens.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                      <Warehouse className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">هذه الحظيرة فارغة</p>
                      <button onClick={openNewModal} className="text-emerald-600 font-bold mt-2 hover:underline">إضافة قسم جديد</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sheep List */}
        {activeTab === 'sheepList' && selectedPen && (
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
                    <p className="text-gray-500 mt-1">{displayedSheep.length} رأس من الأغنام</p>
                    {!selectedPen.isMain && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-lg mt-1 inline-block">
                        قسم فرعي (النقل فقط)
                      </span>
                    )}
                  </div>
                </div>
                {/* Only allow adding sheep if it's the Main Pen */}
                {selectedPen.isMain && (
                  <button onClick={openNewSheepModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm hover:shadow-md">
                    <Plus size={20} /> <span>إضافة رأس جديد</span>
                  </button>
                )}
              </header>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                  {displayedSheep.length > 0 ? (
                      <div className="p-4 grid gap-3">{displayedSheep.map(sheep => renderSheepRow(sheep))}</div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                          <div className="bg-gray-50 p-6 rounded-full mb-4"><Dna size={40} className="text-gray-300" /></div>
                          <p className="text-lg font-medium">لا توجد أغنام في هذا القسم</p>
                          {selectedPen.isMain ? (
                             <p className="text-sm">أضف الأغنام لمتابعتها</p>
                          ) : (
                             <p className="text-sm">قم بنقل الأغنام من القسم الرئيسي إلى هنا</p>
                          )}
                      </div>
                  )}
              </div>
           </div>
        )}

        {/* Feed Stock Only - Vaccination Guide REMOVED */}
        {activeTab === 'feed' && (
           <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
              <FeedManager items={feedItems} onUpdate={setFeedItems} />
           </div>
        )}

        {/* Vaccination Log */}
        {activeTab === 'vaccines' && (
           <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
              <VaccinationGuide sheepList={allSheep} />
           </div>
        )}

        {/* Advisor View */}
        {activeTab === 'advisor' && (
           <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
              <header className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">المستشار الذكي</h2>
                <p className="text-gray-500">احصل على إجابات فورية حول صحة وتغذية الأغنام</p>
              </header>
              <AdvisorChat />
           </div>
        )}

      </main>
      
      {/* Mobile Bottom Navigation */}
      {activeTab !== 'dashboard' && (
        <div className="md:hidden bg-white border-t border-gray-200 flex justify-between p-2 sticky bottom-0 z-40 pb-safe px-4">
            <button onClick={() => { setActiveTab('dashboard'); }} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
              <LayoutDashboard size={22} /> <span className="text-[10px] mt-1">الرئيسية</span>
            </button>
            <button onClick={() => { setActiveTab('feed'); }} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'feed' ? 'text-orange-600' : 'text-gray-400'}`}>
              <Wheat size={22} /> <span className="text-[10px] mt-1">المخزون</span>
            </button>
            <button onClick={() => { setActiveTab('vaccines'); }} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'vaccines' ? 'text-purple-600' : 'text-gray-400'}`}>
              <ShieldCheck size={22} /> <span className="text-[10px] mt-1">سجل التطعيمات</span>
            </button>
            <button onClick={() => { setActiveTab('advisor'); }} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'advisor' ? 'text-emerald-600' : 'text-gray-400'}`}>
              <MessageSquareQuote size={22} /> <span className="text-[10px] mt-1">المستشار</span>
            </button>
        </div>
      )}

      {/* Modals */}
      <PenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePen} initialData={editingPen} isGroupMode={isAddingGroup} />
      <SheepModal isOpen={isSheepModalOpen} onClose={() => setIsSheepModalOpen(false)} onSave={handleSaveSheep} initialData={editingSheep} penId={selectedPenId || ''} />
      <MoveSheepModal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} onMove={handleMoveSheep} currentPenId={selectedPenId || ''} availablePens={availablePensForMove} />
      <MedicalModal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} sheep={selectedSheepForAction} onAddRecord={handleAddMedicalRecord} />
    </div>
  );
}

export default App;