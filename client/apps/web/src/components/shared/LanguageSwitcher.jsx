import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'vi', short: 'VN', labelKey: 'interviewSetup.languages.vi' },
  { code: 'en', short: 'EN', labelKey: 'interviewSetup.languages.en' },
  { code: 'ja', short: 'JA', labelKey: 'interviewSetup.languages.ja' },
]

export default function LanguageSwitcher({ variant = 'dark' }) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0]
  const isLight = variant === 'light'

  const triggerClass = isLight
    ? 'dash-control dash-muted hover:text-[var(--dash-text)]'
    : 'border-slate-700/60 bg-slate-900 text-slate-300 hover:border-cta/60 hover:text-white'

  const menuClass = isLight
    ? 'dash-card shadow-xl'
    : 'border-slate-700/60 bg-slate-900 shadow-lg'

  const getItemClass = (active) => {
    if (active) return 'dash-nav-active'
    return isLight
      ? 'dash-nav-muted hover:bg-[var(--dash-surface-muted)]'
      : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
  }

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    setIsOpen(false)
  }

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
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-10 items-center gap-2 rounded-[14px] border px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta ${triggerClass}`}
        aria-label={t('shared.changeLanguage')}
        aria-expanded={isOpen}
      >
        <Languages size={16} />
        <span className="hidden whitespace-nowrap text-xs font-semibold sm:inline">
          {currentLanguage.short} {t(currentLanguage.labelKey)}
        </span>
        <span className="text-xs font-semibold sm:hidden">
          {currentLanguage.short}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-[16px] border ${menuClass}`}>
          {LANGUAGES.map((lang) => {
            const active = i18n.language === lang.code

            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150 ${getItemClass(active)}`}
              >
                <span className="flex items-center gap-2">
                  <span className="dash-subtle text-xs font-semibold">{lang.short}</span>
                  <span className="font-semibold">{t(lang.labelKey)}</span>
                </span>
                {active && <Check size={16} className="text-cta" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
