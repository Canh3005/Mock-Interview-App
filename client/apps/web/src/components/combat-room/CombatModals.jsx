import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function CombatModals({
  showExitModal, showFinishModal, currentStage,
  onCloseExit, onConfirmExit,
  onCloseFinish, onConfirmFinish,
}) {
  return (
    <>
      {/* ── Exit Modal ── */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={onCloseExit}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">Thoát Combat Mode?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Phiên thi sẽ bị hủy và{' '}
                    <span className="text-red-400 font-medium">không được chấm điểm</span>.
                    Tiến trình và câu trả lời hiện tại sẽ mất hoàn toàn.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onCloseExit}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Tiếp tục thi
                </button>
                <button
                  onClick={onConfirmExit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                >
                  Thoát
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Early Finish Warning Modal (chưa hoàn thành) ── */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={onCloseFinish}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-1">Kết thúc sớm?</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Bạn mới hoàn thành{' '}
                      <span className="text-red-400 font-medium">{currentStage}/6 giai đoạn</span>.
                      Kết thúc sớm sẽ ảnh hưởng đến điểm số — các giai đoạn chưa hoàn thành sẽ không được tính.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCloseFinish}
                  className="text-slate-500 hover:text-slate-300 transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onCloseFinish}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Tiếp tục thi
                </button>
                <button
                  onClick={onConfirmFinish}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                >
                  Vẫn kết thúc
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
