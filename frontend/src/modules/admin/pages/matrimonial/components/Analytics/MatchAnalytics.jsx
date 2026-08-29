import React from 'react';
import { TrendingUp, Heart, Users, BarChart2 } from 'lucide-react';

const MetricCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <Icon size={16} className={color} />
    </div>
    <p className={`text-2xl font-black ${color}`}>{value ?? '—'}</p>
    {sub && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{sub}</p>}
  </div>
);

export const MatchAnalytics = ({ data }) => {
  const { analytics } = data;

  if (!analytics) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500 font-semibold shadow-xs">
      Analytics data not available yet.
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-base font-black text-slate-900">Match Analytics — Last 30 Days</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="New Profiles"       value={analytics.newProfiles}         icon={Users}    color="text-blue-600" />
        <MetricCard label="Interests Sent"     value={analytics.newInterests}        icon={Heart}    color="text-rose-600" />
        <MetricCard label="Accepted"           value={analytics.acceptedInterests}   icon={TrendingUp} color="text-emerald-600"
          sub={analytics.interestAcceptanceRate ? `${analytics.interestAcceptanceRate}% accept rate` : ''} />
        <MetricCard label="Revenue"            value={analytics.revenue ? `₹${analytics.revenue.toLocaleString()}` : '₹0'}
          icon={BarChart2} color="text-amber-600"
          sub={analytics.newSubscriptions ? `${analytics.newSubscriptions} new subs` : ''} />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h4 className="text-sm font-black text-slate-900 mb-5">Interest Funnel</h4>
        <div className="space-y-4">
          {[
            { label: 'Interests Sent',     value: analytics.newInterests    || 0, color: 'bg-blue-500' },
            { label: 'Interests Accepted', value: analytics.acceptedInterests || 0, color: 'bg-emerald-500' },
            { label: 'Chats Opened',       value: analytics.chatsOpened     || 0, color: 'bg-rose-500' },
            { label: 'New Subscriptions',  value: analytics.newSubscriptions || 0, color: 'bg-amber-500' },
          ].map(({ label, value, color }, i, arr) => {
            const max = arr[0].value || 1;
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-semibold">{label}</span>
                  <span className="text-slate-900 font-black">{value.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-xs">
        <p className="text-slate-600 text-sm font-semibold">Period: {analytics.period}</p>
      </div>
    </div>
  );
};

export default MatchAnalytics;
