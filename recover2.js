const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\hosam\\.gemini\\antigravity-ide\\brain\\b3127ee3-d2ae-4390-89f4-166c7bf6d808\\.system_generated\\logs\\transcript_full.jsonl');
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
            console.log('Applied write_to_file');
          }
          else if (tc.name === 'replace_file_content' && tc.arguments.TargetFile.includes('course.controller.ts')) {
            const { TargetContent, ReplacementContent } = tc.arguments;
            if (fileContent.includes(TargetContent)) {
              fileContent = fileContent.replace(TargetContent, ReplacementContent);
              console.log('Applied replace_file_content');
            } else {
              console.log('WARNING: replace_file_content target not found!');
            }
          }
          else if (tc.name === 'multi_replace_file_content' && tc.arguments.TargetFile.includes('course.controller.ts')) {
            const chunks = tc.arguments.ReplacementChunks || [];
            for (const chunk of chunks) {
              if (fileContent.includes(chunk.TargetContent)) {
                fileContent = fileContent.replace(chunk.TargetContent, chunk.ReplacementContent);
                console.log('Applied multi_replace_file_content chunk');
              } else {
                console.log('WARNING: multi_replace_file_content target not found!');
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  if (fileContent) {
    fs.writeFileSync('services/course-service/src/controllers/course.controller.ts', fileContent);
    console.log('Recovered successfully!');
  } else {
    console.log('Could not recover.');
  }
}
extract();
