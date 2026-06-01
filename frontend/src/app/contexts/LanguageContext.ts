import React, { createContext, useState, useEffect } from 'react';
import i18n from '@ngx-translate/core'; // Existing i18n integration
import { LanguageService } from '../core/services/language.service';

export const LanguageContext = createContext({
  language: 'en',
  setLanguage: (code: string) => {},
});

export const LanguageProvider: React.FC<{ languageService: LanguageService }> = ({ children, languageService }) => {
  const [language, setLanguage] = useState(languageService.currentLang || 'en');

  useEffect(() => {
    i18n.changeLanguage(language); // Dynamically update language globally
    languageService.use(language); // Notify LanguageService
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};