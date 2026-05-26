const fs = require('fs');
const buf = fs.readFileSync('App.tsx');
const cleanBuf = buf.filter(b => b !== 0);
fs.writeFileSync('App.tsx', cleanBuf);
console.log('Successfully stripped null bytes from App.tsx.');
