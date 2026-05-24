import React from 'react'
import { FileArchive, UploadCloud } from 'lucide-react'

export default function AdminTestCasesPage() {
  return (
    <main className="dash-page">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Upload Test Cases Hàng Loạt</h1>
          <p className="dash-page-description">
            Tải lên file test case dạng ZIP cho các bài tập đã duyệt.
          </p>
        </div>
      </header>

      <section className="dash-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <div className="dash-icon-tile mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <UploadCloud className="h-10 w-10" />
        </div>

        <h2 className="dash-text mb-2 text-lg font-heading font-semibold">Kéo thả file ZIP Test Cases</h2>
        <p className="dash-muted mb-8 max-w-sm text-sm font-body">
          Tải lên file ZIP chứa các file `.in` và `.out` được đánh số, ví dụ `1.in`, `1.out`.
          Kích thước tối đa 50MB.
        </p>

        <div className="w-full max-w-md">
          <label className="dash-muted-panel group block w-full cursor-pointer rounded-xl border-2 border-dashed border-[var(--dash-track)] p-8 transition-colors hover:border-[var(--dash-accent)]">
            <input type="file" className="hidden" accept=".zip" />
            <div className="flex flex-col items-center gap-3">
              <FileArchive className="dash-subtle h-8 w-8 transition-colors group-hover:text-[var(--dash-accent-text)]" />
              <div className="dash-accent font-medium font-body">Chọn File</div>
            </div>
          </label>
        </div>

        <div className="dash-subtle mt-8 flex items-center gap-4 text-xs font-body">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--dash-accent)]" />
            Định dạng: .zip
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Quy tắc đặt tên: 1.in, 1.out
          </span>
        </div>
      </section>
    </main>
  )
}
