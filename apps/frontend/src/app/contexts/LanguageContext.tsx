import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, TranslationKey } from '../utils/translations';

type Language = 'ARABIC' | 'ENGLISH';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('edu-lang') as Language;
    return saved || 'ARABIC';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isRtl = language === 'ARABIC';
    
    root.setAttribute('lang', language === 'ARABIC' ? 'ar' : 'en');
    root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    
    localStorage.setItem('edu-lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl: language === 'ARABIC', t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
