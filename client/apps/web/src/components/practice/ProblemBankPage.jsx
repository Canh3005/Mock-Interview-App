import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2,
  BookOpen, Loader2, Code2, SlidersHorizontal,
} from 'lucide-react'
import {
  loadProblems,
  setFilters,
  setPage,
  startPracticeDSASession,
} from '../../store/slices/practiceDSASlice'
import SharedNavbar from '../shared/SharedNavbar'

const DIFF_COLOR  = { EASY: 'text-emerald-400', MEDIUM: 'text-yellow-400', HARD: 'text-red-400' }
const DIFF_BG     = { EASY: 'bg-emerald-500/10 border-emerald-500/20', MEDIUM: 'bg-yellow-500/10 border-yellow-500/20', HARD: 'bg-red-500/10 border-red-500/20' }
const DIFF_LABEL  = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const DIFFICULTIES = ['', 'EASY', 'MEDIUM', 'HARD']
const DIFF_OPTION_LABEL = { '': 'Tất cả độ khó', EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

export default function ProblemBankPage({ navigate }) {
  const dispatch = useDispatch()
  const { problems, total, currentPage, limit, filters, loading, error, solvedProblemIds, problemLoading } =
    useSelector((state) => state.practiceDSA)

  const [darkMode, setDarkMode] = useState(true)
  const [searchInput, setSearchInput] = useState(filters.search)
  const prevProblemLoadingRef = useRef(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    dispatch(loadProblems())
  }, [dispatch])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) dispatch(setFilters({ search: searchInput }))
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, dispatch, filters.search])

  const handleRowClick = (problem) => {
    const enabledTemplate = problem.templates?.find((t) => t.isEnabled) ?? problem.templates?.[0]
    const language = enabledTemplate?.languageId ?? 'python'
    dispatch(startPracticeDSASession({ problemId: problem.id, language }))
  }

  useEffect(() => {
    if (prevProblemLoadingRef.current && !problemLoading) {
      navigate('dsa-room-solo')
    }
    prevProblemLoadingRef.current = problemLoading
  }, [problemLoading, navigate])

  const solvedCount = problems.filter((p) => solvedProblemIds.includes(p.id)).length
  const start   = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const end     = Math.min(currentPage * limit, total)
  const hasPrev = currentPage > 1
  const hasNext = end < total

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300">

        <SharedNavbar
          page="dashboard"
          navigate={navigate}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
        />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/15 border border-cta/30 text-cta flex-shrink-0">
                  <BookOpen size={16} />
                </span>
                <h1 className="font-heading text-2xl font-bold text-white leading-tight">
                  Luyện tập thuật toán
                </h1>
              </div>
              <p className="font-body text-sm text-slate-400 mt-1 ml-0.5">
                {total > 0
                  ? `${total} bài tập · ${solvedCount} đã hoàn thành`
                  : 'Chọn một bài để bắt đầu luyện tập'}
              </p>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                <button
                  key={d}
                  onClick={() => dispatch(setFilters({ difficulty: filters.difficulty === d ? '' : d }))}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer',
                    filters.difficulty === d
                      ? `${DIFF_BG[d]} ${DIFF_COLOR[d]}`
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600',
                  ].join(' ')}
                >
                  {DIFF_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên bài..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cta/50 focus:bg-slate-800 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={filters.difficulty}
                onChange={(e) => dispatch(setFilters({ difficulty: e.target.value }))}
                className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d} className="bg-slate-800">
                    {DIFF_OPTION_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Lọc theo tag..."
              value={filters.tag}
              onChange={(e) => dispatch(setFilters({ tag: e.target.value }))}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cta/50 focus:bg-slate-800 w-40 transition-colors"
            />
          </div>

          {/* Table card */}
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_110px_1fr_72px] gap-3 px-5 py-3 border-b border-slate-700/60 bg-slate-800/60">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">#</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tiêu đề</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Độ khó</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tags</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">Trạng thái</span>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex items-center justify-center py-24 gap-2.5 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-body">Đang tải danh sách...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-24 text-red-400 text-sm font-body">
                {error}
              </div>
            ) : problems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Code2 className="w-10 h-10 text-slate-700" />
                <p className="text-slate-500 text-sm font-body">Không tìm thấy bài tập nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/40">
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
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'hover:bg-slate-700/30',
                      ].join(' ')}
                    >
                      <span className="text-xs text-slate-500 text-center tabular-nums font-body">
                        {rowNum}
                      </span>

                      <span className={[
                        'text-sm font-medium font-body truncate transition-colors',
                        isSolved ? 'text-emerald-300/90 group-hover:text-emerald-300' : 'text-slate-200 group-hover:text-white',
                      ].join(' ')}>
                        {p.title}
                      </span>

                      <div>
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFF_BG[p.difficulty] ?? ''} ${DIFF_COLOR[p.difficulty] ?? ''}`}>
                          {DIFF_LABEL[p.difficulty] ?? p.difficulty}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(p.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full font-body">
                            {tag}
                          </span>
                        ))}
                        {(p.tags?.length ?? 0) > 3 && (
                          <span className="text-xs text-slate-600">+{p.tags.length - 3}</span>
                        )}
                      </div>

                      <div className="flex justify-center">
                        {isSolved
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <span className="w-4 h-4 rounded-full border border-slate-600/60" />
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-700/60 bg-slate-800/40">
                <span className="text-xs text-slate-500 font-body">
                  {start}–{end} / <span className="text-slate-400 font-medium">{total}</span> bài tập
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={!hasPrev}
                    onClick={() => dispatch(setPage(currentPage - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-300"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Trước
                  </button>
                  <span className="px-3 py-1.5 text-xs text-slate-400 tabular-nums font-body">
                    {currentPage}
                  </span>
                  <button
                    disabled={!hasNext}
                    onClick={() => dispatch(setPage(currentPage + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-300"
                  >
                    Tiếp
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
