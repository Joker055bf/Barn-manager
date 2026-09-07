const fs = require('fs');
let lines = fs.readFileSync('App.tsx', 'utf8').split('\n');
console.log(lines.slice(3535, 3565).map((l, i) => `${3536 + i}: ${JSON.stringify(l)}`).join('\n'));
