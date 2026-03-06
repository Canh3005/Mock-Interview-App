import React from 'react';
import { UploadCloud, FileArchive } from 'lucide-react';

export default function AdminTestCasesPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 text-text-base">
      <div>
        <h2 className="text-2xl font-heading font-bold text-white">Upload Test Cases Hàng Loạt</h2>
        <p className="text-slate-400 font-body">Tải lên các file test case dưới dạng zip cho các bài tập đã duyệt.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-cta/15 border border-cta/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <UploadCloud className="w-10 h-10 text-cta" />
        </div>
        
        <h3 className="text-lg font-heading font-semibold text-white mb-2">Kéo thả file ZIP Test Cases</h3>
        <p className="text-slate-400 text-sm max-w-sm mb-8 font-body">
          Tải lên file ZIP chứa các file `.in` và `.out` được đánh số (vd: `1.in`, `1.out`). Kích thước tối đa 50MB.
        </p>

        <div className="w-full max-w-md">
          <label className="block w-full cursor-pointer bg-slate-900/50 border-2 border-dashed border-slate-600 hover:border-cta/60 transition-colors rounded-xl p-8 group">
            <input type="file" className="hidden" accept=".zip" />
            <div className="flex flex-col items-center gap-3">
              <FileArchive className="w-8 h-8 text-slate-500 group-hover:text-cta transition-colors" />
              <div className="font-medium text-cta font-body">Chọn File</div>
            </div>
          </label>
        </div>

        <div className="mt-8 flex items-center gap-4 text-xs text-slate-400 font-body">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cta"></div> Định dạng: .zip</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Quy tắc đặt tên: 1.in, 1.out</span>
        </div>
      </div>
    </div>
  );
}
