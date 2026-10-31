import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { userService } from '../../../services/userService';
import { DEFAULT_USER_FILTERS } from '../../../hooks/useUserManagement';

const STATUS_OPTIONS = ['All', 'active', 'inactive', 'blocked', 'deleted', 'pending verification'];
const VERIFY_OPTIONS = ['All', 'verified', 'pending', 'rejected'];

const selectCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary cursor-pointer';
const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary transition-all placeholder-gray-400';

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1 min-w-0">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    {children}
  </label>
);

export const UserFilters = ({ filters, setFilters }) => {
  const [options, setOptions] = useState({ communities: [], subCommunities: [], states: [], heads: [] });
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    userService.getFilterOptions()
      .then(data => setOptions(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Filter options load failed:', err));
  }, []);

  const set = (key) => (e) => setFilters(prev => ({ ...prev, [key]: e.target.value }));

  // Count every filter that differs from its default (search excluded — it has its own box)
  const activeCount = Object.keys(DEFAULT_USER_FILTERS)
    .filter(k => k !== 'search' && (filters[k] ?? DEFAULT_USER_FILTERS[k]) !== DEFAULT_USER_FILTERS[k])
    .length;
  const hasActiveFilters = Boolean(filters.search) || activeCount > 0;

  const clearFilters = () => setFilters(DEFAULT_USER_FILTERS);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Search Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone or customer ID..."
            value={filters.search}
            onChange={set('search')}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all text-gray-700 font-medium placeholder-gray-400"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 hover:text-rose-500 transition-all"
          >
            <X size={14} /> Clear Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <SlidersHorizontal size={14} /> Filters
      </div>

      {/* Main filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Field label="Customer ID">
          <input type="text" placeholder="e.g. 1ED1DAD4" value={filters.customerId} onChange={set('customerId')} className={`${inputCls} font-mono uppercase`} />
        </Field>

        <Field label="Customer Name">
          <input type="text" placeholder="Name..." value={filters.name} onChange={set('name')} className={inputCls} />
        </Field>

        <Field label="Community">
          <select value={filters.communityName} onChange={set('communityName')} className={selectCls}>
            <option value="all">All Communities</option>
            {options.communities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Sub Community">
          <input type="text" list="admin-subcommunity-options" placeholder="Any sub community" value={filters.subCommunity} onChange={set('subCommunity')} className={inputCls} />
          <datalist id="admin-subcommunity-options">
            {options.subCommunities.map(s => <option key={s} value={s} />)}
          </datalist>
        </Field>

        <Field label="Location">
          <input type="text" placeholder="City, district, pincode..." value={filters.location} onChange={set('location')} className={inputCls} />
        </Field>

        <Field label="Head / Verified By">
          <input type="text" list="admin-head-options" placeholder="Head name..." value={filters.verifiedBy} onChange={set('verifiedBy')} className={inputCls} />
          <datalist id="admin-head-options">
            {options.heads.map(h => <option key={h} value={h} />)}
          </datalist>
        </Field>

        <Field label="Account Status">
          <select value={filters.status} onChange={set('status')} className={selectCls}>
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.slice(1).map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        <Field label="Verification">
          <select value={filters.verificationStatus} onChange={set('verificationStatus')} className={selectCls}>
            <option value="All">All Verifications</option>
            {VERIFY_OPTIONS.slice(1).map(v => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </Field>

        <Field label="Head Status">
          <select
            value={filters.headStatus || 'all'}
            onChange={set('headStatus')}
            className={`${selectCls} ${
              filters.headStatus === 'unassigned'
                ? '!bg-rose-50 !border-rose-300 !text-rose-700'
                : filters.headStatus === 'assigned'
                ? '!bg-emerald-50 !border-emerald-300 !text-emerald-700'
                : ''
            }`}
          >
            <option value="all">All Head Status</option>
            <option value="unassigned">🔴 Head Pending (Action Needed)</option>
            <option value="assigned">🟢 Head Assigned</option>
          </select>
        </Field>

        <Field label="Photo">
          <select value={filters.hasPhoto} onChange={set('hasPhoto')} className={selectCls}>
            <option value="all">All</option>
            <option value="yes">With Photo</option>
            <option value="no">Without Photo</option>
          </select>
        </Field>
      </div>

      {/* More filters */}
      <button
        type="button"
        onClick={() => setShowMore(v => !v)}
        className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
      >
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMore ? 'Less filters' : 'More filters (state, district, gender, joined date)'}
      </button>

      {showMore && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <Field label="State">
            <select value={filters.state} onChange={set('state')} className={selectCls}>
              <option value="all">All States</option>
              {options.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="District">
            <input type="text" placeholder="District..." value={filters.district} onChange={set('district')} className={inputCls} />
          </Field>

          <Field label="City">
            <input
              type="text"
              placeholder="City..."
              value={filters.city === 'All' ? '' : filters.city}
              onChange={e => setFilters(prev => ({ ...prev, city: e.target.value || 'All' }))}
              className={inputCls}
            />
          </Field>

          <Field label="Gender">
            <select value={filters.gender} onChange={set('gender')} className={selectCls}>
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Joined From">
            <input type="date" value={filters.dateFrom} onChange={set('dateFrom')} className={inputCls} />
          </Field>

          <Field label="Joined To">
            <input type="date" value={filters.dateTo} onChange={set('dateTo')} className={inputCls} />
          </Field>
        </div>
      )}
    </div>
  );
};
