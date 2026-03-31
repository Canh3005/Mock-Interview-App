import { Mic, MicOff, Send, RotateCcw, Keyboard } from 'lucide-react';

export default function CombatInputBar({
  inputMode, transcript, textInput, setTextInput,
  isRecording, isStreaming, isAiSpeaking, canSend,
  onSend, onClearTranscript, onSwitchToVoice, onSwitchToText,
}) {
  return (
    <div className="border-t border-slate-800 px-4 pt-3 pb-4 flex flex-col gap-2 flex-shrink-0">
      {/* Mode toggle */}
      <div className="flex items-center">
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          <button
            onClick={onSwitchToVoice}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              inputMode === 'voice'
                ? 'bg-cta/20 border border-cta/40 text-cta'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Mic className="w-3 h-3" />
            Voice
          </button>
          <button
            onClick={onSwitchToText}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-cta/20 border border-cta/40 text-cta'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Keyboard className="w-3 h-3" />
            Text
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="flex gap-2 items-end">
        {inputMode === 'voice' ? (
          <div className={`flex-1 min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
            isRecording ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/80 border-slate-700'
          }`}>
            {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
            <span className={`text-sm flex-1 ${transcript ? 'text-slate-100' : 'text-slate-500'}`}>
              {transcript || (isRecording ? 'Đang lắng nghe...' : 'Chờ lượt của bạn...')}
            </span>
            {transcript && (
              <button
                onClick={onClearTranscript}
                className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                title="Xóa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {isRecording
              ? <MicOff className="w-4 h-4 text-red-400 flex-shrink-0" />
              : <Mic className="w-4 h-4 text-slate-600 flex-shrink-0" />
            }
          </div>
        ) : (
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Nhập câu trả lời của bạn... (Enter để gửi)"
            disabled={isStreaming || isAiSpeaking}
            rows={2}
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-cta/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
            }}
          />
        )}

        <button
          onClick={onSend}
          disabled={!canSend || isStreaming}
          className="p-3 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Gửi"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
