import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'App.tsx',
  'components/DeathsModal.tsx',
  'components/ReportsModal.tsx',
  'components/SettingsModal.tsx',
  'components/SheepModal.tsx',
  'components/SheepStatsModal.tsx',
  'components/VaccinationGuide.tsx',
  'components/WorkerManageModal.tsx',
  'components/AnimalRegistryProfile.tsx'
];

for (const file of filesToPatch) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace glass-effect with solid color
    let newContent = content.replace(/glass-effect/g, 'bg-[#FCFBF4]');
    
    // Remove dark mode transparency
    newContent = newContent.replace(/dark:bg-slate-900\/[0-9]+/g, 'dark:bg-slate-900');
    newContent = newContent.replace(/dark:bg-slate-800\/[0-9]+/g, 'dark:bg-slate-800');
    
    // Replace other bg-white/X with solid bg-white if it's backdrop blurred
    newContent = newContent.replace(/bg-white\/[0-9]+\s+backdrop-blur-md/g, 'bg-white');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Patched ${file}`);
    }
  }
}
