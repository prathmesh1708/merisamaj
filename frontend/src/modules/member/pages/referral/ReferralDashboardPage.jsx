import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Wallet, Clock, TrendingUp, Gift, Users, UserCheck, Crown, Percent, ChevronRight, Trophy, QrCode, FileText, BarChart2, Bell, CheckCircle2 } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { useReferral } from './ReferralContext';
import { useAuth } from '../../../../core/auth/useAuth';
import { Avatar } from '../../components/common/Avatar';

const StatCard = ({ icon: Icon, title, value, subtext, colorClass, iconBgClass }) => (
  <div className="bg-white rounded-[20px] p-4 border border-purple-100/50 shadow-sm flex items-center gap-3.5">
    <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 ${iconBgClass}`}>
      <Icon size={26} className={colorClass} strokeWidth={2.5} />
    </div>
    <div className="flex flex-col">
      <p className="text-[10px] font-semibold text-slate-500 mb-1.5 leading-tight">{title}</p>
      <h3 className="text-[16px] font-extrabold text-slate-800 leading-none">{value}</h3>
      {subtext && <p className="text-[9px] font-medium text-slate-400 mt-1.5">{subtext}</p>}
    </div>
  </div>
);

const MiniStat = ({ icon: Icon, title, value, colorClass, iconBgClass }) => (
  <div className="bg-white rounded-[20px] p-4 border border-purple-100/50 shadow-sm flex flex-col items-center justify-center text-center">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBgClass}`}>
      <Icon size={20} className={colorClass} />
    </div>
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
    <h4 className="text-xl font-black text-slate-800">{value}</h4>
  </div>
);

