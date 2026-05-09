import { Coins } from 'lucide-react'

export default function InsufficientCreditModal({ creditError, onClose, onTopUp }) {
  const { required, current, deficit } = creditError
  return (
    <div className="flex flex-col items-center text-center gap-6 py-2">
      <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
        <Coins className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-heading font-bold text-white mb-2">
          Không đủ Credit
        </h2>
        <p className="text-slate-400 leading-relaxed max-w-sm">
          Bạn cần{' '}
          <span className="text-white font-semibold">{required} Credit</span> để bắt đầu phiên này.
          Hiện có{' '}
          <span className="text-white font-semibold">{current} Credit</span>. Thiếu{' '}
          <span className="text-red-400 font-semibold">{deficit} Credit</span>.
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium"
        >
          Đóng
        </button>
        <button
          onClick={onTopUp}
          className="flex-1 px-4 py-2.5 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold text-sm transition-colors"
        >
          Nạp Credit
        </button>
      </div>
    </div>
  )
}
