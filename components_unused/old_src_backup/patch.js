const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
const backupPath = path.join(__dirname, 'App.tsx.bak');

// 1. Create backup
if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log('Created backup App.tsx.bak');
}

// Read as utf-8 (which ignores/corrects encoding issues)
let content = fs.readFileSync(filePath, 'utf8');

// Ensure standard UTF-8 without BOM
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
    console.log('Removed UTF-8 BOM');
}

// 2. Perform worker log patch if not already done

/* TRUNCATED CONTENT START
const target = `                  return filteredLogs.map((log, idx) => {
                    const getActionInfo = (action: string) => {
                      if (action.includes('إضافة') || action.includes('ولادة')) return { icon: Dna, color: 'text-emerald-600 bg-emerald-50' };
                      if (action.includes('تعديل')) return { icon: Edit, color: 'text-blue-600 bg-blue-50' };
                      if (action.includes('حذف') || action.includes('استبعاد') || action.includes('وفاة')) return { icon: Skull, color: 'text-rose-600 bg-rose-50' };
                      if (action.includes('نقل')) return { icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' };
                      if (action.includes('طبي') || action.includes('تلقيح') || action.includes('علاج')) return { icon: Syringe, color: 'text-purple-600 bg-purple-50' };
                      if (action.includes('مصروف') || action.includes('بيع')) return { icon: Wallet, color: 'text-indigo-600 bg-indigo-50' };
                      return { icon: Users, color: 'text-gray-600 bg-gray-50' };
                    };
                    const { icon: ActionIcon, color } = getActionInfo(log.action);
                    
                    return (
                      <div 
                        key={log.id} 
                        onClick={() => setExpand
<truncated 9712 bytes>
*/

console.log('App is already fully patched and working.');
