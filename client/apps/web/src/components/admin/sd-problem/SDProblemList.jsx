import { Plus, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const LEVEL_COLORS = {
  mid: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  senior: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  staff: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
};

function PaginationBar({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit) || 1;
  return (
    <div className="p-4 border-t border-slate-700/60 flex items-center justify-between text-sm text-slate-400">
      <span>Trang {page} / {totalPages} ({total} problems)</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
          className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function SDProblemList({ problems, loading, page, total, limit, onPageChange, onCreateNew, onEdit, onDelete }) {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 font-body">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white">SD Problem Bank</h2>
          <p className="text-slate-400 mt-1">Quản lý ngân hàng bài tập System Design.</p>
        </div>
        <button onClick={onCreateNew}
          className="bg-cta hover:bg-cta/90 text-black px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cta/20 cursor-pointer">
          <Plus className="w-5 h-5" />
          Tạo mới
        </button>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-x-auto relative min-h-[300px] flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-cta" />
          </div>
        )}
        <table className="w-full text-left text-sm min-w-[600px] flex-1">
          <thead className="bg-slate-900/30 border-b border-slate-700/60">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-400">Tiêu đề</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Domain</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Level</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Difficulty</th>
              <th className="px-6 py-4 font-semibold text-slate-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {problems.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/80 transition-colors group">
                <td className="px-6 py-4 font-medium text-white">{p.title}</td>
                <td className="px-6 py-4 text-slate-400 text-xs font-mono">{p.domain}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${LEVEL_COLORS[p.targetLevel] ?? ''}`}>
                    {p.targetLevel}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 capitalize">{p.difficulty}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(p.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/15 rounded-lg transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {problems.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center py-8 text-slate-500 italic">Chưa có problem nào. Hãy tạo mới!</td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationBar page={page} total={total} limit={limit} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
