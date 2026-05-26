import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Warehouse, GripVertical } from 'lucide-react';
import { Pen, Sheep } from '../types';

interface DraggablePenListProps {
  pens: Pen[];
  allSheep: Sheep[];
  onEnterSheepList: (penId: string) => void;
  onReorder: (reorderedPens: Pen[]) => void;
  headLabel: string;
  detailsLabel?: string;
}


export const DraggablePenList: React.FC<DraggablePenListProps> = ({
  pens,
  allSheep,
  onEnterSheepList,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-3xl">
      <h3 className="font-bold text-gray-700 dark:text-gray-200">قائمة الحظائر (غير مستخدم)</h3>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pens.map(pen => (
          <div key={pen.id} onClick={() => onEnterSheepList(pen.id)} className="cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl shadow border border-gray-100 dark:border-slate-700 min-w-[120px] text-center">
            <h4 className="font-bold text-sm">{pen.name}</h4>
            <span className="text-xs text-gray-500">{allSheep.filter(s => s.penId === pen.id).length} رأس</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* SCRAMBLED CONTENT START
export const DraggablePenList: React.FC<DraggablePenListProps> = ({
  pens,
  allSheep,
  onEnterSheepList,
  onReorder,
  headLabel,
  detailsLabel = 'التفاصيل',
}) => {
  const [orderedPens, setOrderedPens] = useState<Pen[]>(pens);
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  // Track if currently holding/dragging
  const holdingId = useRef<string | null>(null);

  useEffect(() => {
    setOrderedPens(pens);
  }, [pens]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getXY = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): { x: number; y: number } => {
    if ('touches' in e) {
      if (e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if ('changedTouches' in e && e.changedTouches.length > 0) {
        return { x: (e as TouchEvent).changedTouches[0].clientX, y: (e as TouchEvent).changedTouches[0].clientY };
      }
    }
    return {
      x: (e as MouseEvent).clientX, y: (e as MouseEvent).client
        < truncated 11881 bytes >
    }
  }, []);

  const getXY = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): { x: number; y: number } => {
    if ('touches' in e) {
      if (e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if ('changedTouches' in e && e.changedTouches.length > 0) {
        return { x: (e as TouchEvent).changedTouches[0].clientX, y: (e as TouchEvent).changedTouches[0].clientY };
      }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const findClosestCard = useCallback((x: number, y: number, excludeId?: string | null) => {
    const els = Object.entries(cardRefs.current) as [string, HTMLDivElement | null][];
    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const [pid, el] of els) {
      if (!el || pid === excludeId) continue;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = x - centerX;
      const dy = y - centerY;
      // Weight dx more since list is horizontal
      const distance = Math.sqrt(dx * dx + (dy * dy * 0.5));

      if (distance < minDistance && distance < 180) {
        minDistance = distance;
        closestId = pid;
      }
    }
    return closestId;
  }, []);

  const beginDrag = useCallback((penId: string, x: number, y: number) => {
    holdingId.current = penId;
    setDraggingId(penId);
    setFloatPos({ x, y });
    if (navigator.vibrate) navigator.vibrate(40);
  }, []);

  const exitDragMode = useCallback(() => {
    setIsDragMode(false);
    setDraggingId(null);
    setDragOverId(null);
    setFloatPos(null);
    holdingId.current = null;
  }, []);

  // ---------- Pointer Down ----------
  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent, penId: string) => {
    if (!canReorder) return;

    const { x, y } = getXY(e);
    dragStartPos.current = { x, y };

    if (isDragMode) {
      // Already in drag mode → pick up immediately on any press
      e.preventDefault();
      beginDrag(penId, x, y);
      return;
    }

    // Not in drag mode → wait for long press (450ms)
    longPressTimer.current = setTimeout(() => {
      setIsDragMode(true);
      beginDrag(penId, x, y);
    }, 450);
  };

  // ---------- Pointer Move ----------
  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!holdingId.current) {
      // Cancel long press if finger moved too much before timer fires
      if (dragStartPos.current) {
        const { x, y } = getXY(e);
        const dx = Math.abs(x - dragStartPos.current.x);
        const dy = Math.abs(y - dragStartPos.current.y);
        if (dx > 8 || dy > 8) {
          cancelLongPress();
          dragStartPos.current = null;
        }
      }
      return;
    }
    e.preventDefault();
    const { x, y } = getXY(e);
    setFloatPos({ x, y });
    const hovered = findClosestCard(x, y, holdingId.current);
    setDragOverId(hovered);
  }, [findClosestCard, cancelLongPress]);

  // ---------- Pointer Up ----------
  const handlePointerUp = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    cancelLongPress();

    if (!holdingId.current) return;

    const { x, y } = getXY(e);
    const hovered = findClosestCard(x, y, holdingId.current);

    if (hovered && hovered !== holdingId.current) {
      lastReorderTime.current = Date.now();
      setOrderedPens(prev => {
        const newOrder = [...prev];
        const fromIdx = newOrder.findIndex(p => p.id === holdingId.current);
        const toIdx = newOrder.findIndex(p => p.id === hovered);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [removed] = newOrder.splice(fromIdx, 1);
          newOrder.splice(toIdx, 0, removed);
          onReorder(newOrder);
          return newOrder;
        }
        return prev;
      });
    }

    // Release card but STAY in drag mode
    holdingId.current = null;
    setDraggingId(null);
    setDragOverId(null);
    setFloatPos(null);
  }, [findClosestCard, onReorder, cancelLongPress]);

  // ---------- Click on card ----------
  const handleCardClick = (e: React.MouseEvent, penId: string) => {
    if (isDragMode) {
      e.stopPropagation();
      // Clicking a card in drag mode = pick it up (handled by pointerdown already)
      return;
    }
    onEnterSheepList(penId);
  };

  // ---------- Exit drag mode on tap outside ----------
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isDragMode) return;
    const target = e.target as HTMLElement;
    const isOnCard = Object.values(cardRefs.current).some((el) => (el as HTMLDivElement | null)?.contains(target));
    if (!isOnCard) {
      exitDragMode();
    }
  };

  // Also exit when tapping completely outside the component
  useEffect(() => {
    if (!isDragMode) return;
    const handleOutside = (e: TouchEvent | MouseEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (!containerRef.current.contains(target)) {
        exitDragMode();
      }
    };
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isDragMode, exitDragMode]);

  const draggingPen = draggingId ? orderedPens.find(p => p.id === draggingId) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ touchAction: isDragMode ? 'none' : 'auto' }}
      onClick={handleContainerClick}
    >
      {/* Mode hint bar */}
      {isDragMode && (
        <div className="absolute -top-9 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <span className="bg-purple-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse select-none">
            {draggingId ? '↔ اسحب لإعادة الترتيب' : '• اضغط قسم للسحب  |  اضغط خارجاً للخروج'}
          </span>
 
        className="flex overflow-x-auto snap-x gap-4 no-scrollbar pb-6 px-4 md:px-8"
        onMouseMove={handlePointerMove as any}
        onTouchMove={handlePointerMove as any}
        onMouseUp={handlePointerUp as any}
        onTouchEnd={handlePointerUp as any}
      >
        {orderedPens.map((pen) => {
          const count = allSheep.filter(s => s.penId === pen.id).length;
          const isDragging = pen.id === draggingId;
          const isTarget = pen.id === dragOverId;

          return (
            <div
              key={pen.id}
              ref={el => { cardRefs.current[pen.id] = el; }}
              <Warehouse size={20} />
            </div>
            <h3 className="font-black text-[11px] text-[#3E2723] dark:text-gray-100 text-center truncate w-full px-1 mb-1">{draggingPen.name}</h3>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xl font-black text-purple-600">{allSheep.filter(s => s.penId === draggingPen.id).length}</span>
              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">{headLabel}</span>
            </div>
          </div>
        </div >
      )}
    </div >
  );
};









cursor: isDragMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
  userSelect: 'none',
    WebkitUserSelect: 'none',
              }}
