/**
 * FeaturesSection — 3-column feature cards grid
 * Style: surface (#1E293B) cards, cta green accent, slate text
 */
import { BrainCircuit, Code2, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function FeaturesSection() {
  const { t } = useTranslation()
  
  const FEATURES = [
    {
      icon: BrainCircuit,
      title: t('features.interview.title'),
      description: t('features.interview.description'),
      accent: 'cta',
    },
    {
      icon: Code2,
      title: t('features.ide.title'),
      description: t('features.ide.description'),
      accent: 'cta',
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      accent: 'cta',
    },
  ]
  return (
    <section id="features" className="py-20 sm:py-24 bg-background border-t border-slate-700/40">
      <div className="mx-auto max-w-[1200px] px-6">

        {/* Section header */}
        <div className="text-center mb-14">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-cta mb-3">
            {t('features.sectionBadge')}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight">
            {t('features.sectionTitle')}
          </h2>
          <p className="font-body text-sm text-slate-400 mt-4 max-w-md mx-auto">
            {t('features.sectionSubtitle')}
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
              tabIndex={0}
            >
              {/* Icon badge */}
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cta/15 border border-cta/25 text-cta mb-5">
                <Icon size={20} strokeWidth={1.8} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-sm font-semibold text-white mb-2 group-hover:text-cta transition-colors duration-200">
                {title}
              </h3>
              <p className="font-body text-sm text-slate-400 leading-relaxed">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
