import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { 
  Users, Building2, MapPin, ShieldCheck, 
  Heart, Calendar, Briefcase, Activity, 
  IndianRupee, TrendingUp, TrendingDown, Flame,
  ThumbsUp, MessageSquare, CheckCircle2, Award
} from 'lucide-react';

export const AdminDashboard = () => {
  const { data, loading, error } = useDashboard();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold mt-4 animate-pulse">Loading Platform Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-lg mx-auto mt-20">
        <h3 className="text-rose-400 font-bold mb-2">System Error</h3>
        <p className="text-gray-400 text-sm">{error || "Failed to load platform dashboard data."}</p>
      </div>
    );
  }

  // Helper for rendering empty states safely
  const renderEmptyState = (message = "No data available yet") => (
    <div className="flex items-center justify-center h-32 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* ─── DASHBOARD HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Platform Master Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Real-time platform-wide statistics across the entire ApniSamaj network
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Network Live</span>
        </div>
      </div>

      {/* ─── 4 TOP KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Registered Members */}
        <div 
          onClick={() => navigate('/admin/users')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer transform hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Registered Members</p>
            <h3 className="text-3xl font-black text-slate-800">{data.members?.total?.toLocaleString() || 0}</h3>
            <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {data.members?.verified?.toLocaleString() || 0} Verified ({data.members?.active || 0} Active)
            </p>
          </div>
        </div>

        {/* 2. Total Communities */}
        <div 
          onClick={() => navigate('/admin/communities')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer transform hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Communities</p>
            <h3 className="text-3xl font-black text-slate-800">{data.communities?.total?.toLocaleString() || 0}</h3>
            <p className="text-xs font-semibold text-blue-600 mt-2">
              {data.communities?.active?.toLocaleString() || 0} Active Communities
            </p>
          </div>
        </div>

        {/* 3. Total Cities Connected */}
        <div 
          onClick={() => navigate('/admin/cities')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer transform hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
            <MapPin className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cities Connected</p>
            <h3 className="text-3xl font-black text-slate-800">{data.cities?.total?.toLocaleString() || 0}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-2">Across Platform Network</p>
          </div>
        </div>

        {/* 4. Active Community Heads */}
        <div 
          onClick={() => navigate('/admin/community-heads')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer transform hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Community Heads</p>
            <h3 className="text-3xl font-black text-slate-800">{data.heads?.active?.toLocaleString() || 0}</h3>
            <p className="text-xs font-semibold text-purple-600 mt-2">Heads & Sub-Heads</p>
          </div>
        </div>
      </div>

      {/* ─── MODULE STATISTICS ROW (MATRIMONIAL, EVENTS, PROFESSIONAL) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 5. Matrimonial Statistics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center border border-pink-100">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <h3 className="font-bold text-slate-800">Matrimonial Profiles</h3>
            </div>
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              {data.matrimonial?.verified || 0} Verified
            </span>
          </div>
          {data.matrimonial?.total === 0 ? renderEmptyState("No matrimonial profiles created yet") : (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600">Total Directory Profiles</span>
                  <span className="text-sm font-black text-slate-800">{data.matrimonial?.total || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-pink-500 h-2 rounded-full w-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600">Searching / Unmarried</span>
                  <span className="text-sm font-black text-slate-800">{data.matrimonial?.single || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(((data.matrimonial?.single || 0) / (data.matrimonial?.total || 1)) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600">Success / Married</span>
                  <span className="text-sm font-black text-slate-800">{data.matrimonial?.married || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(((data.matrimonial?.married || 0) / (data.matrimonial?.total || 1)) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Event Statistics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-bold text-slate-800">Community Events</h3>
          </div>
          {data.events?.total === 0 ? renderEmptyState("No events published yet") : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Events</p>
                <h4 className="text-2xl font-black text-slate-800">{data.events?.total || 0}</h4>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-xs font-bold text-orange-600 uppercase mb-1">Active / Upcoming</p>
                <h4 className="text-2xl font-black text-orange-700">{data.events?.active || 0}</h4>
              </div>
              <div className="col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Completed Events</p>
                  <h4 className="text-2xl font-black text-emerald-700">{data.events?.completed || 0}</h4>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-200 flex items-center justify-center bg-white shadow-sm">
                  <span className="text-xs font-bold text-emerald-700">
                    {Math.round(((data.events?.completed || 0) / (data.events?.total || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Professional Directory Statistics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center border border-sky-100">
              <Briefcase className="w-5 h-5 text-sky-500" />
            </div>
            <h3 className="font-bold text-slate-800">Professional Listings</h3>
          </div>
          {data.professionals?.total === 0 ? renderEmptyState("No business listings submitted yet") : (
            <div className="flex flex-col items-center justify-center h-full pb-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="56" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray="351.8" 
                    strokeDashoffset={351.8 - (351.8 * Math.min((data.professionals?.approved || 0) / (data.professionals?.total || 1), 1))} 
                    className="text-sky-500 transition-all duration-1000" 
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-800">{data.professionals?.total || 0}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>
              <p className="text-xs font-bold text-sky-600 mt-4 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                {data.professionals?.approved || 0} Approved & Active Listings
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ─── ENGAGEMENT, OBITUARIES & REVENUE ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 8. Community Engagement Overview (Expanded) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Activity className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="font-bold text-slate-800">Community Engagement Overview</h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Platform Activity
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {/* Posts */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Social Posts</span>
                <Users size={16} className="text-indigo-500" />
              </div>
              <h4 className="text-2xl font-black text-slate-800">{data.engagement?.posts || 0}</h4>
            </div>

            {/* Likes */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Post Likes</span>
                <ThumbsUp size={16} className="text-rose-500" />
              </div>
              <h4 className="text-2xl font-black text-slate-800">{data.engagement?.likes || 0}</h4>
            </div>

            {/* Comments */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Comments</span>
                <MessageSquare size={16} className="text-blue-500" />
              </div>
              <h4 className="text-2xl font-black text-slate-800">{data.engagement?.comments || 0}</h4>
            </div>

            {/* Event RSVPs */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Event RSVPs</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <h4 className="text-2xl font-black text-slate-800">{data.engagement?.rsvps || 0}</h4>
            </div>
          </div>

          {/* Elections Hosted */}
          <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase">Elections & Voting</p>
                <p className="text-xs text-purple-600 font-medium">Total community voting elections hosted</p>
              </div>
            </div>
            <h4 className="text-2xl font-black text-purple-900">{data.engagement?.elections || 0}</h4>
          </div>
        </div>

        {/* 9. Obituaries Metric Card (Replaces ad-hoc navigation tile) */}
        <div 
          onClick={() => navigate('/admin/obituaries')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                  <Flame className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800">Obituaries Desk</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100">
                Memorials
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Published Obituaries</p>
            <h3 className="text-4xl font-black text-slate-800">{data.obituaries?.total || 0}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Platform-wide memorial tributes published across all communities
            </p>
          </div>
          <div className="pt-6 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Manage Obituaries Desk</span>
            <span>→</span>
          </div>
        </div>

      </div>

      {/* ─── REVENUE OVERVIEW ─── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Revenue & Financial Overview</h3>
              <p className="text-xs text-slate-400 font-medium">Combined revenue from Funds/Contributions, Campaign Donations & Dharmashala Bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <TrendingUp size={14} />
            Multi-Source Financial Summary
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Revenue */}
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Total Gross Revenue</p>
            <h3 className="text-3xl font-black text-emerald-900 flex items-center">
              <IndianRupee className="w-6 h-6 mr-1" />
              {(data.revenue?.total || 0).toLocaleString()}
            </h3>
            <div className="mt-3 pt-3 border-t border-emerald-200/60 text-[11px] font-semibold text-emerald-800 space-y-1">
              <div className="flex justify-between">
                <span>Community Funds:</span>
                <span>₹{(data.revenue?.contributions || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Donation Campaigns:</span>
                <span>₹{(data.revenue?.donations || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Dharmashala Bookings:</span>
                <span>₹{(data.revenue?.dharmashala || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase mb-1">Total Logged Expenses</p>
              <h3 className="text-3xl font-black text-rose-900 flex items-center">
                <IndianRupee className="w-6 h-6 mr-1" />
                {(data.revenue?.expenses || 0).toLocaleString()}
              </h3>
            </div>
            <p className="text-xs text-rose-600 font-medium mt-3">
              Total campaign and community operation expenses
            </p>
          </div>

          {/* Net Available Balance */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Available Balance</p>
              <h3 className="text-3xl font-black text-emerald-400 flex items-center">
                <IndianRupee className="w-6 h-6 mr-1" />
                {(data.revenue?.available || 0).toLocaleString()}
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-3">
              Calculated as Total Revenue minus Expenses
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export const MasterAdminDashboard = AdminDashboard;
export default AdminDashboard;
