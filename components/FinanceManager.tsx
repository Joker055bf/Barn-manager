import React, { useState } from 'react';
import { Wallet, Save, Calendar, Tag, Trash2, PlusCircle, ChevronDown, X, TrendingUp, TrendingDown, Target, ShoppingBag, Receipt, Users } from 'lucide-react';
import { Expense, Sale, Sheep, SheepType } from '../types';
import { generateId } from '../utils/animalHelpers';

interface FinanceManagerProps {
    penId: string;
    expenses: Expense[];
    sales: Sale[];
    animals: Sheep[];
    animalType?: string;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onSaveSale: (sale: Sale) => Promise<void>;
    onDeleteExpense: (id: string) => Promise<void>;
    onDeleteSale: (id: string) => Promise<void>;
    onSellAnimal?: (animalId: string, saleData: Partial<Sale>) => Promise<void>;
    isOwner: boolean;
    onShowAlert: (type: any, title: string, message: string) => void;
    onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const colorNames: { [key: string]: string } = {
    '#EF4444': 'أحمر',
    '#F59E0B': 'برتقالي',
    '#10B981': 'أخضر',
    '#3B82F6': 'أزرق',
    '#6366F1': 'نيلي',
    '#8B5CF6': 'بنفسجي',
    '#EC4899': 'وردي',
    '#FACC15': 'أصفر',
    '#000000': 'أسود',
    '#FFFFFF': 'أبيض'
};

export const FinanceManager: React.FC<FinanceManagerProps> = ({
    penId, expenses, sales, animals, animalType, onSaveExpense, onSaveSale, onDeleteExpense, onDeleteSale, isOwner,
    o
}) => {
                            placeholder="اسم العميل"
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">ملاحظات إضافية</label>
                                <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white h-20 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'expenses' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                            >
                                <Save size={20} />
                                {isSaving ? 'جاري الحفظ...' : 'حفظ العملية'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
    });

    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = currentSales.reduce((sum, s) => sum + s.amount, 0);



































                    amount: Number(amount),
                    date,
                    category: category as any,
                    notes: notes || '', // Ensure no undefined
                    relatedAnimalId: relatedAnimalId || null, // Use null for Firestore
                    createdAt: new Date().toISOString()
                };
                
                // Final sanitize to strip any stray undefined if they exist
                const cleanExpense = JSON.parse(JSON.stringify(expense));
                await onSaveExpense(cleanExpense);
            } else {
                const sale: Sale = {
                    id: generateId(),
                    penId,
                    title: title.trim(),
                    amount: Number(amount),
                    date,
                    category: category as any,
                    notes: notes || '', // Ensure no undefined
                    relatedAnimalId: relatedAnimalId || null, // Use null for Firestore
                    quantity: quantity ? Number(quantity) : null, // Use null for Firestore
                    buyer: buyer || '', // Default string
                    createdAt: new Date().toISOString()
                };
                
                const cleanSale = JSON.parse(JSON.stringify(sale));
                await onSaveSale(cleanSale);
            }

            // Success Reset
            setIsFormOpen(false);
            setTitle('');
            setAmount('');
            setNotes('');
            setRelatedAnimalId('');
            setQuantity('');
            setBuyer('');
        } catch (error: any) {
            console.error('Submit Error:', error);
            const msg = 'عذراً، فشل الحفظ: ' + (error.message || 'خطأ غير معروف');
            if (onShowAlert) onShowAlert('error', 'خطأ', msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            {/* Header / Summary (Shrunk) */}
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#795548] p-2 rounded-xl text-white">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">{isEn ? 'Financial Management' : 'الإدارة المالية'}</h2>
                            <p className="text-gray-400 text-[10px]">{isEn ? 'Track profit, sales and expenses' : 'تتبع الأرباح، المبيعات والمصاريف'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-center bg-gray-50/50 dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:borde





























































                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {(activeTab === 'expenses' ? currentExpenses : currentSales).map((item: any) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeTab === 'expenses' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                                                {activeTab === 'expenses' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{item.title}</h4>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1"><Calendar size={10} /> {item.date?.split('T')[0]}</span>
                                                </div>
                                            </div>
                                        </div>


































































































































                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">ملاحظات إضافية</label>
                                <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white h-20 resize-none"
                                />
                            </div>
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">ملاحظات إضافية</label>
                                <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white h-20 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'expenses' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                            >
                                <Save size={20} />
                                {isSaving ? 'جاري الحفظ...' : 'حفظ العملية'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
                                        className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1">ملاحظات إضافية</label>
                                <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#795548] bg-gray-50 dark:bg-slate-800 dark:text-white h-20 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'expenses' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                            >
                                <Save size={20} />
                                {isSaving ? 'جاري الحفظ...' : 'حفظ العملية'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
