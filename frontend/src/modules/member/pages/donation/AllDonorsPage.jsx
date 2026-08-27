import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Heart, 
  Home, 
  GraduationCap, 
  BookOpen, 
  Award,
  Calendar,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import donationService from '../../../../core/api/donationService';
import { Avatar } from '../../components/common/Avatar';

export const AllDonorsPage = () => {
  const navigate = useNavigate();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    donationService.getAllDonors()
      .then(res => {
        if (isMounted && res && (res.status === 'success' || res.success)) {
          setDonors(res.data || []);
        }
      })
      .catch(err => {
        console.error('Failed to fetch all donors:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Filter by search query
  const filteredDonors = donors.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.name || '').toLowerCase().includes(q) ||
      (d.purpose || '').toLowerCase().includes(q) ||
      (d.paymentMode || '').toLowerCase().includes(q)
    );
  });

  // Calculate total community impact
  const totalAmount = donors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const handleDonorClick = (donor) => {
    let targetUserId = donor.userId;
    if (!targetUserId && donor.user && (donor.user._id || donor.user.id)) {
      targetUserId = donor.user._id || donor.user.id;
    }
    if (targetUserId) {
      navigate(`/member/directory/${targetUserId}`);
    } else {
      navigate('/member/directory');
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-20 relative">
      {/* ─── GLASSMORPHIC HEADER ─── */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.02)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-secondary/60 transition-all press-scale"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[15px] font-extrabold text-text-primary tracking-tight">Community Donors</h1>
            <p className="text-[10px] font-medium text-text-tertiary -mt-0.5">Recent contributions within your community</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/member/donation')}
          className="px-3 py-1.5 bg-[#FF2162] hover:bg-[#E0144C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 press-scale shadow-sm"
        >
          <Heart size={13} fill="currentColor" />
          <span>Donate</span>
        </button>
      </div>

      <div className="px-3 pt-4 space-y-4">
        {/* ─── SUMMARY IMPACT STATS ─── */}
        <div 
          className="rounded-[28px] p-4 relative overflow-hidden text-white"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #C026D3 100%)',
            boxShadow: '0 10px 25px -5px rgba(124,58,237,0.35)'
          }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-purple-200 tracking-wide uppercase">Total Community Contributions</p>
              <h2 className="text-2xl font-black mt-0.5">₹{totalAmount.toLocaleString('en-IN')}</h2>
              <p className="text-[10px] text-purple-200 mt-1 flex items-center gap-1">
                <UserCheck size={12} /> {donors.length} Total Donor Contributions
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Award size={24} className="text-amber-300" />
            </div>
          </div>
        </div>

        {/* ─── SEARCH INPUT ─── */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search donors by name or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-purple-100/40 text-xs font-semibold text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-[#7C3AED] shadow-sm transition-all"
          />
        </div>

        {/* ─── DONORS LIST ─── */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-[#FF2162] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-text-secondary">Loading community donors...</p>
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-[28px] border border-purple-100/40 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-3">
              <Heart size={24} className="text-[#FF2162]" fill="currentColor" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">No Donors Found</h3>
            <p className="text-xs text-text-tertiary mt-1 max-w-xs mx-auto">
              {searchQuery.trim() ? 'No donor matches your search filter.' : 'No donations recorded yet in your community. Be the first to contribute!'}
            </p>
            <button
              onClick={() => navigate('/member/donation')}
              className="mt-4 px-5 py-2.5 bg-[#FF2162] hover:bg-[#E0144C] text-white text-xs font-bold rounded-xl press-scale shadow-md flex items-center gap-1.5 mx-auto"
            >
              <span>Explore Donation Campaigns</span>
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDonors.map((donor, idx) => {
              const purposeStr = (donor.purpose || '').toLowerCase();
              let purposeIcon = <Home size={12} className="text-amber-500" />;
              let purposeBg = 'bg-amber-50 border-amber-100 text-amber-900';

              if (purposeStr.includes('schola') || purposeStr.includes('chhatra')) {
                purposeIcon = <GraduationCap size={12} className="text-purple-500" />;
                purposeBg = 'bg-purple-50 border-purple-100 text-purple-900';
              } else if (purposeStr.includes('gaushala') || purposeStr.includes('cow')) {
                purposeIcon = <span className="text-[11px] leading-none">🐄</span>;
                purposeBg = 'bg-orange-50 border-orange-100 text-orange-900';
              } else if (purposeStr.includes('vivah') || purposeStr.includes('marri')) {
                purposeIcon = <Heart size={11} className="text-rose-500" fill="currentColor" />;
                purposeBg = 'bg-rose-50 border-rose-100 text-rose-900';
              } else if (purposeStr.includes('shiksha') || purposeStr.includes('edu')) {
                purposeIcon = <BookOpen size={12} className="text-blue-500" />;
                purposeBg = 'bg-blue-50 border-blue-100 text-blue-900';
              }

              const campaignTitle = donor.purpose || 'General Samaj Fund';

              return (
                <div
                  key={donor.id || idx}
                  onClick={() => handleDonorClick(donor)}
                  className="group/donor bg-white rounded-2xl p-3.5 border border-purple-100/50 hover:border-purple-300 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {donor.avatar ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-100 p-0.5 group-hover/donor:border-[#FF2162]/50 transition-colors">
                          <img src={donor.avatar} alt={donor.name} className="w-full h-full object-cover rounded-full group-hover/donor:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {donor.initials || 'A'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                        #{idx + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-text-primary group-hover/donor:text-[#FF2162] truncate transition-colors">
                          {donor.name}
                        </h4>
                        <span className="text-[9px] font-bold text-purple-600/75 opacity-0 group-hover/donor:opacity-100 transition-opacity flex items-center shrink-0">
                          Profile <ChevronRight size={10} strokeWidth={3} />
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${purposeBg}`}>
                          {purposeIcon}
                          <span className="truncate max-w-[220px]">{campaignTitle}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-600">₹{Number(donor.amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] font-medium text-text-tertiary mt-0.5 flex items-center justify-end gap-1">
                      <Calendar size={10} /> {donor.date || 'Recent'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Bottom Button to jump to Donation Section */}
            <div className="pt-3">
              <button
                onClick={() => navigate('/member/donation')}
                className="w-full py-3 bg-[#FF2162] hover:bg-[#E0144C] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 press-scale shadow-md"
              >
                <Heart size={15} fill="currentColor" />
                <span>Go to Donation Campaigns</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDonorsPage;
