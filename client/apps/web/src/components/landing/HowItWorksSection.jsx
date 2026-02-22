/**
 * HowItWorksSection — 3-step flow with connector line
 * Style: dark surface, step circles with cta border, slate text
 */
import { UserCheck, FileEdit, TrendingUp } from 'lucide-react'

const STEPS = [
  {
    icon: UserCheck,
    step: '01',
    title: 'Tạo tài khoản miễn phí',
    description:
      'Đăng ký trong vòng 30 giây. Chọn cấp độ và lĩnh vực muốn luyện tập để nhận lộ trình cá nhân hóa.',
  },
  {
    icon: FileEdit,
    step: '02',
    title: 'Tham gia buổi phỏng vấn thử',
    description:
      'Bắt đầu phiên giả lập. Trả lời câu hỏi lý thuyết và giải bài coding trực tiếp trong IDE tích hợp.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Xem phân tích và cải thiện',
    description:
      'Nhận báo cáo chi tiết sau mỗi buổi. Theo dõi tiến độ trên dashboard và tập trung vào điểm yếu.',
  },
]

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-24 bg-primary border-t border-slate-700/40"
    >
      <div className="mx-auto max-w-[1200px] px-6">

        {/* Section header */}
        <div className="text-center mb-16">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-cta mb-3">
            Cách hoạt động
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight">
            Bắt đầu chỉ trong{' '}
            <span className="text-cta">3 bước đơn giản</span>
          </h2>
        </div>

        {/* Steps row */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-0">
          {STEPS.map(({ icon: Icon, step, title, description }, index) => (
            <div key={step} className="relative flex md:flex-col items-start md:items-center flex-1">

              {/* Connector line — desktop */}
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden md:block absolute top-[22px] left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-slate-700/80"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.1) 100%)',
                  }}
                />
              )}

              {/* Connector line — mobile */}
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="md:hidden absolute left-[22px] top-[44px] w-px h-[calc(100%+24px)]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.1) 100%)',
                  }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-0 pb-10 md:pb-0 md:px-6 w-full">

                {/* Step circle */}
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full border-2 border-cta/50 bg-cta/10 text-cta shadow-md">
                  <Icon size={19} strokeWidth={1.8} />
                </div>

                {/* Text */}
                <div className="md:text-center md:mt-5">
                  <span className="font-heading text-[10px] font-semibold tracking-widest text-cta/50 mb-1 block uppercase">
                    Bước {step}
                  </span>
                  <h3 className="font-heading text-sm font-semibold text-white mb-2">
                    {title}
                  </h3>
                  <p className="font-body text-sm text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
