import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, ShieldAlert, Heart, TrendingUp, Flag, Image, Crown } from 'lucide-react';

const StatCard = ({ title, value, sub, icon: Icon, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 relative overflow-hidden group hover:border-rose-300 hover:shadow-md transition-all duration-300">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${color} opacity-5 group-hover:opacity-10 transition-opacity blur-2xl`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1.5">{value ?? '—'}</h3>
        {sub && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  </motion.div>
);

export const OverviewDashboard = ({ data }) => {
  const { stats, analytics } = data;
  if (!stats) return (
    <div className="text-center py-16 text-slate-500 font-semibold">No data available yet.</div>
  );

  const cards = [
    { title: 'Total Profiles',    value: stats.totalProfiles?.toLocaleString(),   icon: Users,        color: 'text-blue-600' },
    { title: 'Active Profiles',   value: stats.activeProfiles?.toLocaleString(),  icon: TrendingUp,   color: 'text-emerald-600' },
    { title: 'Pending Photos',    value: stats.pendingPhotos?.toLocaleString(),   icon: Image,        color: 'text-amber-600' },
    { title: 'Open Reports',      value: stats.pendingReports?.toLocaleString(),  icon: Flag,         color: 'text-rose-600' },
    { title: 'Total Subscriptions',value: stats.totalSubscriptions?.toLocaleString(), icon: Crown,   color: 'text-purple-600' },
    { title: 'Total Marriages',   value: stats.marriedProfiles?.toLocaleString(),  icon: Heart,        color: 'text-pink-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <StatCard key={card.title} {...card} delay={i * 0.05} />
        ))}
      </div>

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last 30 days */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-base font-black text-slate-900 mb-4">Last 30 Days</h3>
            <div className="space-y-4">
              {[
                { label: 'New Profiles',     value: analytics.newProfiles,     color: 'bg-blue-500' },
                { label: 'New Subscriptions',value: analytics.newSubscriptions, color: 'bg-purple-500' },
                { label: 'Interests Sent',   value: analytics.newInterests,    color: 'bg-rose-500' },
                { label: 'Interests Accepted',value: analytics.acceptedInterests,color: 'bg-emerald-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-semibold">{label}</span>
                    <span className="text-slate-900 font-black">{value || 0}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`}
                      style={{ width: `${Math.min(100, ((value || 0) / Math.max(analytics.newProfiles || 1, 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue & Conversion */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-base font-black text-slate-900 mb-4">Revenue & Conversion</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-slate-600 text-sm font-semibold">Revenue (30d)</span>
                <span className="text-slate-900 font-black text-lg">₹{(analytics.revenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-slate-600 text-sm font-semibold">Acceptance Rate</span>
                <span className="text-emerald-600 font-black text-lg">{analytics.interestAcceptanceRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-slate-600 text-sm font-semibold">Period</span>
                <span className="text-slate-800 font-bold text-sm">{analytics.period}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewDashboard;
