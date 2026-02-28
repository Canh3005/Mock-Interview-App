/**
 * HeroSection — Main hero area for Landing Page
 * Background: hero-bg.png (hexagonal green glow) with dark overlay
 * Style: dark bg, green CTA, Fira Code heading, slate muted text
 */
import { Play, ArrowRight, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function HeroSection({ navigate }) {
  const { t } = useTranslation()
  
  const STATS = [
    { value: '2,400+', label: t('hero.stats.questions') },
    { value: '98%',    label: t('hero.stats.satisfaction') },
    { value: '350+',   label: t('hero.stats.users') },
  ]

  const scrollToFeatures = () =>
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  }

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center justify-center py-20 sm:py-28">

      {/* ── Background image + layered overlays ── */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      {/* Dark gradient overlay — ensures text contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,15,30,0.82) 0%, rgba(10,15,30,0.70) 50%, rgba(10,15,30,0.90) 100%)',
        }}
      />

      {/* ── Content ── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-[760px] px-6 text-center"
      >

        {/* Badge */}
        <motion.span variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-cta/25 bg-cta/10 px-3.5 py-1 font-body text-xs font-medium text-cta mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cta animate-pulse" aria-hidden="true" />
          {t('hero.badge')}
        </motion.span>

        {/* Heading */}
        <motion.h1 variants={itemVariants} className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          {t('hero.title.main')}&nbsp;
          <span className="text-cta">{t('hero.title.highlight')}</span>
          <br className="hidden sm:block" />
          {t('hero.title.sub')}
        </motion.h1>

        {/* Sub-description */}
        <motion.p variants={itemVariants} className="font-body text-base sm:text-lg text-slate-300 leading-relaxed mb-10 max-w-xl mx-auto">
          {t('hero.subtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary */}
          <button
            onClick={() => navigate('interview-room')}
            className="group inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <Play size={15} className="fill-white" />
            {t('hero.ctaPrimary')}
            <ArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>

          {/* Secondary */}
          <button
            onClick={scrollToFeatures}
            className="inline-flex items-center gap-2 font-body text-sm font-semibold text-slate-200 border border-slate-500 hover:border-cta/60 hover:text-cta bg-black/20 backdrop-blur-sm px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            {t('hero.ctaSecondary')}
            <ChevronRight size={15} />
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={itemVariants} className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-heading text-2xl sm:text-3xl font-bold text-cta tabular-nums drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]">
                {value}
              </div>
              <div className="font-body text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
