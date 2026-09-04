const fs = require('fs');
const files = [
  'd:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app/components/student-online/VideoPlayerPage.tsx',
  'd:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app/components/student-center/VideoPlayerPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace all occurrences of the old regex
  content = content.replace(/\/\^\.\*\(youtu\.be\\\\\/\|v\\\\\/\|u\\\\\/\\\\w\\\\\/\|embed\\\\\/\|watch\\\\\\?v=\|&v=\)\(\[\^#&\?\]\*\)\.\*\//g, '/^.*(youtu\\.be\\/|v\\/|u\\/\\w\\/|embed\\/|live\\/|shorts\\/|watch\\?v=|&v=)([^#&?]*).*/');
  
  // Need to also handle string version used in match
  content = content.replace(/youtu\\\.be\\\/\|v\\\/\|u\\\\\/\\\\w\\\/\|embed\\\/\|watch\\\\\\?v=\|&v=/g, 'youtu\\.be\\/|v\\/|u\\/\\w\\/|embed\\/|live\\/|shorts\\/|watch\\?v=|&v=');

  fs.writeFileSync(file, content);
});
