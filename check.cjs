const fs = require('fs');
const lines = fs.readFileSync('C:/Users/baslo/.gemini/antigravity-ide/brain/1e87ad71-2537-41f4-8294-a02ac7fd3880/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
for(const line of lines) {
    if(!line) continue;
    const obj = JSON.parse(line);
    if(obj.created_at && obj.created_at.startsWith('2026-05-22') && obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
            if(tc.name.includes('replace') || tc.name.includes('write'))
                console.log(obj.step_index, tc.name, tc.args.TargetFile);
        });
    }
}
