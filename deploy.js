import { readFileSync, existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import ghpages from 'gh-pages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read GH_TOKEN from environment or .env.local
let ghToken = process.env.GH_TOKEN;
if (!ghToken) {
  try {
    const envFile = readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    for (const line of envFile.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key?.trim() === 'GH_TOKEN') {
        const val = rest.join('=').trim();
        if (val && val !== 'YOUR_GITHUB_TOKEN_HERE') {
          ghToken = val;
        }
        break;
      }
    }
  } catch { }
}

// Clear gh-pages cache
const cacheDir = path.join(os.tmpdir(), '.cache', 'gh-pages');
if (existsSync(cacheDir)) {
  try { rmSync(cacheDir, { recursive: true, force: true }); } catch { }
}

// Build the repo URL
const repoUrl = ghToken
  ? `https://${ghToken}@github.com/Joker055bf/Barn-manager.git`
  : `https://github.com/Joker055bf/Barn-manager.git`;

console.log('\n🚀 Deploying to GitHub Pages...\n');

ghpages.publish(
  'dist',
  {
    repo: repoUrl,
    branch: 'main',
    dotfiles: true,
    silent: false,
    message: 'Deploy to GitHub Pages [skip ci]',
  },
  (err) => {
    if (err) {
      console.error('\n❌ فشل النشر:', err.message || err);
      if (!ghToken) {
        console.error('\n💡 لم يتم العثور على GitHub Token.');
        console.error('   افتح ملف .env.local وضع:');
        console.error('   GH_TOKEN=ghp_xxxxxxxxxxxx');
        console.error('   يمكنك إنشاء token من: https://github.com/settings/tokens');
        console.error('   (اختر repo > Full control)\n');
      }
      process.exit(1);
    } else {
      console.log('✅ تم النشر بنجاح على GitHub Pages!');
      process.exit(0);
    }
  }
);
