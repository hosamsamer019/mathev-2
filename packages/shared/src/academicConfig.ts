export const ACADEMIC_CONFIG = {
  EG: {
    label: 'مصر',
    levels: {
      PRIMARY: {
        label: 'ابتدائي',
        grades: {
          PRIMARY_1: 'الصف الأول الابتدائي',
          PRIMARY_2: 'الصف الثاني الابتدائي',
          PRIMARY_3: 'الصف الثالث الابتدائي',
          PRIMARY_4: 'الصف الرابع الابتدائي',
          PRIMARY_5: 'الصف الخامس الابتدائي',
          PRIMARY_6: 'الصف السادس الابتدائي'
        }
      },
      PREPARATORY: {
        label: 'إعدادي',
        grades: {
          PREPARATORY_1: 'الصف الأول الإعدادي',
          PREPARATORY_2: 'الصف الثاني الإعدادي',
          PREPARATORY_3: 'الصف الثالث الإعدادي'
        }
      },
      SECONDARY: {
        label: 'ثانوي',
        grades: {
          SECONDARY_1: 'الصف الأول الثانوي',
          SECONDARY_2: 'الصف الثاني الثانوي',
          SECONDARY_3: 'الصف الثالث الثانوي'
        }
      }
    }
  }
} as const;

export type CountryCode = keyof typeof ACADEMIC_CONFIG;

export const isValidAcademicProfile = (
  country: string | null | undefined,
  educationLevel: string | null | undefined,
  gradeLevel: string | null | undefined
): boolean => {
  if (!country || !educationLevel || !gradeLevel) return false;
  
  const countryConfig = ACADEMIC_CONFIG[country as CountryCode];
  if (!countryConfig) return false;
  
  const levelConfig = (countryConfig.levels as any)[educationLevel];
  if (!levelConfig) return false;
  
  const gradeLabel = levelConfig.grades[gradeLevel];
  if (!gradeLabel) return false;
  
  return true;
};
