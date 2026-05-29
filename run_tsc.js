const { execSync } = require('child_process');
try {
  const out = execSync('npx.cmd tsc --noEmit', { encoding: 'utf8' });
  require('fs').writeFileSync('tsc_out.txt', out);
} catch (e) {
  require('fs').writeFileSync('tsc_out.txt', e.stdout + '\n' + e.stderr);
}
