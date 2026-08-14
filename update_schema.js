const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'database', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const enumsToAdd = `
enum CountryCode {
  EG
}

enum EducationLevel {
  PRIMARY
  PREPARATORY
  SECONDARY
  UNIVERSITY
  OTHER
}

enum GradeLevel {
  PRIMARY_1
  PRIMARY_2
  PRIMARY_3
  PRIMARY_4
  PRIMARY_5
  PRIMARY_6
  PREPARATORY_1
  PREPARATORY_2
  PREPARATORY_3
  SECONDARY_1
  SECONDARY_2
  SECONDARY_3
  OTHER
}
`;

// Append enums
if (!schema.includes('enum CountryCode')) {
  schema += '\n' + enumsToAdd;
}

// User model updates
schema = schema.replace(
  /academicLevel AcademicLevel\?/,
  `academicLevel AcademicLevel?
  country       CountryCode?
  educationLevel EducationLevel?
  gradeLevel    GradeLevel?`
);

// Course model updates
// Find the course model specifically
schema = schema.replace(
  /model Course \{[\s\S]*?teacherId\s+String[\s\S]*?\}/,
  (match) => {
    if (match.includes('academicLevel AcademicLevel?')) {
      return match.replace(
        /academicLevel AcademicLevel\?/,
        `academicLevel AcademicLevel?
  country       CountryCode?
  educationLevel EducationLevel?
  gradeLevel    GradeLevel?`
      );
    } else {
      return match.replace(
        /teacherId\s+String/,
        `teacherId   String
  academicLevel AcademicLevel?
  country       CountryCode?
  educationLevel EducationLevel?
  gradeLevel    GradeLevel?`
      );
    }
  }
);

// QuestionBank model updates
schema = schema.replace(
  /model QuestionBank \{[\s\S]*?academicLevel AcademicLevel\?[\s\S]*?\}/,
  (match) => {
    return match.replace(
      /academicLevel AcademicLevel\?/,
      `academicLevel AcademicLevel?
  country       CountryCode?
  educationLevel EducationLevel?
  gradeLevel    GradeLevel?`
    );
  }
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('done');
