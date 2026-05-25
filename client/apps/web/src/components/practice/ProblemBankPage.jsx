import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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

const DIFF_COLOR  = { EASY: 'text-emerald-600', MEDIUM: 'text-yellow-600', HARD: 'text-red-600' }
const DIFF_BG     = { EASY: 'bg-emerald-50 border-emerald-200', MEDIUM: 'bg-yellow-50 border-yellow-200', HARD: 'bg-red-50 border-red-200' }
const DIFF_LABEL  = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const DIFFICULTIES = ['', 'EASY', 'MEDIUM', 'HARD']
const DIFF_OPTION_LABEL = { '': 'Tất cả độ khó', EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

export default function ProblemBankPage() {
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
                Luyện tập thuật toán
              </h1>
            </div>
            <h1 className="dash-page-title">Luyện tập thuật toán</h1>
            <p className="dash-page-description">
              {total > 0
                ? `${total} bài tập · ${solvedCount} đã hoàn thành`
                : 'Chọn một bài để bắt đầu luyện tập'}
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
                {DIFF_LABEL[d]}
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
              placeholder="Tìm kiếm theo tên bài..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="dash-control w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-cta/50 transition-colors"
            />
          </div>

          <div className="dash-control flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={filters.difficulty}
              onChange={(e) => dispatch(setFilters({ difficulty: e.target.value }))}
              className="bg-transparent text-sm text-gray-600 focus:outline-none cursor-pointer"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
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
            className="dash-control bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-cta/50 w-40 transition-colors"
          />
        </div>

        {/* Table card */}
        <div className="dash-card rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="dash-border grid grid-cols-[48px_1fr_110px_1fr_72px] gap-3 px-5 py-3 border-b bg-gray-50">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">#</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tiêu đề</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Độ khó</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tags</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Trạng thái</span>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-2.5 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-body">Đang tải danh sách...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-24 text-red-500 text-sm font-body">
              {error}
            </div>
          ) : problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Code2 className="w-10 h-10 text-gray-300" />
              <p className="text-gray-400 text-sm font-body">Không tìm thấy bài tập nào.</p>
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
                        ? 'bg-emerald-50/60 hover:bg-emerald-50'
                        : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="text-xs text-gray-400 text-center tabular-nums font-body">
                      {rowNum}
                    </span>

                    <span className={[
                      'text-sm font-medium font-body truncate transition-colors',
                      isSolved ? 'text-emerald-600 group-hover:text-emerald-700' : 'text-gray-700 group-hover:text-gray-900',
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
                        <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-body">
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
            <div className="dash-border flex items-center justify-between px-5 py-3.5 border-t bg-gray-50">
              <span className="text-xs text-gray-500 font-body">
                {start}–{end} / <span className="text-gray-700 font-medium">{total}</span> bài tập
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={!hasPrev}
                  onClick={() => dispatch(setPage(currentPage - 1))}
                  className="dash-control flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Trước
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500 tabular-nums font-body">
                  {currentPage}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => dispatch(setPage(currentPage + 1))}
                  className="dash-control flex items-center gap-1 px-3 py-1.5 text-xs font-body rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
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
  )
}
