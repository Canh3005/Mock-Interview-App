import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, TrendingUp, Cpu, BookOpen, BarChart3, AlertTriangle, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { adminAnalyticsApi } from '../../api/adminAnalytics.api';
import {
  setPeriod,
  fetchRevenueRequest,
  fetchLlmCostRequest,
  fetchQuestionUsageRequest,
  fetchExamModeRequest,
  fetchAnomaliesRequest,
} from '../../store/slices/adminAnalyticsSlice';

const PERIODS = [
  { label: '7 ngày', val: '7d' },
  { label: '30 ngày', val: '30d' },
  { label: '90 ngày', val: '90d' },
];

const ROUND_LABELS = {
  hr_behavioral: 'Behavioral',
  dsa: 'DSA',
  system_design: 'System Design',
};

const TABS = [
  { key: 'revenue',       label: 'Doanh thu',         icon: TrendingUp  },
  { key: 'llmCost',       label: 'Chi phí LLM',        icon: Cpu         },
  { key: 'questionUsage', label: 'Câu hỏi phổ biến',   icon: BookOpen    },
  { key: 'examMode',      label: 'Hình thức thi',       icon: BarChart3   },
  { key: 'anomalies',     label: 'Anomaly Alerts',      icon: AlertTriangle },
];

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-cta" />
    </div>
  );
}

function EmptyRow({ text = 'Không có dữ liệu' }) {
  return <p className="dash-subtle text-sm py-10 text-center">{text}</p>;
}

function SectionTitle({ icon: Icon, title, color = 'text-cta' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="dash-text text-sm font-bold">{title}</h2>
    </div>
  );
}

