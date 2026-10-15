import React, { useEffect, useState, useCallback } from 'react';
import { CalendarClock, Eye, Heart, MessageCircle, Receipt, Loader2, RefreshCw } from 'lucide-react';
import { matrimonialSubscriptionService } from '../../../../../core/api/matrimonialService';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const isUnlimited = (limit) => limit === -1 || limit === null || limit === undefined;

const STATE_BADGE = {
  active:          { label: 'Active',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  grace:           { label: 'Grace period',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled:       { label: 'Cancelled',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  expired:         { label: 'Expired',         cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  upcoming:        { label: 'Starts later',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  payment_pending: { label: 'Payment pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  payment_failed:  { label: 'Payment failed',  cls: 'bg-red-50 text-red-600 border-red-200' }
};

/** One usage meter: "3 of 10 used today" with a bar (or "Unlimited"). */
const UsageMeter = ({ icon: Icon, label, used, limit, resetText }) => {
  const unlimited = isUnlimited(limit);
  const pct = unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const left = unlimited ? null : Math.max(0, limit - used);
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12.5px] font-bold text-slate-700 min-w-0">
          <Icon size={15} className="text-rose-500 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-[13px] font-black text-slate-900 shrink-0">
          {used}{unlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      {unlimited ? (
        <p className="text-[11px] font-semibold text-emerald-600 mt-1.5">Unlimited on your plan</p>
      ) : (
        <>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
            {left === 0 ? 'Limit reached' : `${left} left`} · {resetText}
          </p>
        </>
      )}
    </div>
  );
};

/**
 * "Manage subscription" details: days left on the current plan, usage against each
 * plan limit, and every plan the member has bought (GET /subscription/overview).
 */
export const MySubscriptionPanel = ({ refreshKey = 0 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await matrimonialSubscriptionService.getOverview();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your subscription details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-center gap-2 text-slate-400 text-[12px] font-bold">
        <Loader2 size={16} className="animate-spin" /> Loading your subscription…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-4 text-center">
        <p className="text-[12px] font-bold text-red-500">{error}</p>
        <button onClick={load} className="mt-2 text-[12px] font-bold text-rose-500 inline-flex items-center gap-1">
          <RefreshCw size={13} /> Try again
        </button>
      </div>
    );
  }

  const { current, limits = {}, usage = {}, history = [], totalSpent = 0 } = data || {};
  const daysPct = current ? Math.min(100, Math.round((current.daysUsed / current.totalDays) * 100)) : 0;
  const monthlyReset = `resets ${fmtDate(usage.monthlyResetAt)}`;

  return (
    <div className="space-y-4">
      {/* Days left */}
      {current && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <CalendarClock size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Time left</p>
                <p className="text-[20px] font-black text-slate-900 leading-tight">
                  {current.daysLeft} {current.daysLeft === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold text-slate-400">of {current.totalDays} days</p>
              <p className="text-[11px] font-bold text-slate-600">Ends {fmtDate(current.endDate)}</p>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3.5">
            <div
              className={`h-full rounded-full ${current.daysLeft <= 7 ? 'bg-amber-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`}
              style={{ width: `${daysPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10.5px] font-semibold text-slate-400 mt-1.5">
            <span>Started {fmtDate(current.startDate)}</span>
            <span>{daysPct}% used</span>
          </div>
          {current.status === 'cancelled' && (
            <p className="mt-3 text-[11.5px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              You cancelled this plan. You can keep using it until {fmtDate(current.endDate)}; it won't renew.
            </p>
          )}
          {current.status !== 'cancelled' && current.daysLeft <= 7 && (
            <p className="mt-3 text-[11.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Your plan ends soon. Renew to keep your premium features.
            </p>
          )}
        </div>
      )}

      {/* Usage */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-3">Your usage</h4>
        <div className="space-y-2.5">
          <UsageMeter
            icon={Eye}
            label="Profiles viewed today"
            used={usage.profileViewsToday || 0}
            limit={limits.profileViewsPerDay}
            resetText="resets at midnight"
          />
          <UsageMeter
            icon={Heart}
            label="Interests sent this month"
            used={usage.interestsThisMonth || 0}
            limit={limits.interestLimit}
            resetText={monthlyReset}
          />
          <UsageMeter
            icon={MessageCircle}
            label="Messages sent this month"
            used={usage.messagesThisMonth || 0}
            limit={limits.messageLimit}
            resetText={monthlyReset}
          />
        </div>
      </div>

      {/* Every plan bought */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt size={13} /> My plans ({history.length})
          </h4>
          {totalSpent > 0 && (
            <span className="text-[11px] font-bold text-slate-500">Total paid ₹{totalSpent.toLocaleString('en-IN')}</span>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-[11.5px] text-slate-400 text-center font-semibold py-3">You haven't bought a plan yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(item => {
              const badge = STATE_BADGE[item.state] || STATE_BADGE.expired;
              return (
                <div
                  key={item._id}
                  className={`px-3 py-2.5 rounded-xl border ${item.isCurrent ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-slate-800 truncate">
                        {item.planName}
                        {item.isCurrent && <span className="ml-1.5 text-[9.5px] font-black text-rose-600 uppercase">· Current</span>}
                      </p>
                      <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">
                        {fmtDate(item.startDate)} – {fmtDate(item.endDate)} · {item.durationInDays} days
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black text-slate-800">₹{(item.pricePaid || 0).toLocaleString('en-IN')}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wide ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  {item.paymentId && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                      Bought {fmtDate(item.purchasedAt)} · Ref {item.paymentId}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubscriptionPanel;
