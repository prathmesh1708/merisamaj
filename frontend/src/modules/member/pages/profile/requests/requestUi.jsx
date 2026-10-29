import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Inbox, Loader2, Search, XCircle } from 'lucide-react';
import { useData } from '../../../context/DataProvider';
import { canReviewRequests } from '../../../utils/headRoles';
import { STATUS_TABS, STATUS_BADGES, initialsOf } from './requestHelpers';

// Shared UI for the Community Member / Family request screens (helpers live in requestHelpers.js)

export const RequestsGuard = ({ children }) => {
  const { currentUser } = useData();
  if (currentUser && !canReviewRequests(currentUser)) return <Navigate to="/member/profile" replace />;
  return children;
};

export const RequestPhoto = ({ src, name, className = 'w-[72px] h-[72px] rounded-2xl text-xl' }) => (
  src
    ? <img src={src} alt={name} className={`${className} object-cover shrink-0 bg-slate-100`} />
    : (
      <div className={`${className} shrink-0 bg-gradient-to-br from-purple-100 to-violet-50 text-purple-700 font-black flex items-center justify-center`}>
        {initialsOf(name)}
      </div>
    )
);

export const StatusTabs = ({ value, onChange, counts }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
    {STATUS_TABS.map(tab => {
      const active = value === tab.key;
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`shrink-0 h-9 pl-3.5 pr-2 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all ${
            active ? 'bg-brand-primary text-white shadow-md shadow-purple-500/20' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          {tab.label}
          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
            active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
          }`}>
            {counts?.[tab.key] ?? '–'}
          </span>
        </button>
      );
    })}
  </div>
);

export const SearchBar = ({ value, onChange, placeholder }) => (
  <label className="flex items-center gap-2.5 h-11 px-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm focus-within:border-purple-300 transition-colors">
    <Search size={16} className="text-slate-400 shrink-0" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none"
    />
  </label>
);

export const StatusBadge = ({ status, label }) => {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
      {label || badge.label}
    </span>
  );
};

export const LoadingState = () => (
  <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
    <Loader2 size={18} className="animate-spin text-brand-primary" /> Loading requests…
  </div>
);

export const EmptyState = ({ title, subtitle }) => (
  <div className="py-14 px-6 text-center rounded-3xl bg-white border border-slate-200/80 shadow-sm">
    <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
    <p className="text-sm font-bold text-slate-700">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="py-10 px-6 text-center rounded-3xl bg-rose-50 border border-rose-200/70">
    <AlertCircle size={28} className="mx-auto text-rose-500 mb-2" />
    <p className="text-sm font-bold text-rose-800">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="mt-3 px-4 h-9 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold">
        Try again
      </button>
    )}
  </div>
);

export const Toast = ({ toast }) => toast && (
  <div
    role="status"
    className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-sm px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-bold flex items-center gap-2 animate-fade-in ${
      toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
    }`}
  >
    {toast.type === 'error' ? <XCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
    {toast.message}
  </div>
);

// Bottom sheet asking for a rejection reason. Render it with key={target id} so the note resets.
export const DenySheet = ({ target, requireReason, busy, onCancel, onConfirm }) => {
  const [note, setNote] = useState('');
  if (!target) return null;
  const canSubmit = !busy && (!requireReason || note.trim());
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={busy ? undefined : onCancel}>
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-3 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black text-slate-900">Deny {target.name}'s request?</h3>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={requireReason ? 'Reason for rejection (shared with the member)' : 'Reason (optional)'}
          className="w-full text-[13px] border border-slate-200 rounded-2xl p-3 outline-none focus:border-rose-300"
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim())}
            disabled={!canSubmit}
            className="h-11 rounded-2xl bg-rose-600 text-white text-sm font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Deny
          </button>
        </div>
      </div>
    </div>
  );
};

// Large coloured tile used for the actions on the details screens
export const ActionTile = ({ icon: Icon, label, onClick, disabled, busy, className }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    className={`min-h-[76px] rounded-2xl text-white flex flex-col items-center justify-center gap-1.5 text-[12px] font-extrabold shadow-md active:scale-[0.97] transition-all disabled:opacity-50 ${className}`}
  >
    {busy ? <Loader2 size={22} className="animate-spin" /> : <Icon size={22} />}
    {label}
  </button>
);

export const InfoRow = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-2 text-[12px] text-slate-600 font-medium min-w-0">
    <Icon size={14} className="text-slate-400 shrink-0" />
    <span className="truncate">{children}</span>
  </p>
);

export const PageShell = ({ children }) => (
  <div className="min-h-screen bg-surface flex flex-col animate-fade-in">
    {children}
  </div>
);

export const PageBody = ({ children }) => (
  <div className="flex-1 px-4 pt-24 pb-28 max-w-md sm:max-w-2xl mx-auto w-full space-y-4">
    {children}
  </div>
);
