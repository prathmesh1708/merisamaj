import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'active', 'inactive', 'blocked', 'deleted', 'pending verification'];
const VERIFY_OPTIONS = ['All', 'verified', 'pending', 'rejected'];

export const UserFilters = ({ filters, setFilters }) => {
  const hasActiveFilters = filters.search ||
    filters.status !== 'All' ||
    filters.verificationStatus !== 'All' ||
    (filters.city && filters.city !== 'All');

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'All',
      verificationStatus: 'All',
      communityId: 'all',
      city: 'All',
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Search Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all text-gray-700 font-medium placeholder-gray-400"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 hover:text-rose-500 transition-all"
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <SlidersHorizontal size={14} /> Filters:
        </div>

        {/* Account Status */}
        <select
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary cursor-pointer"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.slice(1).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Verification Status */}
        <select
          value={filters.verificationStatus}
          onChange={e => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary cursor-pointer"
        >
          <option value="All">All Verifications</option>
          {VERIFY_OPTIONS.slice(1).map(v => (
            <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
          ))}
        </select>

        {/* Head Assignment Status */}
        <select
          value={filters.headStatus || 'all'}
          onChange={e => setFilters(prev => ({ ...prev, headStatus: e.target.value }))}
          className={`px-3 py-2 border rounded-xl text-xs font-bold outline-none cursor-pointer transition-all ${
            filters.headStatus === 'unassigned'
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : filters.headStatus === 'assigned'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-brand-primary'
          }`}
        >
          <option value="all">All Head Status</option>
          <option value="unassigned">🔴 Head Pending (Action Needed)</option>
          <option value="assigned">🟢 Head Assigned</option>
        </select>

        {/* City */}
        <input
          type="text"
          placeholder="Filter by city..."
          value={filters.city === 'All' ? '' : filters.city}
          onChange={e => setFilters(prev => ({ ...prev, city: e.target.value || 'All' }))}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary transition-all placeholder-gray-400 w-36"
        />
      </div>
    </div>
  );
};
