/**
 * Internationalization (i18n) Configuration
 * 
 * Supports: English, Spanish, German, French
 * Add more languages by creating locale files in src/locales/
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import only English immediately - other languages loaded on demand
import en from './locales/en.json';

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

// Initialize i18n with English only initially
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
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

// Lazy load other languages on demand
const loadLanguage = async (langCode: string) => {
  if (i18n.hasResourceBundle(langCode, 'translation')) {
    return; // Already loaded
  }

  try {
    switch (langCode) {
      case 'es': {
        const es = await import('./locales/es.json');
        i18n.addResourceBundle('es', 'translation', es.default || es);
        break;
      }
      case 'de': {
        const de = await import('./locales/de.json');
        i18n.addResourceBundle('de', 'translation', de.default || de);
        break;
      }
      case 'fr': {
        const fr = await import('./locales/fr.json');
        i18n.addResourceBundle('fr', 'translation', fr.default || fr);
        break;
      }
    }
  } catch (error) {
    // Error loading language - use fallback
  }
};

// Load saved language if not English
const savedLang = getSavedLanguage();
if (savedLang !== 'en') {
  // Load asynchronously to not block initial render
  setTimeout(() => {
    loadLanguage(savedLang).then(() => {
      i18n.changeLanguage(savedLang);
    });
  }, 0);
}

// Function to change language and save preference
export const changeLanguage = async (langCode: string): Promise<void> => {
  await loadLanguage(langCode);
  i18n.changeLanguage(langCode);
  localStorage.setItem('app_language', langCode);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export default i18n;

