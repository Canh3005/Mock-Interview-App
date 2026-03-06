import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

// Placeholder mock data
const mockProblems = [
  { id: '1', title: 'Two Sum', difficulty: 'EASY', status: 'PUBLISHED', tags: ['Array', 'Hash Table'] },
  { id: '2', title: 'Add Two Numbers', difficulty: 'MEDIUM', status: 'VERIFIED', tags: ['Linked List', 'Math'] },
  { id: '3', title: 'LRU Cache', difficulty: 'MEDIUM', status: 'DRAFT', tags: ['Design', 'Hash Table', 'Linked List'] },
];

export default function AdminProblemsPage() {
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'content' | 'testcases'

  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 font-body">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-heading text-white">Tạo Bài Tập Mới</h2>
            <p className="text-slate-400">Thiết kế một thử thách thuật toán hoàn hảo.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="px-4 py-2 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/60 font-body cursor-pointer">
              Hủy
            </button>
            <button className="px-4 py-2 rounded-lg font-medium text-white bg-cta hover:bg-cta/90 transition-colors flex items-center gap-2 shadow-md shadow-cta/20 font-body cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta">
              <ShieldCheck className="w-4 h-4" />
              Duyệt hệ thống
            </button>
          </div>
        </div>

        {/* Studio Tabs */}
        <div className="flex border-b border-slate-700/60 overflow-x-auto">
          {['general', 'content', 'testcases'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm capitalize border-b-2 transition-colors cursor-pointer focus-visible:outline-none whitespace-nowrap ${
                activeTab === tab ? 'border-cta text-cta' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'general' ? 'Tổng quan' : tab === 'content' ? 'Mô tả & Code' : 'Test cases'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 min-h-[500px]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Tiêu đề bài tập</label>
                <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all font-body" placeholder="VD: Two Sum" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Độ khó</label>
                  <select className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all font-body cursor-pointer">
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Hệ số giới hạn thời gian (Time Limit)</label>
                  <input type="number" defaultValue={1.0} step={0.1} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all font-body" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Thẻ chủ đề (Topic Tags)</label>
                <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all font-body" placeholder="Các thẻ cách nhau bởi dấu phẩy, VD: Array, Hash Table" />
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[450px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Mô tả (Markdown)</label>
                <textarea className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 resize-none transition-all min-h-[250px]" placeholder="Viết mô tả bài tập tại đây..."></textarea>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Starter Code (Java, Python, JS)</label>
                <div className="flex-1 bg-[#0D1628] rounded-lg border border-slate-700 p-4 flex items-center justify-center text-slate-500 font-mono text-sm leading-relaxed overflow-hidden min-h-[250px]">
                  [Monaco Editor Placeholder]
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">Danh sách Test Cases</h3>
                <button className="text-sm bg-cta/15 text-cta border border-cta/30 px-3 py-1.5 rounded-lg font-medium hover:bg-cta/25 flex items-center gap-1.5 transition-colors focus-visible:outline-none cursor-pointer">
                  <Plus className="w-4 h-4" /> Thêm hàng
                </button>
              </div>
              <div className="border border-slate-700/60 rounded-lg overflow-x-auto bg-slate-800/50">
                <table className="w-full text-left text-sm min-w-max">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-400">Input</th>
                      <th className="px-4 py-3 font-medium text-slate-400">Expected Output</th>
                      <th className="px-4 py-3 font-medium text-slate-400 w-24 text-center">Hidden</th>
                      <th className="px-4 py-3 font-medium text-slate-400 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    <tr className="bg-transparent hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-pre">nums = [2,7,11,15]\ntarget = 9</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">[0,1]</td>
                      <td className="px-4 py-3 text-center"><input type="checkbox" className="w-4 h-4 accent-cta rounded border-slate-600 bg-slate-900/50" /></td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    <tr className="bg-transparent hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-pre">nums = [3,2,4]\ntarget = 6</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">[1,2]</td>
                      <td className="px-4 py-3 text-center"><input type="checkbox" defaultChecked className="w-4 h-4 accent-cta rounded border-slate-600 bg-slate-900/50" /></td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-400/10 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 font-body">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white">Ngân Hàng Bài Tập</h2>
          <p className="text-slate-400 mt-1">Quản lý kho bài tập thuật toán của hệ thống.</p>
        </div>
        <button 
          onClick={() => setView('editor')}
          className="bg-cta hover:bg-cta/90 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-cta/20 cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        >
          <Plus className="w-5 h-5" />
          Bài Tập Mới
        </button>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col shadow-sm">
        <div className="p-4 border-b border-slate-700/60 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài tập..." 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-4 sm:w-auto w-full">
            <select className="flex-1 sm:w-auto bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all cursor-pointer">
              <option>Tất cả độ khó</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <select className="flex-1 sm:w-auto bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta/50 transition-all cursor-pointer">
              <option>Tất cả trạng thái</option>
              <option>Published</option>
              <option>Verified</option>
              <option>Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
            <thead className="bg-slate-900/30 border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Tiêu đề</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Độ khó</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {mockProblems.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-500">#{p.id}</td>
                  <td className="px-6 py-4 font-medium text-white">{p.title}</td>
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
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors focus-visible:outline-none cursor-pointer" title="Xem trước">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setView('editor')}
                        className="p-2 text-slate-400 hover:text-cta hover:bg-cta/15 rounded-lg transition-colors focus-visible:outline-none cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/15 rounded-lg transition-colors focus-visible:outline-none cursor-pointer" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
