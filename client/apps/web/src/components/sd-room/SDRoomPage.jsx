import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, AlertTriangle, CheckCircle2, Clock, AlertCircle, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { loadRequest, resetSDSession } from '../../store/slices/sdSessionSlice'
import SDCanvas from './SDCanvas'
import NodeLibrary from './NodeLibrary'
import WalkthroughPanel from './WalkthroughPanel'

const PHASES = ['CLARIFICATION', 'DESIGN', 'DEEP_DIVE', 'WRAP_UP']

function AutoSaveIndicator({ status }) {
  const { t } = useTranslation()
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3 animate-spin" />
        {t('sdRoom.autoSaveStatus.saving')}
      </span>
    )
  if (status === 'saved')
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        {t('sdRoom.autoSaveStatus.saved')}
      </span>
    )
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="w-3 h-3" />
        {t('sdRoom.autoSaveStatus.error')}
      </span>
    )
  return null
}

function PhaseProgressBar({ phase }) {
  const { t } = useTranslation()
  const activeIdx = PHASES.indexOf(phase)

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div
            className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
              i < activeIdx
                ? 'bg-green-500/20 text-green-400'
                : i === activeIdx
                ? 'bg-cta/20 text-cta'
                : 'bg-background text-muted-foreground border border-border'
            }`}
          >
            {t(`sdRoom.phase.${p}`)}
          </div>
          {i < PHASES.length - 1 && <div className="w-4 h-px bg-border" />}
        </div>
      ))}
    </div>
  )
}

export default function SDRoomPage({ navigate, sdSessionId }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { loading, error, phase, autoSaveStatus } = useSelector((s) => s.sdSession)

  useEffect(() => {
    if (sdSessionId) dispatch(loadRequest(sdSessionId))
    return () => { dispatch(resetSDSession()) }
  }, [sdSessionId, dispatch])

  const isCanvasLocked = phase === 'CLARIFICATION'

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-cta animate-spin" />
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            onClick={() => dispatch(loadRequest(sdSessionId))}
            className="px-4 py-2 rounded-md bg-cta text-cta-foreground text-sm font-medium hover:bg-cta/90"
          >
            Retry
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <PhaseProgressBar phase={phase} />
        <div className="flex items-center gap-4">
          <AutoSaveIndicator status={autoSaveStatus} />
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <NodeLibrary />
        <SDCanvas isLocked={isCanvasLocked} />
        <WalkthroughPanel />
      </div>
    </div>
  )
}
