import React, { createContext, useContext, useCallback } from 'react';
import { useStore } from '../store/useStore';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const language = useStore((state) => state.profile?.language || 'en');

  const t = useCallback(
    (key) => {
      // Try current language first, fall back to English
      const langStrings = translations[language];
      if (langStrings && langStrings[key] !== undefined) {
        return langStrings[key];
      }
      // Fall back to English
      if (translations.en[key] !== undefined) {
        return translations.en[key];
      }
      // Ultimate fallback: return the key itself
      return key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ t, language }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access translations.
 * Usage:
 *   const { t } = useTranslation();
 *   <Text>{t('dashboard')}</Text>
 */
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside provider (e.g. during tests)
    return {
      t: (key) => translations.en[key] || key,
      language: 'en',
    };
  }
  return context;
}
