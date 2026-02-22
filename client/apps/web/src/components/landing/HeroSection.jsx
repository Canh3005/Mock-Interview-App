/**
 * HeroSection — Main hero area for Landing Page
 * Background: hero-bg.png (hexagonal green glow) with dark overlay
 * Style: dark bg, green CTA, Fira Code heading, slate muted text
 */
import { Play, ArrowRight, ChevronRight } from 'lucide-react'

const STATS = [
  { value: '2,400+', label: 'Câu hỏi phỏng vấn' },
  { value: '98%',    label: 'Tỉ lệ hài lòng'    },
  { value: '350+',   label: 'Người dùng active'  },
]

export default function HeroSection({ navigate }) {
  const scrollToFeatures = () =>
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36">

      {/* ── Background image + layered overlays ── */}
      <div
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
      <div className="relative z-10 mx-auto max-w-[760px] px-6 text-center">

        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-cta/25 bg-cta/10 px-3.5 py-1 font-body text-xs font-medium text-cta mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cta animate-pulse" aria-hidden="true" />
          Nền tảng luyện phỏng vấn IT chuyên sâu
        </span>

        {/* Heading */}
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Chinh phục mọi kỳ phỏng vấn&nbsp;
          <span className="text-cta">IT</span>
          <br className="hidden sm:block" />
          tại các tập đoàn công nghệ
        </h1>

        {/* Sub-description */}
        <p className="font-body text-base sm:text-lg text-slate-300 leading-relaxed mb-10 max-w-xl mx-auto">
          Môi trường giả lập sát thực tế, IDE JavaScript tích hợp và bảng phân tích
          kỹ năng chuyên sâu — tất cả trong một nền tảng duy nhất.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary */}
          <button
            onClick={() => navigate('interview-room')}
            className="group inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <Play size={15} className="fill-white" />
            Bắt đầu luyện tập
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
            Xem tính năng
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-heading text-2xl sm:text-3xl font-bold text-cta tabular-nums drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]">
                {value}
              </div>
              <div className="font-body text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
