const fs = require('fs');
const readline = require('readline');
const glob = require('path');
const path = require('path');

const brainDir = 'C:\\Users\\hosam\\.gemini\\antigravity-ide\\brain';
const dirs = fs.readdirSync(brainDir);

let latestContent = '';
let latestTimestamp = 0;

async function scan() {
  for (const d of dirs) {
    const transcriptPath = path.join(brainDir, d, '.system_generated', 'logs', 'transcript_full.jsonl');
    if (!fs.existsSync(transcriptPath)) continue;

    console.log(`Scanning ${d}...`);
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let fileContent = '';
    
    for await (const line of rl) {
      if (!line.includes('course.controller.ts')) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'PLANNER_RESPONSE' && parsed.tool_calls) {
          for (const tc of parsed.tool_calls) {
            if (!tc.arguments || !tc.arguments.TargetFile) continue;
            
            if (tc.name === 'write_to_file' && tc.arguments.TargetFile.includes('course.controller.ts')) {
              fileContent = tc.arguments.CodeContent;
              latestContent = fileContent;
              // we don't have timestamp easily, we just take the last one found in the last transcript chronologically
            }
            else if (tc.name === 'replace_file_content' && tc.arguments.TargetFile.includes('course.controller.ts')) {
              const { TargetContent, ReplacementContent } = tc.arguments;
              if (fileContent.includes(TargetContent)) {
                fileContent = fileContent.replace(TargetContent, ReplacementContent);
                latestContent = fileContent;
              }
            }
            else if (tc.name === 'multi_replace_file_content' && tc.arguments.TargetFile.includes('course.controller.ts')) {
              const chunks = tc.arguments.ReplacementChunks || [];
              for (const chunk of chunks) {
                if (fileContent.includes(chunk.TargetContent)) {
                  fileContent = fileContent.replace(chunk.TargetContent, chunk.ReplacementContent);
                  latestContent = fileContent;
                }
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  if (latestContent) {
    fs.writeFileSync('services/course-service/src/controllers/course.controller.ts', latestContent);
    console.log('Recovered successfully from global search!');
  } else {
    console.log('Still could not recover.');
  }
}
scan();
