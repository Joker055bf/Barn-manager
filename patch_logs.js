const fs = require('fs');
const path = require('path');

const appFilePath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(appFilePath, 'utf8');

// Robust, line-ending-agnostic regex to match the homepage log card's username/action block
const targetRegex = /<div className="flex-1 min-w-0">\s*<p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate w-full">\s*\{log\.userName\}:\s*\{log\.action\}\s*<\/p>\s*<\/div>/g;

const replacement = `<div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate w-full">
                                          {log.action}
                                        </p>
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">
                                          {log.userRole === 'owner' ? (appLanguage === 'en' ? 'Owner' : 'المالك') : (appLanguage === 'en' ? 'Worker' : 'العامل')}: {log.userName}
                                        </p>
                                      </div>`;

if (content.match(targetRegex)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(appFilePath, content, 'utf8');
  console.log('Successfully patched App.tsx homepage log styling!');
} else {
  console.error('Could not find the target code in App.tsx. Please verify the file structure.');
}
