/**
 * HeroSection — Main hero area for Landing Page
 * Style: dark bg (#0F172A), green CTA, Fira Code heading, slate muted text
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
    <section className="relative overflow-hidden bg-background pt-20 pb-28 sm:pt-28 sm:pb-36">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: '#22C55E' }}
      />

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
        <p className="font-body text-base sm:text-lg text-slate-400 leading-relaxed mb-10 max-w-xl mx-auto">
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
            className="inline-flex items-center gap-2 font-body text-sm font-semibold text-slate-300 border border-slate-600 hover:border-cta/60 hover:text-cta px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full sm:w-auto justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            Xem tính năng
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-heading text-2xl sm:text-3xl font-bold text-cta tabular-nums">
                {value}
              </div>
              <div className="font-body text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
