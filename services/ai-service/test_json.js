const text = `<think>some reasoning</think>\n\`\`\`json\n{"test": 1}\n\`\`\``; 
let jsonString = text.trim();
if (jsonString.includes('</think>')) {
  jsonString = jsonString.split('</think>')[1].trim();
}
const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
if (jsonMatch && jsonMatch[1]) {
  jsonString = jsonMatch[1].trim();
} else {
  const braceMatch = jsonString.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    jsonString = braceMatch[0];
  }
}
try {
  console.log(JSON.parse(jsonString));
} catch(e) {
  console.error('Parse error:', e);
}
