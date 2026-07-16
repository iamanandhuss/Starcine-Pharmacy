import React, { createContext, useContext, useState } from 'react';
import enTranslations from '../locales/en/translation.json';
import mlTranslations from '../locales/ml/translation.json';

export type Language = 'en' | 'ml';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, any> = {
  en: enTranslations,
  ml: mlTranslations,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Check local storage
    const saved = localStorage.getItem('pharmacyops_language');
    if (saved === 'en' || saved === 'ml') return saved as Language;
    
    // 2. Check environment variable
    const envDefault = import.meta.env.VITE_DEFAULT_LANGUAGE;
    if (envDefault === 'en' || envDefault === 'ml') return envDefault as Language;
    
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pharmacyops_language', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const parts = key.split('.');
    let current = translations[language];

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English translation if Malayalam is missing
        let enCurrent = translations['en'];
        for (const enPart of parts) {
          if (enCurrent && typeof enCurrent === 'object' && enPart in enCurrent) {
            enCurrent = enCurrent[enPart];
          } else {
            enCurrent = null;
            break;
          }
        }
        return typeof enCurrent === 'string' ? replacePlaceholders(enCurrent, replacements) : key;
      }
    }

    if (typeof current === 'string') {
      return replacePlaceholders(current, replacements);
    }

    return key;
  };

  const replacePlaceholders = (text: string, replacements?: Record<string, string | number>): string => {
    if (!replacements) return text;
    let result = text;
    for (const [k, v] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