className = {`flex-none w-32 h-40 snap-center backdrop-blur-sm rounded-[2rem] p-3 shadow-lg flex flex-col items-center justify-between group relative overflow-hidden ${isTarget
    ? 'bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-400 dark:border-purple-600'
    : isDragMode
      ? 'bg-white/95 dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50'
      : 'bg-white/95 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:scale-[1.03]'
  }`}
            >
  {/* Grip icon in drag mode */ }
{
  isDragMode && (
    <div className="absolute top-1.5 right-1.5 text-purple-300 dark:text-purple-700 pointer-events-none">
      <GripVertical size={11} />
    </div>
  )
}
{
  isDragging && (
    <div className="absolute inset-0 rounded-[2rem] bg-purple-100/60 dark:bg-purple-900/30 pointer-events-none" />
  )
}

              <div className="absolute top-0 left-0 w-8 h-8 bg-orange-500/5 rounded-br-3xl" />

              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-1 transition-all duration-200 ${
                isDragMode
                  ? 'bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-400'
                  : 'bg-[#795548]/5 text-[#795548] dark:bg-orange-500/10 dark:text-orange-500 group-hover:bg-[#795548] group-hover:text-white'
              }`}>
                <Warehouse size={20} />
              </div>

              <h3 className="font-black text-[11px] text-[#3E2723] dark:text-gray-100 text-center truncate w-full px-1 mb-1">
                {pen.name}
              </h3>

              <div className="flex items-center gap-1 mb-2">
                <span className={`text-xl font-black ${isDragMode ? 'text-purple-500 dark:text-purple-400' : 'text-[#795548] dark:text-orange-500'}`}>
                  {count}
                </span>
                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">{headLabel}</span>
              </div>

              <div className="w-full mt-2">
                {isDragMode ? (
                  <div className="w-full bg-purple-50 dark:bg-purple-900/20 rounded-xl py-1.5 text-center text-[9px] font-black text-purple-400 dark:text-purple-500 border border-purple-100 dark:border-purple-900/30 select-none">
                    ⟺
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEnterSheepList(pen.id); }}
                    className="w-full bg-gray-50 text-gray-500 py-1.5 rounded-xl text-[9px] font-black dark:bg-slate-800 hover:bg-[#795548] hover:text-white t





            </div>
          );
        })}
      </div>

      {/* Floating ghost card while dragging */}
      {draggingPen && floatPos && (
        <div
          className="fixed pointer-events-none z-[200]"
          style={{
            left: floatPos.x - 64,
            top: floatPos.y - 85,
            width: 128,
            height: 160,
            willChange: 'transform, left, top',
          }}
        >
          <div
            className="w-full h-full bg-white dark:bg-slate-900 rounded-[2rem] p-3 border-2 border-purple-500 flex flex-col items-center justify-between"
            style={{
              boxShadow: '0 20px 60px rgba(124,58,237,0.4), 0 8px 20px rgba(0,0,0,0.15)',
              transform: 'rotate(3deg) scale(1.08)',
              opacity: 0.96,
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-1">
              <Warehouse size={20} />
            </div>
            <h3 className="font-black text-[11px] text-[#3E2723] dark:text-gray-100 text-center truncate w-full px-1 mb-1">
              {draggingPen.name}
            </h3>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                {allSheep.filter(s => s.penId === draggingPen.id).length}
              </span>
              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">{headLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div >
*/
