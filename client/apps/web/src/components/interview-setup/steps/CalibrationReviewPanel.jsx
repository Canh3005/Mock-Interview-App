import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Play, Plus, Trash2, Upload } from 'lucide-react'
import { profileApi } from '../../../api/profile.api'
import { toast } from 'sonner'

const ALL_COMPETENCIES = [
  'ownership',
  'conflict_handling',
  'learning_agility',
  'technical_fundamentals',
  'trade_off_analysis',
  'system_thinking',
  'problem_solving',
  'communication',
  'collaboration',
  'impact_measurement',
  'leadership',
]

const PRIORITY_OPTIONS = ['low', 'medium', 'high']
const SEVERITY_OPTIONS = ['low', 'medium', 'high']

const inputClass =
  'dash-input w-full rounded-[14px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cta/30'
const labelClass =
  'dash-subtle mb-1 block text-xs font-semibold uppercase tracking-[0.06em]'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="dash-card rounded-[18px] p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--dash-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--dash-muted)]" />
        )}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

function TagEditor({ value, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const { t } = useTranslation()
  const tags = value ?? []

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--dash-border)] px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder ?? t('interviewSetup.calibration.tagPlaceholder')}
        />
        <button
          type="button"
          onClick={addTag}
          className="dash-control rounded-[12px] border px-3 py-2 text-xs font-semibold"
        >
          {t('interviewSetup.calibration.addTag')}
        </button>
      </div>
    </div>
  )
}

