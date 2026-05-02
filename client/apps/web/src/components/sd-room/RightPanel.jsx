import { useState } from 'react'
import { MessageSquare, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AiChatPanel from './AiChatPanel'
import PhaseGuidePanel from './PhaseGuidePanel'

const TABS = [
  { key: 'ai', labelKey: 'sdRoom.aiChat.title', Icon: MessageSquare },
  { key: 'guide', labelKey: 'sdRoom.phaseGuide.title', Icon: BookOpen },
]

export default function RightPanel({ width }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('ai')

  return (
    <div style={{ width }} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60">
      <div className="flex items-center border-b border-slate-800 bg-slate-900 flex-shrink-0">
        {TABS.map(({ key, labelKey, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              activeTab === key
                ? 'border-cta text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className={`flex-1 overflow-hidden ${activeTab === 'ai' ? '' : 'hidden'}`}>
        <AiChatPanel />
      </div>
      <div className={`flex-1 overflow-y-auto ${activeTab === 'guide' ? '' : 'hidden'}`}>
        <PhaseGuidePanel />
      </div>
    </div>
  )
}