const ReferralDashboardPage = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { 
    referralCode, totalPoints, pendingPoints, totalEarned, redeemedPoints,
    totalReferrals, registeredUsers, paidSubscribers, referralConversionRate,
    unlockedBadges, earningsOverview = [], topEarners = [], recentActivity = [],
    refreshReferralData, loading
  } = useReferral();
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof refreshReferralData === 'function') {
      refreshReferralData();
    }
  }, [refreshReferralData]);

  const activeReferralCode = referralCode || auth?.user?.referralCode || (auth?.user?.phone ? `SAMAJ-${auth.user.phone.slice(-4)}` : 'SAMAJ-REF');
  const userFirstName = auth?.user?.name ? auth.user.name.split(' ')[0] : 'Member';

  const handleCopy = () => {
    if (!activeReferralCode) return;
    navigator.clipboard.writeText(activeReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const code = activeReferralCode;
    const shareData = {
      title: 'Join MeriSamaj',
      text: `Use my referral code ${code} to get 10% OFF on your first purchase and exclusive benefits!`,
      url: `https://app.merisamaj.com/register?ref=${code}`
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log(err); }
    } else {
      handleCopy();
      alert('Referral link copied to clipboard!');
    }
  };

  const handleWhatsAppShare = () => {
    const code = activeReferralCode;
    const text = `Join MeriSamaj! Use my referral code *${code}* to get exclusive community benefits, register events & connect with community members: https://app.merisamaj.com/register?ref=${code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleFacebookShare = () => {
    const code = activeReferralCode;
    const url = `https://app.merisamaj.com/register?ref=${code}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  // Simple SVG Line Chart generation
  const validEarnings = Array.isArray(earningsOverview) && earningsOverview.length > 0
    ? earningsOverview
    : [
        { month: 'Jan', value: 300 },
        { month: 'Feb', value: 450 },
        { month: 'Mar', value: 600 },
        { month: 'Apr', value: 850 },
        { month: 'May', value: 1100 },
        { month: 'Jun', value: 1250 }
      ];
  const maxEarnings = Math.max(...validEarnings.map(d => d.value), 100);
  const chartHeight = 120;
  const chartWidth = 300;
  const points = validEarnings.map((d, i) => {
    const x = (i / (validEarnings.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value / maxEarnings) * chartHeight * 0.8) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-[#F8F7FC] min-h-screen pb-24 lg:pb-8 font-sans">
      {/* Mobile Sticky Header */}
      <div className="bg-white px-5 h-16 flex items-center justify-between border-b border-gray-150/40 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)] lg:hidden">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800 active:scale-95 transition-transform cursor-pointer">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[17px] font-black text-slate-800 ml-3">Rewards</h1>
        </div>
        <button onClick={() => navigate('/member/notifications')} className="relative w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center cursor-pointer">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50"></span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Hello, {userFirstName} 👋</h1>
            <p className="text-slate-500 font-medium mt-1">Track your referrals, earnings and rewards.</p>
          </div>
          <button onClick={() => navigate('/member/notifications')} className="relative w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm cursor-pointer">
            <Bell size={24} className="text-slate-600" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        {/* Top 4 Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
          <StatCard icon={Wallet} title="Available Points" value={totalPoints.toLocaleString()} subtext={`≈ ₹${totalPoints.toLocaleString()}`} colorClass="text-[#7C3AED]" iconBgClass="bg-purple-100/50" />
          <StatCard icon={Clock} title="Pending Points" value={pendingPoints.toLocaleString()} subtext={`≈ ₹${pendingPoints.toLocaleString()}`} colorClass="text-amber-500" iconBgClass="bg-amber-100/50" />
          <StatCard icon={TrendingUp} title="Total Earned" value={totalEarned.toLocaleString()} subtext={`≈ ₹${totalEarned.toLocaleString()}`} colorClass="text-emerald-500" iconBgClass="bg-emerald-100/50" />
          <StatCard icon={Gift} title="Total Redeemed" value={redeemedPoints.toLocaleString()} subtext={`≈ ₹${redeemedPoints.toLocaleString()}`} colorClass="text-blue-500" iconBgClass="bg-blue-100/50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Left Column */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Purple Hero Card */}
            <div className="bg-[#4C1D95] rounded-[28px] p-5 lg:p-6 text-white relative overflow-hidden shadow-[0_12px_40px_rgba(76,29,149,0.25)]">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-10 w-64 h-64 bg-[#7C3AED]/40 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <p className="text-purple-200 font-bold mb-3 uppercase tracking-wider text-[11px] lg:text-xs">Your Referral Code</p>
                  <div className="flex items-center gap-3 bg-white/10 p-2 pl-5 rounded-2xl border border-white/20 backdrop-blur-sm max-w-sm mb-6">
                    <span className="text-2xl lg:text-3xl font-black tracking-widest flex-1 select-all font-mono">
                      {activeReferralCode || <span className="text-sm font-normal opacity-60">Loading code...</span>}
                    </span>
                    <button 
                      onClick={handleCopy}
                      className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#4C1D95] hover:bg-purple-50 transition-colors shadow-sm cursor-pointer active:scale-95 shrink-0"
                      title="Copy Referral Code"
                    >
                      {copied ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Copy size={24} />}
                    </button>
                  </div>
                  <p className="text-purple-100 font-semibold mb-4 text-[13px] lg:text-sm">Share your code and start earning</p>
                  <div className="flex gap-2">
                    <button onClick={handleWhatsAppShare} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#20b858] transition-colors shadow-lg shadow-green-900/20 cursor-pointer active:scale-95"><Share2 size={16} /> WhatsApp</button>
                    <button onClick={handleFacebookShare} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#1877F2] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#166fe5] transition-colors shadow-lg shadow-blue-900/20 cursor-pointer active:scale-95"><FaFacebook size={16} /> Facebook</button>
                    <button onClick={handleShare} className="w-11 h-11 bg-white/20 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors shrink-0 cursor-pointer active:scale-95" title="More Share Options"><Share2 size={18} /></button>
                  </div>
                </div>
                
                <div className="hidden lg:flex flex-col items-center justify-center bg-white p-4 rounded-3xl shadow-xl shadow-purple-900/20">
                  <div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center border-4 border-white mb-2 relative overflow-hidden">
                    <QrCode size={80} className="text-slate-800" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent animate-[scan_2s_linear_infinite]" style={{ backgroundSize: '100% 200%' }}></div>
                  </div>
                  <p className="text-slate-800 font-bold text-[11px] uppercase tracking-wider">Scan to Share</p>
                </div>
              </div>
            </div>


            {/* Quick Actions */}
            <div className="bg-white rounded-[24px] p-5 border border-purple-100/50 shadow-sm">
              <h3 className="text-[15px] font-black text-slate-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleShare} className="bg-purple-50 hover:bg-purple-100 border border-purple-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                    <Users size={18} className="text-brand-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-brand-primary">Invite<br/>Friends</span>
                </button>
                <button onClick={() => navigate('/member/referral/redeem')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                    <Gift size={18} className="text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Redeem<br/>Points</span>
                </button>
                <button onClick={() => navigate('/member/referral/earnings')} className="bg-amber-50 hover:bg-amber-100 border border-amber-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-600">Rewards<br/>History</span>
                </button>
                <button onClick={() => alert('Your Earnings Report is being generated and will be sent to your registered email.')} className="bg-blue-50 hover:bg-blue-100 border border-blue-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                    <FileText size={18} className="text-blue-500" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-600">Earnings<br/>Report</span>
                </button>
              </div>
            </div>



            {/* Earnings Overview Chart */}
            <div className="bg-white rounded-[24px] p-5 border border-purple-100/50 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-[15px] font-black text-slate-800">Earnings Overview</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">₹1,250.00</h2>
                    <span className="text-emerald-600 text-[11px] font-bold bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                      +18% vs last month
                    </span>
                  </div>
                </div>
                <select className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-3 py-2.5 outline-none w-auto self-start sm:self-auto mt-2 sm:mt-0">
                  <option>This Month</option>
                  <option>Last 6 Months</option>
                  <option>This Year</option>
                </select>
              </div>
              
              <div className="h-40 w-full relative">
                {/* SVG Chart */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {/* Grid Lines */}
                  <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                  
                  {/* Line Chart */}
                  <polyline
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                  {/* Data Points */}
                  {earningsOverview.map((d, i) => {
                    const x = (i / (earningsOverview.length - 1)) * chartWidth;
                    const y = chartHeight - ((d.value / maxEarnings) * chartHeight * 0.8) - 10;
                    return (
                      <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#7C3AED" strokeWidth="2" />
                    );
                  })}
                </svg>
                {/* X Axis Labels */}
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-1">
                  {earningsOverview.map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-400">{d.month}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop only: Recent Activity & Top Earners Row */}
            <div className="hidden lg:grid grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-[24px] p-5 border border-purple-100/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-black text-slate-800">Recent Activity</h3>
                  <button onClick={() => navigate('/member/referral/earnings')} className="text-[11px] font-bold text-brand-primary hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {recentActivity.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <Avatar src={item.avatar} initials={item.name} size="md" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                            <Gift size={16} className="text-brand-primary" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{item.name}</h4>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.action}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-black text-emerald-500">+{item.points}</span>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Earners */}
              <div className="bg-white rounded-[24px] p-5 border border-purple-100/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-black text-slate-800">Top Earners</h3>
                  <button onClick={() => navigate('/member/referral/earnings')} className="text-[11px] font-bold text-brand-primary hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {topEarners.map((user, idx) => (
                    <div key={user.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {idx + 1}
                      </div>
                      <Avatar src={user.avatar} initials={user.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-800 truncate">{user.name}</h4>
                        <p className="text-[11px] font-medium text-slate-500">₹{user.points.toLocaleString()}</p>
                      </div>
                      {idx === 0 && <Trophy size={18} className="text-amber-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
          
          {/* Right Column (Badges, Actions, Mobile Activity) */}
          <div className="lg:col-span-4 space-y-4">
            

            {/* Promo Banner */}
            <div className="bg-gradient-to-br from-[#1E1B4B] to-[#3B0764] rounded-[24px] p-5 text-white relative overflow-hidden shadow-lg border border-purple-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 blur-2xl rounded-full"></div>
              <div className="relative z-10">
                <h3 className="text-lg font-black mb-2 leading-tight">More Referrals,<br/>More Rewards!</h3>
                <p className="text-purple-200 text-[12px] font-medium mb-5">Invite more friends and earn exciting rewards and cashback.</p>
                <button onClick={handleShare} className="w-full py-3 bg-white text-[#4C1D95] rounded-xl font-bold text-[13px] shadow-sm active:scale-95 transition-transform">
                  Invite Now
                </button>
              </div>
            </div>

            {/* Mobile Only: Recent Activity */}
            <div className="lg:hidden bg-white rounded-[24px] p-5 border border-purple-100/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-black text-slate-800">Recent Activity</h3>
                <button onClick={() => navigate('/member/referral/earnings')} className="text-[11px] font-bold text-brand-primary hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {recentActivity.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.avatar ? (
                        <Avatar src={item.avatar} initials={item.name} size="md" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                          <Gift size={16} className="text-brand-primary" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{item.name}</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] font-black text-emerald-500">+{item.points}</span>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboardPage;
