const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 3050; i < 3090; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
