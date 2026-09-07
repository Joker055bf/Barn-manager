const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
    "const extraColors = Array.from(new Set(displayedSheep.map(s => s.tagColor || 'none')));",
    "const extraColors = Array.from(new Set(displayedSheep.map(s => s.tagColor || 'none'))) as string[];"
);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('TYPE CAST FIX APPLIED');
