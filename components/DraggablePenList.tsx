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
