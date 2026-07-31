const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\hosam\\.gemini\\antigravity-ide\\brain\\b3127ee3-d2ae-4390-89f4-166c7bf6d808\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let fullFile = '';
  for await (const line of rl) {
    if (line.includes('course.controller.ts')) {
      const parsed = JSON.parse(line);
      
      // Check if it's a view_file response
      if (parsed.type === 'ACTION_RESULT' && parsed.action === 'view_file' && parsed.output && parsed.output.includes('course.controller.ts')) {
         if (parsed.output.includes('The above content shows the entire, complete file contents')) {
            fullFile = parsed.output;
         }
      }
    }
  }

  if (fullFile) {
    fs.writeFileSync('recovered_course_controller.txt', fullFile);
    console.log('Recovered from view_file!');
  } else {
    console.log('No complete view_file found. Searching for chunks...');
  }
}
extract();
