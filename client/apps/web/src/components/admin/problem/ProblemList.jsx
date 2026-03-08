import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Edit2, Trash2, ShieldCheck, CheckCircle2, Clock, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchProblemsStart,
  fetchProblemByIdStart,
  deleteProblemStart,
  clearCurrentProblem,
  clearVerifyResult,
  importProblemsStart
} from '../../../store/slices/adminProblemsSlice';

export default function ProblemList({ onCreateNew, onEdit }) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  
  const { problems, total, page, limit, loading, importLoading } = useSelector(state => state.adminProblems);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchProblemsStart({ page, limit, search: searchTerm, difficulty: difficultyFilter }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [dispatch, searchTerm, difficultyFilter, page, limit]);

  const handleEditClick = (id) => {
    dispatch(fetchProblemByIdStart(id));
    dispatch(clearVerifyResult());
    onEdit();
  };

  const handleCreateClick = () => {
    dispatch(clearCurrentProblem());
    dispatch(clearVerifyResult());
    onCreateNew();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          alert('Cấu trúc file JSON không hợp lệ! Vui lòng đẩy lên một mảng bài tập Array [{}].');
          return;
        }
        dispatch(importProblemsStart(json));
      } catch (err) {
        alert('Không thể phân tích file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 font-body">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white">Ngân Hàng Bài Tập</h2>
          <p className="text-slate-400 mt-1">Quản lý kho bài tập thuật toán của hệ thống.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all border border-slate-700/60 cursor-pointer disabled:opacity-50"
          >
            {importLoading ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {importLoading ? 'Đang Import...' : 'Import JSON'}
          </button>
          <button 
            onClick={handleCreateClick}
            className="bg-cta hover:bg-cta/90 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-cta/20 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Bài Tập Mới
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col shadow-sm">
        {/* Top Filters */}
        <div className="p-4 border-b border-slate-700/60 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm bài tập..." className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cta" />
          </div>
          <div className="flex gap-4 sm:w-auto w-full">
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white">
              <option value="">Tất cả độ khó</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto relative min-h-[300px]">
          {loading && problems.length === 0 && (
            <div className="absolute inset-0 z-10 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center">
              <Clock className="animate-spin w-8 h-8 text-cta"/>
            </div>
          )}
          <table className={`w-full text-left text-sm whitespace-nowrap min-w-[700px] transition-opacity duration-300 ${loading && problems.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
            <thead className="bg-slate-900/30 border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400 w-24">Phân trang ID</th>
                <th className="px-6 py-4 font-semibold text-slate-400 w-1/3">Tiêu đề (Topic)</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Độ khó</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {problems.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">#{p.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white block">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{p.tags?.join(', ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      p.difficulty === 'EASY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      p.difficulty === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {p.status === 'PUBLISHED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {p.status === 'VERIFIED' && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                      {p.status === 'DRAFT' && <Clock className="w-4 h-4 text-slate-400" />}
                      <span className="text-slate-300 text-xs font-medium">{p.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(p.id)} className="p-2 text-slate-400 hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer" title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        if(confirm('Bạn có chắc muốn xóa?')) { dispatch(deleteProblemStart(p.id)) }
                      }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/15 rounded-lg transition-colors cursor-pointer" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && !loading && (
                 <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500 italic">Chưa có bài tập nào. Hãy tạo mới!</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-400">
           <span>Showing page {page} out of {Math.ceil(total / limit) || 1} (Total: {total})</span>
           <div className="flex gap-2 items-center mt-3 sm:mt-0">
             <button disabled={page <= 1} onClick={() => dispatch(fetchProblemsStart({ page: page - 1, limit, search: searchTerm, difficulty: difficultyFilter }))} className="p-1 rounded bg-slate-800 disabled:opacity-50"><ChevronLeft className="w-5 h-5"/></button>
             <button disabled={page * limit >= total} onClick={() => dispatch(fetchProblemsStart({ page: page + 1, limit, search: searchTerm, difficulty: difficultyFilter }))} className="p-1 rounded bg-slate-800 disabled:opacity-50"><ChevronRight className="w-5 h-5"/></button>
           </div>
        </div>
      </div>
    </div>
  );
}