// ─── Revenue ──────────────────────────────────────────────────────────────────
// ─── Day Transactions Modal ───────────────────────────────────────────────────
function DayTransactionsModal({ date, onClose }) {
  const [txData, setTxData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await adminAnalyticsApi.getRevenueDayTransactions(date, p, LIMIT);
      setTxData(res);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(1); }, [load]);

  const handlePage = (p) => { setPage(p); load(p); };

  const totalPages = txData ? Math.ceil(txData.total / LIMIT) || 1 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="dash-card w-full max-w-2xl rounded-[20px] shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dash-border)]">
          <div>
            <h2 className="dash-text text-base font-bold">Giao dịch ngày {date}</h2>
            {txData && (
              <p className="dash-subtle text-xs mt-0.5">{txData.total} giao dịch</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="dash-subtle hover:text-[var(--dash-text)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-cta" />
            </div>
          )}

          {!loading && txData?.data?.length === 0 && (
            <p className="dash-subtle text-sm text-center py-12">Không có giao dịch</p>
          )}

          {!loading && txData?.data?.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--dash-surface)]">
                <tr className="border-b border-slate-700/60">
                  {['Người dùng', 'Email', 'Loại', 'Số Credits', 'Thời gian'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txData.data.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cta/10 border border-cta/20">
                          <User className="w-3 h-3 text-cta" />
                        </span>
                        <span className="dash-text text-sm font-medium">{tx.userName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 dash-subtle text-xs">{tx.userEmail}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        tx.type === 'CREDIT'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 dash-text font-semibold">
                      +{Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 dash-subtle text-xs">
                      {new Date(tx.createdAt).toLocaleTimeString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--dash-border)] dash-subtle text-sm">
            <span>Trang {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
                className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => handlePage(page + 1)}
                className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Revenue Section ──────────────────────────────────────────────────────────
function RevenueSection() {
  const { revenue, loading } = useSelector((s) => ({
    revenue: s.adminAnalytics.revenue,
    loading: s.adminAnalytics.loading.revenue,
  }));
  const [selectedDate, setSelectedDate] = useState(null);

  if (loading) return <LoadingRow />;
  if (!revenue) return <EmptyRow />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="dash-muted-panel rounded-xl border p-4">
          <p className="dash-text text-2xl font-bold">
            {Number(revenue.totals?.creditTotal ?? 0).toLocaleString()}
          </p>
          <p className="dash-subtle text-sm mt-0.5">Credits mua (CREDIT)</p>
        </div>
        <div className="dash-muted-panel rounded-xl border p-4">
          <p className="dash-text text-2xl font-bold">
            {Number(revenue.totals?.bonusTotal ?? 0).toLocaleString()}
          </p>
          <p className="dash-subtle text-sm mt-0.5">Credits bonus phát</p>
        </div>
      </div>

      {revenue.daily?.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Ngày', 'Credit mua', 'Bonus', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revenue.daily.slice(0, 10).map((r) => (
                <tr
                  key={r.date}
                  className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-2.5 dash-text font-medium">
                    {new Date(r.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-2.5 text-emerald-400 font-medium">{Number(r.creditTotal).toLocaleString()}</td>
                  <td className="px-4 py-2.5 dash-subtle">{Number(r.bonusTotal).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(r.date)}
                      className="text-xs text-cta hover:underline cursor-pointer font-medium"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDate && (
        <DayTransactionsModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ─── LLM Cost ─────────────────────────────────────────────────────────────────
function LlmCostSection() {
  const { llmCost, loading } = useSelector((s) => ({
    llmCost: s.adminAnalytics.llmCost,
    loading: s.adminAnalytics.loading.llmCost,
  }));

  if (loading) return <LoadingRow />;
  if (!llmCost?.byModel?.length) return <EmptyRow />;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60">
            {['Model', 'Số lần gọi', 'Input tokens', 'Output tokens', 'Chi phí (USD)'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {llmCost.byModel.map((r) => (
            <tr key={r.model} className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-2.5 dash-text font-mono text-xs">{r.model}</td>
              <td className="px-4 py-2.5 dash-text">{Number(r.callCount).toLocaleString()}</td>
              <td className="px-4 py-2.5 dash-subtle">{Number(r.totalInputTokens || 0).toLocaleString()}</td>
              <td className="px-4 py-2.5 dash-subtle">{Number(r.totalOutputTokens || 0).toLocaleString()}</td>
              <td className="px-4 py-2.5 text-amber-400 font-medium">${Number(r.totalCostUsd || 0).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Question Usage ───────────────────────────────────────────────────────────
function QuestionUsageSection() {
  const { questionUsage, loading } = useSelector((s) => ({
    questionUsage: s.adminAnalytics.questionUsage,
    loading: s.adminAnalytics.loading.questionUsage,
  }));

  if (loading) return <LoadingRow />;
  if (!questionUsage?.data?.length) return <EmptyRow />;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60">
            {['#', 'Câu hỏi', 'Lượt xem', 'Status'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questionUsage.data.map((probe, i) => (
            <tr key={probe.id} className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-2.5 dash-subtle text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 dash-text max-w-xs truncate">
                {probe.primaryQuestion ?? probe.code ?? probe.id}
              </td>
              <td className="px-4 py-2.5 text-cta font-semibold">{probe.viewCount}</td>
              <td className="px-4 py-2.5">
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  {probe.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Exam Mode ────────────────────────────────────────────────────────────────
function ExamModeSection() {
  const { examMode, loading } = useSelector((s) => ({
    examMode: s.adminAnalytics.examMode,
    loading: s.adminAnalytics.loading.examMode,
  }));

  if (loading) return <LoadingRow />;
  if (!examMode) return <EmptyRow />;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="dash-subtle text-xs font-semibold mb-2 uppercase tracking-wide">Theo mode</p>
        <div className="space-y-2">
          {(examMode.byMode ?? []).map((r) => (
            <div
              key={r.mode}
              className="flex items-center justify-between px-3 py-2.5 dash-muted-panel rounded-xl border"
            >
              <span className="dash-text text-sm capitalize">{r.mode}</span>
              <span className="dash-text text-sm font-bold">{Number(r.count).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="dash-subtle text-xs font-semibold mb-2 uppercase tracking-wide">Theo loại round</p>
        <div className="space-y-2">
          {(examMode.byRound ?? []).map((r) => (
            <div
              key={r.round}
              className="flex items-center justify-between px-3 py-2.5 dash-muted-panel rounded-xl border"
            >
              <span className="dash-text text-sm">{ROUND_LABELS[r.round] ?? r.round}</span>
              <span className="dash-text text-sm font-bold">{Number(r.count).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Anomalies ────────────────────────────────────────────────────────────────
function AnomaliesSection() {
  const { anomalies, loading } = useSelector((s) => ({
    anomalies: s.adminAnalytics.anomalies,
    loading: s.adminAnalytics.loading.anomalies,
  }));

  if (loading) return <LoadingRow />;
  if (!anomalies?.data?.length) return <EmptyRow text="Không có anomaly nào" />;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60">
            {['User ID', 'Session ID', 'Feature', 'Calls', 'Threshold', 'Thời gian'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {anomalies.data.map((a) => (
            <tr key={a.id} className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-2.5 dash-subtle font-mono text-xs">{a.userId.slice(0, 8)}…</td>
              <td className="px-4 py-2.5 dash-subtle font-mono text-xs">
                {a.sessionId ? `${a.sessionId.slice(0, 8)}…` : '—'}
              </td>
              <td className="px-4 py-2.5 dash-text">{a.feature}</td>
              <td className="px-4 py-2.5 text-amber-400 font-semibold">{a.callCount}</td>
              <td className="px-4 py-2.5 dash-subtle">{a.threshold}</td>
              <td className="px-4 py-2.5 dash-subtle text-xs">
                {new Date(a.createdAt).toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const HAS_PERIOD = new Set(['revenue', 'llmCost', 'examMode']);

export default function AdminAnalyticsPage() {
  const dispatch = useDispatch();
  const period = useSelector((s) => s.adminAnalytics.period);
  const [activeTab, setActiveTab] = useState('revenue');

  useEffect(() => {
    dispatch(fetchRevenueRequest());
    dispatch(fetchLlmCostRequest());
    dispatch(fetchQuestionUsageRequest());
    dispatch(fetchExamModeRequest());
    dispatch(fetchAnomaliesRequest());
  }, [dispatch]);

  const handlePeriodChange = (p) => {
    dispatch(setPeriod(p));
    dispatch(fetchRevenueRequest());
    dispatch(fetchLlmCostRequest());
    dispatch(fetchExamModeRequest());
  };

  return (
    <main className="dash-page font-body animate-in fade-in duration-500">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cta" />
            Phân tích &amp; Lợi nhuận
          </h1>
          <p className="dash-page-description">Thống kê doanh thu, chi phí LLM, câu hỏi phổ biến và anomaly alerts</p>
        </div>

        {HAS_PERIOD.has(activeTab) && (
          <div className="flex items-center gap-2">
            {PERIODS.map(({ label, val }) => (
              <button
                key={val}
                type="button"
                onClick={() => handlePeriodChange(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  period === val
                    ? 'bg-cta/15 text-cta border border-cta/30'
                    : 'dash-subtle border border-[var(--dash-border)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="dash-border flex gap-2 border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === key
                ? 'border-cta text-[var(--dash-text)]'
                : 'border-transparent dash-subtle hover:text-[var(--dash-text)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'revenue' && (
          <>
            <SectionTitle icon={TrendingUp} title="Thống kê doanh thu Credit" />
            <RevenueSection />
          </>
        )}
        {activeTab === 'llmCost' && (
          <>
            <SectionTitle icon={Cpu} title="Chi phí gọi LLM theo model" color="text-amber-400" />
            <LlmCostSection />
          </>
        )}
        {activeTab === 'questionUsage' && (
          <>
            <SectionTitle icon={BookOpen} title="Câu hỏi được xem nhiều nhất" color="text-emerald-400" />
            <QuestionUsageSection />
          </>
        )}
        {activeTab === 'examMode' && (
          <>
            <SectionTitle icon={BarChart3} title="Hình thức bài thi phổ biến" color="text-purple-400" />
            <ExamModeSection />
          </>
        )}
        {activeTab === 'anomalies' && (
          <>
            <SectionTitle icon={AlertTriangle} title="LLM Anomaly Alerts" color="text-red-400" />
            <AnomaliesSection />
          </>
        )}
      </div>
    </main>
  );
}
