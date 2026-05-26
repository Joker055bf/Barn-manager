import { readFileSync, existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

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
  } catch {}
}

// Clear gh-pages cache
const cacheDir = path.join(os.tmpdir(), '.cache', 'gh-pages');
if (existsSync(cacheDir)) {
  try { rmSync(cacheDir, { recursive: true, force: true }); } catch {}
}

// Build the repo URL
const repoUrl = ghToken
  ? `https://${ghToken}:x-oauth-basic@github.com/Joker055bf/Joker055bf.github.io.git`
  : `https://github.com/Joker055bf/Joker055bf.github.io.git`;

console.log('\n🚀 Deploying to GitHub Pages...\n');

// Use gh-pages Node API directly (avoids Windows shell quoting issues)
const { default: ghpages } = await import('gh-pages');

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
      console.log('\n✅ تم النشر بنجاح على GitHub Pages!\n');
    }
  }
);