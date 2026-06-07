import React, { useRef, useState, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { markReadRequest, markAllReadRequest } from '../../store/slices/notificationsSlice';

const TYPE_ICON = {
  llm_anomaly: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
};

const STYLES = {
  slate: {
    trigger: 'relative flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta',
    panel: 'absolute right-0 top-11 w-80 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl z-50 overflow-hidden',
    header: 'flex items-center justify-between px-4 py-3 border-b border-slate-700/40',
    title: 'text-sm font-medium text-white',
    markAllBtn: 'flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors',
    empty: 'text-sm text-slate-500 text-center py-8',
    item: (unread) => `flex gap-3 px-4 py-3 border-b border-slate-700/40 transition-colors ${unread ? 'bg-slate-800/60 hover:bg-slate-800' : 'hover:bg-slate-800/30'}`,
    itemText: (unread) => `text-sm leading-snug ${unread ? 'text-white' : 'text-slate-400'}`,
    itemTime: 'text-xs text-slate-500 mt-0.5',
    markReadBtn: 'p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0',
    fallbackIcon: 'w-4 h-4 text-slate-400 flex-shrink-0',
  },
  dash: {
    trigger: 'dash-icon-button relative',
    panel: 'dash-card absolute right-0 top-12 w-80 rounded-[20px] shadow-shell z-50 overflow-hidden',
    header: 'flex items-center justify-between px-4 py-3 border-b dash-border',
    title: 'text-sm font-medium dash-text',
    markAllBtn: 'flex items-center gap-1 text-xs dash-muted hover:text-[var(--dash-text)] transition-colors',
    empty: 'text-sm dash-muted text-center py-8',
    item: (unread) => `flex gap-3 px-4 py-3 border-b dash-border transition-colors ${unread ? 'bg-[var(--dash-surface-muted)]' : 'hover:bg-[var(--dash-surface-muted)]'}`,
    itemText: (unread) => `text-sm leading-snug ${unread ? 'dash-text font-medium' : 'dash-subtle'}`,
    itemTime: 'text-xs dash-muted mt-0.5',
    markReadBtn: 'p-1 dash-muted hover:text-[var(--dash-text)] transition-colors flex-shrink-0',
    fallbackIcon: 'w-4 h-4 dash-muted flex-shrink-0',
  },
};

function NotifItem({ item, onMarkRead, s }) {
  const payload = item.payload ?? {};
  const message = payload.message
    ?? (item.type === 'llm_anomaly'
      ? `Session vượt ngưỡng AI: ${payload.callCount ?? '?'} lần gọi (ngưỡng ${payload.threshold ?? '?'})`
      : item.type);

  const unread = !item.readAt;

  return (
    <div className={s.item(unread)}>
      <div className="mt-0.5">{TYPE_ICON[item.type] ?? <Bell className={s.fallbackIcon} />}</div>
      <div className="flex-1 min-w-0">
        <p className={s.itemText(unread)}>{message}</p>
        <p className={s.itemTime}>
          {new Date(item.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
        </p>
      </div>
      {unread && (
        <button onClick={() => onMarkRead(item.id)} className={s.markReadBtn} aria-label="Đánh dấu đã đọc">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function NotificationDropdown({ dashTheme = false }) {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = dashTheme ? STYLES.dash : STYLES.slate;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = (id) => dispatch(markReadRequest(id));
  const handleMarkAllRead = () => dispatch(markAllReadRequest());

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Thông báo" className={s.trigger}>
        <Bell size={dashTheme ? 19 : 16} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cta rounded-full" />
        )}
      </button>

      {open && (
        <div className={s.panel}>
          <div className={s.header}>
            <span className={s.title}>
              Thông báo {unreadCount > 0 && <span className="text-xs text-cta ml-1">({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className={s.markAllBtn}>
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className={s.empty}>Không có thông báo</p>
            ) : (
              items.map((item) => (
                <NotifItem key={item.id} item={item} onMarkRead={handleMarkRead} s={s} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
