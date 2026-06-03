import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router/routes'
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2,
  Loader2, Code2, SlidersHorizontal,
} from 'lucide-react'
import {
  loadProblems,
  setFilters,
  setPage,
  startPracticeDSASession,
} from '../../store/slices/practiceDSASlice'

const DIFF_COLOR  = { EASY: 'text-emerald-600 dark:text-emerald-400', MEDIUM: 'text-yellow-600 dark:text-yellow-400', HARD: 'text-red-600 dark:text-red-400' }
const DIFF_BG     = { EASY: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50', MEDIUM: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50', HARD: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' }
const DIFFICULTIES = ['', 'EASY', 'MEDIUM', 'HARD']

export default function ProblemBankPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { problems, total, currentPage, limit, filters, loading, error, solvedProblemIds, problemLoading } =
    useSelector((state) => state.practiceDSA)

  const [searchInput, setSearchInput] = useState(filters.search)
  const prevProblemLoadingRef = useRef(false)

  useEffect(() => {
    dispatch(loadProblems())
  }, [dispatch])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) dispatch(setFilters({ search: searchInput }))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput, dispatch, filters.search])

  const handleRowClick = (problem) => {
    const enabledTemplate = problem.templates?.find((t) => t.isEnabled) ?? problem.templates?.[0]
    const language = enabledTemplate?.languageId ?? 'python'
    dispatch(startPracticeDSASession({ problemId: problem.id, language }))
  }

  useEffect(() => {
    if (prevProblemLoadingRef.current && !problemLoading) {
      navigate(ROUTES.DSA_ROOM_SOLO)
    }
    prevProblemLoadingRef.current = problemLoading
  }, [problemLoading, navigate])

  const solvedCount = problems.filter((p) => solvedProblemIds.includes(p.id)).length
  const start   = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const end     = Math.min(currentPage * limit, total)
  const hasPrev = currentPage > 1
  const hasNext = end < total

  return (
    <div className="dash-page-shell min-h-full font-body">
      <main className="dash-page">

        {/* Page header */}
        <header className="dash-page-header">
          <div>
            <div className="hidden" aria-hidden="true">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/10 border border-cta/20 text-cta flex-shrink-0">
              </span>
              <h1 className="dash-page-title">
                {t('practiceBank.title')}
              </h1>
            </div>
            <h1 className="dash-page-title">{t('practiceBank.title')}</h1>
            <p className="dash-page-description">
              {total > 0
                ? t('practiceBank.summary', { total, solved: solvedCount })
                : t('practiceBank.emptySummary')}
            </p>
          </div>

          {/* Difficulty filter pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {['EASY', 'MEDIUM', 'HARD'].map((d) => (
              <button
                key={d}
                onClick={() => dispatch(setFilters({ difficulty: filters.difficulty === d ? '' : d }))}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer',
                  filters.difficulty === d
                    ? `${DIFF_BG[d]} ${DIFF_COLOR[d]}`
                    : 'dash-control text-gray-500',
                ].join(' ')}
              >
                {t(`practiceBank.difficulty.${d}`)}
              </button>
            ))}
          </div>
        </header>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('practiceBank.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="dash-control w-full rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 dark:text-[var(--dash-text)] placeholder-gray-400 dark:placeholder-[var(--dash-subtle)] focus:outline-none focus:border-cta/50 transition-colors"
            />
          </div>

          <div className="dash-control flex items-center gap-1.5 rounded-xl px-3 py-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 dark:text-[var(--dash-subtle)] flex-shrink-0" />
            <select
              value={filters.difficulty}
              onChange={(e) => dispatch(setFilters({ difficulty: e.target.value }))}
              className="bg-transparent text-sm text-gray-600 dark:text-[var(--dash-text)] focus:outline-none cursor-pointer"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d ? t(`practiceBank.difficulty.${d}`) : t('practiceBank.allDifficulties')}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder={t('practiceBank.tagPlaceholder')}
            value={filters.tag}
            onChange={(e) => dispatch(setFilters({ tag: e.target.value }))}
            className="dash-control rounded-xl px-3 py-2 text-sm text-gray-600 dark:text-[var(--dash-text)] placeholder-gray-400 dark:placeholder-[var(--dash-subtle)] focus:outline-none focus:border-cta/50 w-40 transition-colors"
          />
        </div>

        {/* Table card */}
        <div className="dash-card rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="dash-border grid grid-cols-[48px_1fr_110px_1fr_72px] gap-3 px-5 py-3 border-b bg-[var(--dash-surface-muted)]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">#</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('practiceBank.columns.title')}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('practiceBank.columns.difficulty')}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('practiceBank.columns.tags')}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">{t('practiceBank.columns.status')}</span>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-2.5 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-body">{t('practiceBank.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-24 text-red-500 text-sm font-body">
              {error}
            </div>
          ) : problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Code2 className="w-10 h-10 text-gray-300" />
              <p className="text-gray-400 text-sm font-body">{t('practiceBank.empty')}</p>
            </div>
          ) : (
            <div className="dash-border divide-y">
              {problems.map((p, idx) => {
                const isSolved = solvedProblemIds.includes(p.id)
                const rowNum   = (currentPage - 1) * limit + idx + 1
                return (
                  <div
                    key={p.id}
                    onClick={() => handleRowClick(p)}
                    className={[
                      'grid grid-cols-[48px_1fr_110px_1fr_72px] gap-3 px-5 py-3.5 cursor-pointer transition-colors items-center group',
                      isSolved
                        ? 'bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-900/15 dark:hover:bg-emerald-900/25'
                        : 'hover:bg-gray-50 dark:hover:bg-[var(--dash-surface-raised)]',
                    ].join(' ')}
                  >
                    <span className="text-xs text-gray-400 text-center tabular-nums font-body">
                      {rowNum}
                    </span>

                    <span className={[
                      'text-sm font-medium font-body truncate transition-colors',
                      isSolved ? 'text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300' : 'text-gray-700 group-hover:text-gray-900 dark:text-[var(--dash-text)] dark:group-hover:text-[var(--dash-text)]',
                    ].join(' ')}>
                      {p.title}
                    </span>

                    <div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFF_BG[p.difficulty] ?? ''} ${DIFF_COLOR[p.difficulty] ?? ''}`}>
                        {t(`practiceBank.difficulty.${p.difficulty}`, p.difficulty)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(p.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-body dark:bg-[var(--dash-surface-raised)] dark:text-[var(--dash-subtle)]">
                          {tag}
                        </span>
                      ))}
                      {(p.tags?.length ?? 0) > 3 && (
                        <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                      )}
                    </div>

                    <div className="flex justify-center">
                      {isSolved
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <span className="w-4 h-4 rounded-full border border-[var(--dash-border-strong)]" />
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="dash-border flex items-center justify-between px-5 py-3.5 border-t bg-[var(--dash-surface-muted)]">
              <span className="text-xs text-gray-500 font-body">
                {t('practiceBank.pagination.summary', { start, end, total })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={!hasPrev}
                  onClick={() => dispatch(setPage(currentPage - 1))}
                  className="dash-control flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t('practiceBank.pagination.previous')}
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500 tabular-nums font-body">
                  {currentPage}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => dispatch(setPage(currentPage + 1))}
                  className="dash-control flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                  {t('practiceBank.pagination.next')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
