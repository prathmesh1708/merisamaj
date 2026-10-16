import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, HeartOff } from 'lucide-react';
import { matrimonialInterestService } from '../../../../core/api/matrimonialService';

// 01-Aug-26, like Jeevansathi
const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
  : '');

const pronoun = (gender) => (gender === 'male' ? 'He' : gender === 'female' ? 'She' : 'They');

/** Interests that were declined or cancelled — by me, or by the other person. */
const DeclinedInterestsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('they'); // 'mine' | 'they'
  const [data, setData] = useState({ iDeclined: [], theyDeclined: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await matrimonialInterestService.getDeclinedInterests();
        setData(res.data?.data || { iDeclined: [], theyDeclined: [] });
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load declined interests.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const list = tab === 'mine' ? data.iDeclined : data.theyDeclined;

  const statusText = (entry) => {
    const verb = entry.action === 'declined' ? 'Declined' : 'Cancelled';
    const who = tab === 'mine' ? 'You' : pronoun(entry.profile?.personal?.gender);
    return `${who} ${verb} on ${fmtDate(entry.date)}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex items-center gap-3 px-3 h-14 border-b border-slate-100">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-slate-700" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900 truncate">Declined/Cancelled Interests</h1>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-100">
          {[
            { id: 'mine', label: 'I Declined', count: data.iDeclined.length },
            { id: 'they', label: 'They Declined', count: data.theyDeclined.length }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3.5 text-[13px] font-bold uppercase tracking-wide border-b-2 transition-colors ${
                tab === t.id ? 'text-slate-800 border-rose-500' : 'text-slate-400 border-transparent'
              }`}
            >
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-400 text-[13px] font-semibold">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="py-16 text-center text-[13px] font-semibold text-red-500">{error}</p>
        ) : list.length === 0 ? (
          <div className="py-20 px-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mb-3">
              <HeartOff size={26} />
            </div>
            <p className="text-[14px] font-bold text-slate-700">Nothing here</p>
            <p className="text-[12px] text-slate-400 font-medium mt-1">
              {tab === 'mine'
                ? 'Interests you decline or cancel will appear here.'
                : 'Interests declined or cancelled by others will appear here.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(entry => {
              const p = entry.profile;
              const name = p?.personal?.fullName || p?.userId?.name || 'Member';
              const photo = p?.photos?.[0]?.url || p?.userId?.avatar;
              return (
                <li key={entry._id}>
                  <button
                    onClick={() => p?._id && navigate(`/member/matrimonial/${p._id}`)}
                    disabled={!p}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left active:bg-slate-50 disabled:opacity-60"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-rose-50 shrink-0 flex items-center justify-center">
                      {photo
                        ? <img src={photo} alt={name} className="w-full h-full object-cover" />
                        : <span className="text-[20px] font-black text-rose-400">{name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold text-slate-700 truncate">{p ? name : 'Profile no longer available'}</p>
                      <p className="text-[13px] text-slate-400 font-medium mt-0.5">{statusText(entry)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DeclinedInterestsPage;
