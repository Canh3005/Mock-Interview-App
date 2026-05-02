import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, AlertTriangle, CheckCircle2, Clock, AlertCircle, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { loadRequest, resetSDSession } from '../../store/slices/sdSessionSlice'
import SDCanvas from './SDCanvas'
import NodeLibrary from './NodeLibrary'
import RightPanel from './RightPanel'
import ResizeDivider from '../shared/ui/ResizeDivider'

const RIGHT_PANEL_MIN = 240
const RIGHT_PANEL_MAX = 560
const RIGHT_PANEL_DEFAULT = 320

const PHASES = ['CLARIFICATION', 'DESIGN', 'DEEP_DIVE', 'WRAP_UP']

function AutoSaveIndicator({ status }) {
  const { t } = useTranslation()
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
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
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
              i < activeIdx
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : i === activeIdx
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {t(`sdRoom.phase.${p}`)}
          </div>
          {i < PHASES.length - 1 && <div className="w-3 h-px bg-slate-700" />}
        </div>
      ))}
    </div>
  )
}

export default function SDRoomPage({ navigate, sdSessionId }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { loading, error, phase, autoSaveStatus } = useSelector((s) => s.sdSession)
  const [rightWidth, setRightWidth] = useState(RIGHT_PANEL_DEFAULT)

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightWidth

    const onMouseMove = (mv) => {
      const next = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, startWidth + startX - mv.clientX))
      setRightWidth(next)
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [rightWidth])

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
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={() => dispatch(loadRequest(sdSessionId))}
            className="px-4 py-2 rounded-lg bg-cta text-cta-foreground text-sm font-medium hover:bg-cta/90"
          >
            Retry
          </button>
        </div>
      </div>
    )

  return (
    <div className="h-screen flex flex-col bg-background">
      <nav className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <PhaseProgressBar phase={phase} />
        <div className="flex items-center gap-4">
          <AutoSaveIndicator status={autoSaveStatus} />
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('sdRoom.exit')}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden gap-0 p-1.5 pt-1">
        <NodeLibrary />
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-800/60 ml-1.5">
          <SDCanvas isLocked={isCanvasLocked} />
        </div>
        <ResizeDivider onMouseDown={handleResizeStart} />
        <RightPanel width={rightWidth} />
      </div>
    </div>
  )
}
