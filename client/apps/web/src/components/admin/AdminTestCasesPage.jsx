import React from 'react'
import { FileArchive, UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AdminTestCasesPage() {
  const { t } = useTranslation()

  return (
    <main className="dash-page">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('adminTestCases.title')}</h1>
          <p className="dash-page-description">
            {t('adminTestCases.subtitle')}
          </p>
        </div>
      </header>

      <section className="dash-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <div className="dash-icon-tile mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <UploadCloud className="h-10 w-10" />
        </div>

        <h2 className="dash-text mb-2 text-lg font-heading font-semibold">{t('adminTestCases.dropTitle')}</h2>
        <p className="dash-muted mb-8 max-w-sm text-sm font-body">
          {t('adminTestCases.dropDescription')}
        </p>

        <div className="w-full max-w-md">
          <label className="dash-muted-panel group block w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--dash-track)] p-8 transition-colors hover:border-[var(--dash-accent)]">
            <input type="file" className="hidden" accept=".zip" />
            <div className="flex flex-col items-center gap-3">
              <FileArchive className="dash-subtle h-8 w-8 transition-colors group-hover:text-[var(--dash-accent-text)]" />
              <div className="dash-accent font-medium font-body">{t('adminTestCases.chooseFile')}</div>
            </div>
          </label>
        </div>

        <div className="dash-subtle mt-8 flex items-center gap-4 text-xs font-body">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--dash-accent)]" />
            {t('adminTestCases.format')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {t('adminTestCases.namingRule')}
          </span>
        </div>
      </section>
    </main>
  )
}
