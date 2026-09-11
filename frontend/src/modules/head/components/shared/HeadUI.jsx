import React from 'react';
import { RefreshCw, Search, Plus, X, Inbox, AlertCircle } from 'lucide-react';

/**
 * 1. HeadPanelPageHeader
 * Renders consistent page headers across all Head panel modules.
 */
export const HeadPanelPageHeader = ({ title, description, icon: Icon, actionLabel, onActionClick, actionIcon: ActionIcon }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
          {Icon && <Icon className="text-brand-primary" size={28} />}
          {title}
        </h1>
        {description && <p className="text-sm text-slate-600 mt-1 font-semibold">{description}</p>}
      </div>
      {actionLabel && (
        <button
          onClick={onActionClick}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer text-sm"
        >
          {ActionIcon ? <ActionIcon size={18} /> : <Plus size={18} />}
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * 2. HeadPanelCard
 * Wrapper card component for standard layouts.
 */
export const HeadPanelCard = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all hover:shadow-md ${className}`}>
      {children}
    </div>
  );
};

/**
 * 3. HeadPanelStatCard
 * Consistent statistic summaries.
 */
export const HeadPanelStatCard = ({ label, value, icon: Icon, colorClass = 'bg-purple-100 text-purple-700', trend, trendType = 'success' }) => {
  const trendColor = trendType === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon size={24} />
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{value}</h3>
        </div>
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${trendColor}`}>
          {trend}
        </span>
      )}
    </div>
  );
};

/**
 * 4. HeadPanelButton
 * Standardized premium buttons.
 */
export const HeadPanelButton = ({ label, onClick, variant = 'primary', icon: Icon, loading, disabled, type = 'button', className = '' }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-brand-primary hover:bg-brand-secondary text-white shadow-sm hover:shadow-md",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
    danger: "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200",
    outline: "bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${styles[variant]} ${className}`}
    >
      {loading ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {label}
    </button>
  );
};

/**
 * 5. HeadPanelInput
 * Form input wrappers.
 */
export const HeadPanelInput = ({ label, type = 'text', placeholder, value, onChange, error, name, required, rows, className = '' }) => {
  const inputStyle = `w-full px-4 py-2.5 rounded-xl border ${error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/10'} focus:ring-4 outline-none transition-all text-sm font-semibold bg-white text-slate-900 placeholder-slate-400`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {rows ? (
        <textarea
          rows={rows}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={inputStyle}
          required={required}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={inputStyle}
          required={required}
        />
      )}
      {error && <span className="text-xs text-rose-600 font-bold mt-0.5">⚠️ {error}</span>}
    </div>
  );
};

/**
 * 6. HeadPanelSelect
 * Standard select box.
 */
export const HeadPanelSelect = ({ label, value, onChange, options = [], error, name, required, className = '' }) => {
  const selectStyle = `w-full px-4 py-2.5 rounded-xl border ${error ? 'border-rose-400' : 'border-slate-300 focus:border-brand-primary'} outline-none transition-all text-sm font-bold bg-white text-slate-900 h-[43px]`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={selectStyle}
        required={required}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-600 font-bold mt-0.5">⚠️ {error}</span>}
    </div>
  );
};

/**
 * 7. HeadPanelModal
 * Consistent dialog template.
 */
export const HeadPanelModal = ({ isOpen, onClose, title, children, actions, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white w-full ${sizeClasses[size]} rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <h3 className="font-black text-slate-900 text-lg tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {actions && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/75 flex items-center justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 8. HeadPanelTable
 * Generic table view wrapper.
 */
export const HeadPanelTable = ({ headers = [], children, emptyState }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {children}
        </tbody>
      </table>
      {!children && emptyState}
    </div>
  );
};

/**
 * 9. HeadPanelStatusBadge
 * Formatted status badges.
 */
export const HeadPanelStatusBadge = ({ status }) => {
  const lower = String(status).toLowerCase();
  
  const mapping = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    completed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    scheduled: 'bg-blue-50 text-blue-800 border-blue-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    draft: 'bg-slate-100 text-slate-800 border-slate-200',
    inactive: 'bg-rose-50 text-rose-800 border-rose-200',
    rejected: 'bg-rose-50 text-rose-800 border-rose-200',
    suspended: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const style = mapping[lower] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${style}`}>
      {status}
    </span>
  );
};

/**
 * 10. HeadPanelEmptyState
 * Formatted empty queues.
 */
export const HeadPanelEmptyState = ({ title = 'No items found', message = 'There are no active records in this view.', actionLabel, onActionClick }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4 border border-slate-200">
        <Inbox size={26} />
      </div>
      <h4 className="text-slate-900 font-black text-base tracking-tight">{title}</h4>
      <p className="text-slate-600 text-sm mt-1 font-semibold">{message}</p>
      {actionLabel && (
        <button
          onClick={onActionClick}
          className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * 11. HeadPanelLoadingState
 * Spinner display.
 */
export const HeadPanelLoadingState = ({ message = 'Loading datasets...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <div className="w-10 h-10 border-3 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-4" />
      <p className="text-sm font-bold text-slate-700">{message}</p>
    </div>
  );
};

export default {
  HeadPanelPageHeader,
  HeadPanelCard,
  HeadPanelStatCard,
  HeadPanelButton,
  HeadPanelInput,
  HeadPanelSelect,
  HeadPanelModal,
  HeadPanelTable,
  HeadPanelStatusBadge,
  HeadPanelEmptyState,
  HeadPanelLoadingState
};
