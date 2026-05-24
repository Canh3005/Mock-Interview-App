import { ChevronLeft, ChevronRight, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';

const LEVEL_COLORS = {
  mid: 'bg-sky-500/10 border-sky-500/20 text-sky-500',
  senior: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  staff: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
};

function PaginationBar({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="dash-border p-4 border-t flex items-center justify-between text-sm dash-subtle">
      <span>Trang {page} / {totalPages} ({total} problems)</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="dash-icon-button disabled:opacity-40"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="dash-icon-button disabled:opacity-40"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function SDProblemList({ problems, loading, page, total, limit, onPageChange, onCreateNew, onEdit, onDelete }) {
  return (
    <main className="dash-page animate-in fade-in duration-500 font-body">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">SD Problem Bank</h1>
          <p className="dash-page-description">Quản lý ngân hàng bài tập System Design.</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="dash-primary-button px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Tạo mới
        </button>
      </header>

      <div className="dash-card rounded-xl overflow-x-auto relative min-h-[300px] flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 dash-muted-panel backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-cta" />
          </div>
        )}
        <table className="w-full text-left text-sm min-w-[600px] flex-1">
          <thead className="dash-muted-panel dash-border border-b">
            <tr>
              <th className="px-6 py-4 font-semibold dash-subtle">Tiêu đề</th>
              <th className="px-6 py-4 font-semibold dash-subtle">Domain</th>
              <th className="px-6 py-4 font-semibold dash-subtle">Level</th>
              <th className="px-6 py-4 font-semibold dash-subtle">Difficulty</th>
              <th className="px-6 py-4 font-semibold dash-subtle text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="dash-border divide-y">
            {problems.map((p) => (
              <tr key={p.id} className="hover:bg-[var(--dash-surface-muted)] transition-colors group">
                <td className="px-6 py-4 font-medium dash-text">{p.title}</td>
                <td className="px-6 py-4 dash-subtle text-xs font-mono">{p.domain}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${LEVEL_COLORS[p.targetLevel] ?? ''}`}>
                    {p.targetLevel}
                  </span>
                </td>
                <td className="px-6 py-4 dash-subtle capitalize">{p.difficulty}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="p-2 dash-subtle hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p.id)}
                      className="p-2 dash-subtle hover:text-red-500 hover:bg-red-500/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {problems.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center py-8 dash-subtle italic">Chưa có problem nào. Hãy tạo mới.</td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationBar page={page} total={total} limit={limit} onPageChange={onPageChange} />
      </div>
    </main>
  );
}
