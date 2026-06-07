import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Search, User, AlertTriangle, CheckCircle, XCircle,
  Loader2, ChevronLeft, ChevronRight, X, Users,
} from 'lucide-react';
import {
  fetchUsersRequest,
  fetchUserDetailRequest,
  setUserActiveRequest,
  setFilters,
  setPage,
} from '../../store/slices/adminUsersSlice';

const STATUS_CLASS = {
  true: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  false: 'bg-red-500/10 border-red-500/20 text-red-300',
};

function UserDetailModal({ user, loading, onClose, onSetActive, actionLoading }) {
  if (!user && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="dash-card w-full max-w-lg rounded-[20px] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="dash-text text-base font-bold">Chi tiết người dùng</h2>
          <button
            onClick={onClose}
            className="dash-subtle hover:text-[var(--dash-text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cta" />
          </div>
        )}

        {user && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cta/10 border border-cta/20">
                  <User className="w-5 h-5 text-cta" />
                </span>
              )}
              <div>
                <p className="dash-text font-semibold">{user.name}</p>
                <p className="dash-subtle text-sm">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Role', value: user.role },
                { label: 'Credits', value: user.walletBalance ?? 0 },
                { label: 'Sessions', value: user.sessionCount ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="dash-muted-panel rounded-xl border p-3 text-center">
                  <p className="dash-text text-xl font-bold">{value}</p>
                  <p className="dash-subtle text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {user.anomalies?.length > 0 && (
              <div>
                <p className="dash-subtle text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Anomaly alerts gần đây
                </p>
                <div className="space-y-1.5">
                  {user.anomalies.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-300"
                    >
                      [{a.feature}] {a.callCount} calls / ngưỡng {a.threshold} — {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {user.isActive ? (
                <button
                  onClick={() => onSetActive(user.id, false)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Tạm khóa tài khoản
                </button>
              ) : (
                <button
                  onClick={() => onSetActive(user.id, true)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Kích hoạt tài khoản
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  const { users, total, page, limit, filters, loading, selectedUser, detailLoading, actionLoading } =
    useSelector((s) => s.adminUsers);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [showDetail, setShowDetail] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    dispatch(fetchUsersRequest());
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(setFilters({ search: searchInput }));
    dispatch(fetchUsersRequest());
  };

  const handleFilterActive = (val) => {
    dispatch(setFilters({ isActive: val }));
    dispatch(fetchUsersRequest());
  };

  const handleViewDetail = (id) => {
    setShowDetail(true);
    dispatch(fetchUserDetailRequest(id));
  };

  const handleSetActive = (id, isActive) => {
    dispatch(setUserActiveRequest({ id, isActive }));
  };

  return (
    <main className="dash-page font-body animate-in fade-in duration-500">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-cta" />
            Quản lý người dùng
          </h1>
          <p className="dash-page-description">Xem danh sách, chi tiết và quản lý trạng thái tài khoản</p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <label className="dash-input flex h-10 flex-1 items-center gap-3 rounded-[14px] px-4 transition-colors focus-within:bg-[var(--dash-surface-raised)]">
            <Search className="w-4 h-4 dash-muted shrink-0" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="dash-text w-full border-0 bg-transparent p-0 text-sm placeholder:text-[var(--dash-subtle)] focus:ring-0"
            />
          </label>
          <button
            type="submit"
            className="dash-primary-button px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Tìm
          </button>
        </form>

        <div className="flex items-center gap-2">
          {[
            { label: 'Tất cả', val: '' },
            { label: 'Đang hoạt động', val: 'true' },
            { label: 'Bị khóa', val: 'false' },
          ].map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => handleFilterActive(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filters.isActive === val
                  ? 'bg-cta/15 text-cta border border-cta/30'
                  : 'dash-subtle border border-[var(--dash-border)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-x-auto relative min-h-[360px] flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-cta" />
          </div>
        )}

        {!loading && users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="dash-subtle text-sm">Không có người dùng nào</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['Người dùng', 'Email', 'Role', 'Trạng thái', 'Ngày tạo', ''].map((h) => (
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cta/10 border border-cta/20">
                          <User className="w-3.5 h-3.5 text-cta" />
                        </span>
                      )}
                      <span className="dash-text text-sm font-semibold">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 dash-subtle text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        user.role === 'admin'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          : 'bg-slate-700/50 border-slate-600/60 text-slate-400'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLASS[String(user.isActive)]}`}>
                      {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 dash-subtle text-sm">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(user.id)}
                      className="p-1.5 dash-subtle hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="mt-auto p-4 border-t border-slate-700/60 flex items-center justify-between text-sm dash-subtle">
          <span>{total} người dùng · Trang {page}/{totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => { dispatch(setPage(page - 1)); dispatch(fetchUsersRequest()); }}
              className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => { dispatch(setPage(page + 1)); dispatch(fetchUsersRequest()); }}
              className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showDetail && (
        <UserDetailModal
          user={selectedUser}
          loading={detailLoading}
          onClose={() => setShowDetail(false)}
          onSetActive={handleSetActive}
          actionLoading={actionLoading}
        />
      )}
    </main>
  );
}