function CompetencyPicker({ value, onChange }) {
  const { t } = useTranslation()
  const selected = new Set(value ?? [])

  const toggle = (c) => {
    const next = selected.has(c)
      ? [...selected].filter((x) => x !== c)
      : [...selected, c]
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_COMPETENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => toggle(c)}
          className={[
            'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
            selected.has(c)
              ? 'border-cta bg-cta/10 text-cta'
              : 'border-[var(--dash-border)] dash-subtle hover:border-cta/40',
          ].join(' ')}
        >
          {t(`competencies.${c}`, c)}
        </button>
      ))}
    </div>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ profile, profileId }) {
  const { t } = useTranslation()
  const [cvTechStack, setCvTechStack] = useState(profile?.cvTechStack ?? [])
  const [jdTechRequirements, setJdTechRequirements] = useState(profile?.jdTechRequirements ?? [])
  const [priorityCompetencies, setPriorityCompetencies] = useState(
    profile?.priorityCompetencies ?? [],
  )

  const save = async (field, val) => {
    if (!profileId) return
    try {
      await profileApi.updateCalibrationProfile(profileId, { [field]: val })
    } catch {
      toast.error(t('interviewSetup.calibration.saveFailed'))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.cvTechStack')}</label>
        <TagEditor
          value={cvTechStack}
          onChange={(val) => { setCvTechStack(val); void save('cvTechStack', val) }}
        />
      </div>
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.jdTechRequirements')}</label>
        <TagEditor
          value={jdTechRequirements}
          onChange={(val) => { setJdTechRequirements(val); void save('jdTechRequirements', val) }}
        />
      </div>
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.priorityCompetencies')}</label>
        <CompetencyPicker
          value={priorityCompetencies}
          onChange={(val) => { setPriorityCompetencies(val); void save('priorityCompetencies', val) }}
        />
      </div>
    </div>
  )
}

// ─── Claim row ────────────────────────────────────────────────────────────────

function ClaimRow({ claim, onDelete }) {
  const { t } = useTranslation()
  const [priority, setPriority] = useState(claim.verificationPriority ?? 'medium')
  const [competencies, setCompetencies] = useState(claim.impliedCompetencies ?? [])
  const [saving, setSaving] = useState(false)

  const save = async (field, val) => {
    setSaving(true)
    try {
      await profileApi.updateClaim(claim.id, { [field]: val })
    } catch {
      toast.error(t('interviewSetup.calibration.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[14px] border border-[var(--dash-border)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm leading-relaxed">{claim.claimText}</p>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-[var(--dash-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <label className={labelClass}>{t('interviewSetup.calibration.priority')}</label>
          <select
            className={`${inputClass} w-28`}
            value={priority}
            disabled={saving}
            onChange={(e) => { setPriority(e.target.value); void save('verificationPriority', e.target.value) }}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.claimCompetencies')}</label>
        <CompetencyPicker
          value={competencies}
          onChange={(val) => { setCompetencies(val); void save('impliedCompetencies', val) }}
        />
      </div>
    </div>
  )
}

// ─── Add claim form ───────────────────────────────────────────────────────────

function AddClaimForm({ profileId, onAdded }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [competencies, setCompetencies] = useState([])
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const created = await profileApi.addClaim(profileId, {
        claimText: text.trim(),
        verificationPriority: priority,
        impliedCompetencies: competencies,
        techContext: [],
      })
      onAdded(created)
      setText('')
      setPriority('medium')
      setCompetencies([])
      setOpen(false)
    } catch {
      toast.error(t('interviewSetup.calibration.addFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dash-control inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed py-2 text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('interviewSetup.calibration.addClaim')}
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-[14px] border border-dashed border-[var(--dash-border)] p-4">
      <textarea
        className={`${inputClass} resize-none`}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('interviewSetup.calibration.addClaimPlaceholder')}
        autoFocus
      />
      <div className="flex items-center gap-3">
        <select
          className={`${inputClass} w-28`}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.claimCompetencies')}</label>
        <CompetencyPicker value={competencies} onChange={setCompetencies} />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="dash-control rounded-[12px] border px-3 py-1.5 text-xs font-semibold"
        >
          ×
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="dash-control inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('interviewSetup.calibration.addClaim')}
        </button>
      </div>
    </div>
  )
}

// ─── Risk row ─────────────────────────────────────────────────────────────────

function RiskRow({ risk, onDelete }) {
  const { t } = useTranslation()
  const [severity, setSeverity] = useState(risk.severity ?? 'medium')
  const [competencies, setCompetencies] = useState(risk.relatedCompetencies ?? [])
  const [saving, setSaving] = useState(false)

  const save = async (field, val) => {
    setSaving(true)
    try {
      await profileApi.updateRisk(risk.id, { [field]: val })
    } catch {
      toast.error(t('interviewSetup.calibration.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[14px] border border-[var(--dash-border)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm leading-relaxed">{risk.rationale}</p>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-[var(--dash-muted)] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.severity')}</label>
        <select
          className={`${inputClass} w-28`}
          value={severity}
          disabled={saving}
          onChange={(e) => { setSeverity(e.target.value); void save('severity', e.target.value) }}
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.riskCompetencies')}</label>
        <CompetencyPicker
          value={competencies}
          onChange={(val) => { setCompetencies(val); void save('relatedCompetencies', val) }}
        />
      </div>
    </div>
  )
}

// ─── Add risk form ────────────────────────────────────────────────────────────

function AddRiskForm({ profileId, onAdded }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [competencies, setCompetencies] = useState([])
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const created = await profileApi.addRisk(profileId, {
        rationale: text.trim(),
        severity,
        relatedCompetencies: competencies,
        suggestedProbeFocus: [],
      })
      onAdded(created)
      setText('')
      setSeverity('medium')
      setCompetencies([])
      setOpen(false)
    } catch {
      toast.error(t('interviewSetup.calibration.addFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dash-control inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed py-2 text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('interviewSetup.calibration.addRisk')}
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-[14px] border border-dashed border-[var(--dash-border)] p-4">
      <textarea
        className={`${inputClass} resize-none`}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('interviewSetup.calibration.addRiskPlaceholder')}
        autoFocus
      />
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.severity')}</label>
        <select
          className={`${inputClass} w-28`}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>{t('interviewSetup.calibration.riskCompetencies')}</label>
        <CompetencyPicker value={competencies} onChange={setCompetencies} />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="dash-control rounded-[12px] border px-3 py-1.5 text-xs font-semibold"
        >
          ×
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="dash-control inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('interviewSetup.calibration.addRisk')}
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CalibrationReviewPanel({ data, profileId, onConfirm, onGoUpload }) {
  const { t } = useTranslation()
  const [claims, setClaims] = useState(data?.claims ?? [])
  const [risks, setRisks] = useState(data?.risks ?? [])

  if (!data) {
    return (
      <div className="dash-card flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[22px] p-8 text-center">
        <p className="dash-muted text-sm">{t('interviewSetup.calibration.noData')}</p>
        <button
          type="button"
          onClick={onGoUpload}
          className="dash-control inline-flex items-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-semibold"
        >
          <Upload className="h-4 w-4" />
          {t('interviewSetup.calibration.goUpload')}
        </button>
      </div>
    )
  }

  const handleDeleteClaim = async (id) => {
    try {
      await profileApi.deleteClaim(id)
      setClaims((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error(t('interviewSetup.calibration.deleteFailed'))
    }
  }

  const handleDeleteRisk = async (id) => {
    try {
      await profileApi.deleteRisk(id)
      setRisks((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast.error(t('interviewSetup.calibration.deleteFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <Section title={t('interviewSetup.calibration.profileSection')}>
        <ProfileSection profile={data.profile} profileId={profileId} />
      </Section>

      <Section title={`${t('interviewSetup.calibration.claimsSection')} (${claims.length})`}>
        <div className="space-y-2">
          {claims.length === 0 && (
            <p className="dash-subtle text-sm">{t('interviewSetup.calibration.noClaims')}</p>
          )}
          {claims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} onDelete={() => handleDeleteClaim(claim.id)} />
          ))}
          <AddClaimForm profileId={profileId} onAdded={(c) => setClaims((prev) => [...prev, c])} />
        </div>
      </Section>

      <Section
        title={`${t('interviewSetup.calibration.risksSection')} (${risks.length})`}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {risks.length === 0 && (
            <p className="dash-subtle text-sm">{t('interviewSetup.calibration.noRisks')}</p>
          )}
          {risks.map((risk) => (
            <RiskRow key={risk.id} risk={risk} onDelete={() => handleDeleteRisk(risk.id)} />
          ))}
          <AddRiskForm profileId={profileId} onAdded={(r) => setRisks((prev) => [...prev, r])} />
        </div>
      </Section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onGoUpload}
          className="dash-control inline-flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold"
        >
          <Upload className="h-4 w-4" />
          {t('interviewSetup.calibration.reupload')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-[14px] bg-cta px-5 py-2.5 text-sm font-bold text-white hover:bg-cta/90"
        >
          <Play className="h-4 w-4" />
          {t('interviewSetup.calibration.confirm')}
        </button>
      </div>
    </div>
  )
}
