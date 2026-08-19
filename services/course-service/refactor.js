const fs = require('fs');

function refactorController(filePath, type) {
  let code = fs.readFileSync(filePath, 'utf8');
  const lowerName = type === 'EXAM' ? 'exam' : 'homework';
  const capitalName = type === 'EXAM' ? 'Exam' : 'Homework';

  // db.<entity> -> db.assessment
  code = code.replace(new RegExp(`db\\.${lowerName}\\.findMany`, 'g'), 'db.assessment.findMany');
  code = code.replace(new RegExp(`db\\.${lowerName}\\.count`, 'g'), 'db.assessment.count');
  code = code.replace(new RegExp(`db\\.${lowerName}\\.findUnique`, 'g'), 'db.assessment.findUnique');
  code = code.replace(new RegExp(`db\\.${lowerName}\\.create`, 'g'), 'db.assessment.create');
  code = code.replace(new RegExp(`db\\.${lowerName}\\.update`, 'g'), 'db.assessment.update');
  code = code.replace(new RegExp(`db\\.${lowerName}\\.delete`, 'g'), 'db.assessment.delete');
  
  // attempt logic
  if (type === 'EXAM') {
    code = code.replace(/db\.examAttempt\./g, 'db.assessmentAttempt.');
  }

  // Type constraint in where clauses
  code = code.replace(/let whereClause: any = \{/, `let whereClause: any = { type: '${type}', `);
  code = code.replace(/where: \{ courseId \}/g, `where: { courseId, type: '${type}' }`);
  code = code.replace(/where: \{ id \}/g, `where: { id, type: '${type}' }`);
  code = code.replace(/where: \{ id: /g, `where: { id: `); // don't break id: examId

  // Create mappings
  if (type === 'EXAM') {
    code = code.replace(/data: \{/g, `data: { type: 'EXAM', status: 'PUBLISHED', teacherId: req.user?.userId || 'unknown', `);
    code = code.replace(/startTime,/g, 'openAt: startTime,');
    code = code.replace(/endTime,/g, 'closeAt: endTime,');
    code = code.replace(/duration,/g, 'durationMinutes: duration,');
  } else if (type === 'ASSIGNMENT') {
    code = code.replace(/data: \{/g, `data: { type: 'ASSIGNMENT', status: 'PUBLISHED', teacherId: req.user?.userId || 'unknown', `);
    code = code.replace(/duration,/g, 'durationMinutes: duration,');
  }

  fs.writeFileSync(filePath, code);
}

refactorController('src/controllers/exam.controller.ts', 'EXAM');
refactorController('src/controllers/homework.controller.ts', 'ASSIGNMENT');

console.log('Done refactoring');
