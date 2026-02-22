/**
 * FeaturesSection — 3-column feature cards grid
 * Style: surface (#1E293B) cards, cta green accent, slate text
 */
import { BrainCircuit, Code2, BarChart3 } from 'lucide-react'

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Phỏng vấn giả lập sát thực tế',
    description:
      'Bộ câu hỏi được chọn lọc từ các vòng phỏng vấn kỹ thuật tại FAANG và các tập đoàn công nghệ hàng đầu, cập nhật liên tục.',
    accent: 'cta',
  },
  {
    icon: Code2,
    title: 'IDE JavaScript tích hợp',
    description:
      'Viết code và chạy thử trực tiếp trong trình duyệt với syntax highlighting, auto-indent và phản hồi output tức thì.',
    accent: 'cta',
  },
  {
    icon: BarChart3,
    title: 'Bảng phân tích kỹ năng chuyên sâu',
    description:
      'Radar chart trực quan hóa điểm mạnh và điểm yếu theo từng chủ đề: DSA, System Design, OOP — giúp bạn học đúng trọng tâm.',
    accent: 'cta',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-24 bg-background border-t border-slate-700/40">
      <div className="mx-auto max-w-[1200px] px-6">

        {/* Section header */}
        <div className="text-center mb-14">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-cta mb-3">
            Tính năng nổi bật
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight">
            Mọi thứ bạn cần để thành công
          </h2>
          <p className="font-body text-sm text-slate-400 mt-4 max-w-md mx-auto">
            Ba trụ cột cốt lõi giúp bạn luyện tập toàn diện và tự tin bước vào phòng phỏng vấn.
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
