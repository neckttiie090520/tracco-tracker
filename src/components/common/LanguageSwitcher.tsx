import React from 'react'
import { useLanguage, Language } from '../../contexts/LanguageContext'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage)
    // Save to localStorage for persistence
    localStorage.setItem('preferred-language', newLanguage)
  }
  
  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleLanguageChange('th')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'th'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          language === 'en'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        EN
      </button>
    </div>
  )
}