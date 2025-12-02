/**
 * Language Selector Component
 * 
 * Allows users to change the app language.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { languages, changeLanguage, getCurrentLanguage } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
    // Force re-render by reloading (optional - can be handled with context)
    window.location.reload();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Globe className="w-5 h-5 text-slate-400" />
      <div className="flex-1">
        <label className="block text-sm font-medium text-white mb-1">
          {t('settings.language')}
        </label>
        <select
          value={currentLang}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LanguageSelector;

