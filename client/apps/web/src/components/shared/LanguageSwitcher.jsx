/**
 * LanguageSwitcher — Dropdown to change the application language
 * Supports: Vietnamese (vi), English (en), Japanese (ja)
 */
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0]

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary border border-slate-700/60 text-slate-300 hover:text-white hover:border-cta/60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <Languages size={16} />
        <span className="text-xs font-medium hidden sm:inline">
          {currentLanguage.flag} {currentLanguage.label}
        </span>
        <span className="text-xs font-medium sm:hidden">
          {currentLanguage.flag}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-primary border border-slate-700/60 rounded-lg shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150
                ${i18n.language === lang.code
                  ? 'bg-cta/10 text-cta'
                  : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span className="font-medium">{lang.label}</span>
              </span>
              {i18n.language === lang.code && (
                <Check size={16} className="text-cta" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
