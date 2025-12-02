/**
 * Internationalization (i18n) Configuration
 * 
 * Supports: English, Spanish, German, French
 * Add more languages by creating locale files in src/locales/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

// Available languages
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

// Get saved language or detect from browser
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('app_language');
  if (saved && languages.find(l => l.code === saved)) {
    return saved;
  }
  
  // Detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (languages.find(l => l.code === browserLang)) {
    return browserLang;
  }
  
  return 'en'; // Default to English
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    react: {
      useSuspense: false, // Disable suspense for better loading
    },
  });

// Function to change language and save preference
export const changeLanguage = (langCode: string): void => {
  i18n.changeLanguage(langCode);
  localStorage.setItem('app_language', langCode);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export default i18n;

