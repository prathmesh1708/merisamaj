import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Heart, 
  Home, 
  GraduationCap, 
  Award,
  Calendar,
  UserCheck,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  X,
  Stethoscope,
  Building2
} from 'lucide-react';
import donationService from '../../../../core/api/donationService';

// Category definitions with styling and matching rules
const DONATION_TYPES = [
  { id: 'all', label: 'All Types', labelHi: 'सभी प्रकार', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'education', label: 'Education & Scholarship', labelHi: 'शिक्षा व छात्रवृत्ति', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'dharmashala', label: 'Temple & Dharmashala', labelHi: 'मंदिर / धर्मशाला निर्माण', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'gaushala', label: 'Gaushala Seva', labelHi: 'गौशाला सेवा', icon: () => <span className="text-[13px] leading-none">🐄</span>, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'vivah', label: 'Samuhik Vivah', labelHi: 'सामूहिक विवाह', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'medical', label: 'Medical Relief', labelHi: 'चिकित्सा सहायता', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'general', label: 'General Samaj Fund', labelHi: 'सामान्य समाज कोष', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' }
];

// Helper to determine category of a purpose string
const detectDonationType = (purposeStr = '') => {
  const p = (purposeStr || '').toLowerCase();
  if (p.includes('schola') || p.includes('chhatra') || p.includes('shiksha') || p.includes('edu') || p.includes('book') || p.includes('student')) {
    return 'education';
  }
  if (p.includes('dharmashala') || p.includes('mandir') || p.includes('temple') || p.includes('hall') || p.includes('bhavan') || p.includes('renovat') || p.includes('nirman')) {
    return 'dharmashala';
  }
  if (p.includes('gaushala') || p.includes('cow') || p.includes('fodder') || p.includes('gau')) {
    return 'gaushala';
  }
  if (p.includes('vivah') || p.includes('marri') || p.includes('kanya') || p.includes('uphar') || p.includes('sammelan')) {
    return 'vivah';
  }
  if (p.includes('medic') || p.includes('health') || p.includes('dialysis') || p.includes('chikitsa') || p.includes('hospital') || p.includes('aid')) {
    return 'medical';
  }
  return 'general';
};

export const AllDonorsPage = () => {
  const navigate = useNavigate();
  // Real, community-scoped donors only — populated from the API. No mock/placeholder
  // fallback: showing fake names here would leak "donors" that don't belong to the
  // viewer's community, which breaks the strict community-wise filtering rule.
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortOption, setSortOption] = useState('recent'); // 'recent' | 'amount_desc' | 'top_10k'

  useEffect(() => {
    let isMounted = true;
    donationService.getAllDonors()
      .then(res => {
        if (isMounted && res && (res.status === 'success' || res.success) && Array.isArray(res.data)) {
          setDonors(res.data);
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

  // Filter & Sort Logic
  const filteredDonors = useMemo(() => {
    let result = [...donors];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d => 
        (d.name || '').toLowerCase().includes(q) ||
        (d.purpose || '').toLowerCase().includes(q) ||
        (d.paymentMode || '').toLowerCase().includes(q) ||
        String(d.amount || '').includes(q)
      );
    }

    // 2. Donation Type Filter
    if (selectedType !== 'all') {
      result = result.filter(d => {
        const itemType = d.type || detectDonationType(d.purpose);
        return itemType === selectedType;
      });
    }

    // 3. Quick Tier & Sort Filter
    if (sortOption === 'top_10k') {
      result = result.filter(d => Number(d.amount || 0) >= 10000);
      result.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    } else if (sortOption === 'amount_desc') {
      result.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    } else {
      // Recent (default)
      result.sort((a, b) => new Date(b.rawDate || b.date) - new Date(a.rawDate || a.date));
    }

    return result;
  }, [donors, searchQuery, selectedType, sortOption]);

  // Compute category counts for badges
  const categoryCounts = useMemo(() => {
    const counts = { all: donors.length };
    DONATION_TYPES.forEach(t => {
      if (t.id !== 'all') {
        counts[t.id] = donors.filter(d => (d.type || detectDonationType(d.purpose)) === t.id).length;
      }
    });
    return counts;
  }, [donors]);

  // Calculate filtered impact statistics
  const filteredTotalAmount = filteredDonors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalAllAmount = donors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

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

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSortOption('recent');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/member/donation');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 relative">
      {/* ─── GLASSMORPHIC HEADER ─── */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleBack} 
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 cursor-pointer relative z-10"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 tracking-tight">Community Donors</h1>
            <p className="text-[10px] font-semibold text-slate-400 -mt-0.5">Verified contributions & seva records</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/member/donation')}
          className="px-3.5 py-1.5 bg-[#FF2162] hover:bg-[#E0144C] text-white text-xs font-black rounded-xl flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-500/20 transition-all"
        >
          <Heart size={13} fill="currentColor" />
          <span>Contribute</span>
        </button>
      </div>

      <div className="px-3.5 pt-3.5 space-y-3.5 max-w-2xl mx-auto">
        {/* ─── SUMMARY IMPACT STATS ─── */}
        <div 
          className="rounded-[24px] p-4.5 relative overflow-hidden text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #C026D3 100%)',
            boxShadow: '0 10px 25px -5px rgba(124,58,237,0.3)'
          }}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-purple-200 tracking-wider uppercase">
                {selectedType !== 'all' || sortOption !== 'recent' || searchQuery.trim()
                  ? 'Filtered Contributions Impact'
                  : 'Total Community Contributions'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight">
                ₹{filteredTotalAmount.toLocaleString('en-IN')}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-semibold text-purple-200">
                <span className="flex items-center gap-1 bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                  <UserCheck size={11} /> {filteredDonors.length} Donors
                </span>
                {(selectedType !== 'all' || sortOption !== 'recent' || searchQuery.trim()) && (
                  <span className="text-purple-300">
                    (of ₹{totalAllAmount.toLocaleString('en-IN')} total)
                  </span>
                )}
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shrink-0 shadow-inner">
              <Award size={26} className="text-amber-300 drop-shadow-sm" />
            </div>
          </div>
        </div>

        {/* ─── SEARCH INPUT ─── */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search donors by name, purpose, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 shadow-xs transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ─── DONATION TYPE FILTER CHIPS (HORIZONTAL SCROLL) ─── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal size={10} className="text-purple-600" />
              Filter By Donation Type
            </span>
            {(selectedType !== 'all' || sortOption !== 'recent' || searchQuery.trim()) && (
              <button 
                onClick={clearAllFilters}
                className="text-[10px] font-black text-purple-600 hover:text-purple-700 underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-1 px-1">
            {DONATION_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              const IconComp = type.icon;
              const count = categoryCounts[type.id] || 0;

              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all active:scale-95 border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <IconComp size={13} className={isSelected ? 'text-white' : type.color} />
                  <span>{type.label}</span>
                  <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── QUICK SORT / TIER BAR ─── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[10.5px]">
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider pl-0.5 shrink-0">Sort:</span>
          
          <button
            onClick={() => setSortOption('recent')}
            className={`px-2.5 py-1 rounded-lg font-extrabold border transition-all active:scale-95 shrink-0 ${
              sortOption === 'recent'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            📅 Recent First
          </button>

          <button
            onClick={() => setSortOption('amount_desc')}
            className={`px-2.5 py-1 rounded-lg font-extrabold border transition-all active:scale-95 shrink-0 ${
              sortOption === 'amount_desc'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            💰 Highest Amount
          </button>

          <button
            onClick={() => setSortOption('top_10k')}
            className={`px-2.5 py-1 rounded-lg font-extrabold border transition-all active:scale-95 shrink-0 ${
              sortOption === 'top_10k'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300'
            }`}
          >
            ⭐ Top Donors (₹10,000+)
          </button>
        </div>

        {/* ─── DONORS LIST ─── */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs font-bold text-slate-500">Loading community donors...</p>
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-[24px] border border-slate-200 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-3">
              <Heart size={24} className="text-[#FF2162]" fill="currentColor" />
            </div>
            <h3 className="text-sm font-black text-slate-800">No Donors Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-medium">
              {searchQuery.trim() || selectedType !== 'all' || sortOption !== 'recent'
                ? 'No donor matches your active filter criteria.'
                : 'No donations recorded yet in your community. Be the first to contribute!'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(searchQuery.trim() || selectedType !== 'all' || sortOption !== 'recent') && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => navigate('/member/donation')}
                className="px-4 py-2 bg-[#FF2162] hover:bg-[#E0144C] text-white text-xs font-bold rounded-xl active:scale-95 shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>Donate Now</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDonors.map((donor, idx) => {
              const detectedCat = donor.type || detectDonationType(donor.purpose);
              const catConfig = DONATION_TYPES.find(t => t.id === detectedCat) || DONATION_TYPES[DONATION_TYPES.length - 1];
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={donor.id || idx}
                  onClick={() => handleDonorClick(donor)}
                  className="group bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-100 hover:border-purple-300 shadow-xs hover:shadow-md flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {donor.avatar ? (
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 p-0.5 group-hover:border-purple-400 transition-colors shadow-2xs">
                          <img 
                            src={donor.avatar} 
                            alt={donor.name} 
                            className="w-full h-full object-cover rounded-[10px] group-hover:scale-105 transition-transform" 
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                          {donor.initials || 'A'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                        #{idx + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-[13px] font-black text-slate-800 group-hover:text-purple-600 truncate transition-colors">
                          {donor.name}
                        </h4>
                        <span className="text-[9px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                          Profile <ChevronRight size={9} strokeWidth={3} />
                        </span>
                      </div>

                      {/* Purpose Badge & Payment Mode */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9.5px] font-bold ${catConfig.bg} ${catConfig.border} ${catConfig.color}`}>
                          <CatIcon size={10} className="shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">{donor.purpose || 'General Samaj Fund'}</span>
                        </span>
                        {donor.paymentMode && (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 hidden xs:inline-block">
                            {donor.paymentMode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Date */}
                  <div className="text-right shrink-0">
                    <p className="text-[14px] sm:text-base font-black text-emerald-600">
                      ₹{Number(donor.amount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[9.5px] font-semibold text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                      <Calendar size={9} /> {donor.date || 'Recent'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── STICKY FLOATING DONATE ACTION BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3.5 bg-gradient-to-t from-white via-white/95 to-white/0 backdrop-blur-md border-t border-slate-100/80 shadow-[0_-8px_25px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/member/donation')}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF2162] to-[#FF0055] hover:from-[#E0144C] hover:to-[#E00045] text-white text-xs sm:text-[13px] font-black rounded-2xl flex items-center justify-center gap-2 active:scale-98 shadow-lg shadow-rose-500/25 transition-all"
          >
            <Heart size={16} fill="currentColor" />
            <span>Explore Active Campaigns & Donate</span>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllDonorsPage;
