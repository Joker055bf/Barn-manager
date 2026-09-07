const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
    "{ value: 'none', label: 'بدون لون', color: 'none' }",
    ""
);

code = code.replace(
    "const extraColors = Array.from(new Set(displayedSheep.map(s => s.tagColor || 'none'))) as string[];",
    "const extraColors = Array.from(new Set(displayedSheep.map(s => s.tagColor).filter(c => c && c !== 'none'))) as string[];"
);

code = code.replace(
    "label: c === 'none' ? 'بدون لون' : (colorNames[c] || c),",
    "label: colorNames[c] || c,"
);

code = code.replace(
    "{color === 'none' ? 'بدون لون' : (colorNames[color] || color)}",
    "{colorNames[color] || color}"
);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('REMOVED بدون لون SUCCESSFULLY!');
