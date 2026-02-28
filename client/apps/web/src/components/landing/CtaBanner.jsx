/**
 * CtaBanner — Full-width CTA section with cta green gradient
 * Style: dark variant using cta as background on a surface card
 */
import { Play, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function CtaBanner({ navigate }) {
  const { t } = useTranslation()
  
  return (
    <section className="py-20 sm:py-24 bg-background border-t border-slate-700/40">
      <div className="mx-auto max-w-[1200px] px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.3 }}
          className="relative overflow-hidden rounded-[16px] bg-primary border border-cta/20 px-8 py-14 text-center shadow-card-hover"
        >

          {/* Ambient glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 80% at 50% 0%, #22C55E, transparent)',
            }}
          />

          <div className="relative z-10">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-cta mb-4">
              {t('cta.title')}
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {t('cta.subtitle')}
            </h2>
            <p className="font-body text-sm text-slate-400 mb-10 max-w-md mx-auto">
              {t('cta.free')}
            </p>

            <button
              onClick={() => navigate('interview-room')}
              className="group inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-7 py-3.5 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              <Play size={15} className="fill-white" />
              {t('cta.button')}
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
