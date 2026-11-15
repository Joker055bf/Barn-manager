import React from 'react';
import { Trash2, Edit2, Warehouse } from 'lucide-react';

import { tr } from '../constants/i18n';

interface SwipeableBarnCardProps {
    name: string;
    ownerName?: string;
    onClick: () => void;
    onDelete: () => void;
    onEdit?: () => void;
    showActions?: boolean;
    sectionsCount?: number;
    canEdit?: boolean;
    canDelete?: boolean;
}

export const SwipeableBarnCard: React.FC<SwipeableBarnCardProps> = ({
    name,
    ownerName,
    onClick,
    onDelete,
    onEdit,
    showActions = true,
    sectionsCount,
    canEdit = true,
    canDelete = true
}) => {
    return (
        <div 
            onClick={onClick}
            className="aspect-square w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.5rem] p-3 flex flex-col justify-between items-center text-center shadow-premium-sm hover:shadow-premium transition-all duration-300 ease-out cursor-pointer hover:bg-[#FFFAF0] dark:hover:bg-slate-800/80 group relative overflow-hidden"
        >
            {/* Decorative corner element */}
            <div className="absolute top-0 start-0 w-9 h-9 bg-brand-500/5 dark:bg-orange-500/5 rounded-ee-[1.5rem] transition-all duration-300 group-hover:scale-110" />

            {/* Barn Icon Container */}
            <div className="mt-1 w-10 h-10 rounded-xl bg-brand-500/5 dark:bg-orange-500/10 flex items-center justify-center text-brand-500 dark:text-orange-500 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                <Warehouse size={20} />
            </div>

            {/* Content (Name & Owner) */}
            <div className="flex flex-col items-center my-1 w-full px-1">
                <h3 className="font-black text-xs text-brand-900 dark:text-gray-100 text-center tracking-tight leading-snug truncate w-full">
                    {name}
                </h3>
                {ownerName && (
                    <p className="text-[8px] text-gray-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider truncate w-full">
                        {tr("المالك:")} {ownerName}
                    </p>
                )}
            </div>

            {/* Actions Row */}
            {showActions && (canEdit || canDelete) && (
                <div className="flex gap-2 w-full mt-auto justify-center" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.();
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white transition-all border border-brand-500/5 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/5 dark:hover:bg-orange-500 dark:hover:text-white animate-scale-in"
                            title={tr("تعديل الحظيرة")}
                        >
                            <Edit2 size={12} />
                        </button>
                    )}
                    
                    {canDelete && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100/50 dark:bg-red-950/20 dark:border-red-900/30 dark:hover:bg-red-500 dark:hover:text-white animate-scale-in"
                            title={tr("حذف الحظيرة")}
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
