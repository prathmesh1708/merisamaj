import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, Crown, ChevronRight, MapPin,
  Users, Building, Building2, Globe, Home, Landmark, MessageSquare, Loader
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataProvider';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

// ─── ROLE HELPERS ─────────────────────────────────────────────────────────────
const getHindiRole = (role) => {
  if (!role) return 'पदाधिकारी';
  if (role === 'President' || role === 'Community Head') return 'अध्यक्ष';
  if (role === 'Patron') return 'संरक्षक';
  if (role === 'Vice President') return 'उपाध्यक्ष';
  if (role === 'Secretary') return 'सचिव';
  if (role === 'General Secretary') return 'महासचिव';
  if (role === 'Joint Secretary') return 'संयुक्त सचिव';
  if (role === 'Treasurer') return 'कोषाध्यक्ष';
  if (role === 'Women Cell Incharge') return 'महिला प्रकोष्ठ';
  if (role.startsWith('Minister')) {
    const match = role.match(/\(([^)]+)\)/);
    const category = match ? match[1] : '';
    let catHi = category;
    if (category === 'Education') catHi = 'शिक्षा';
    if (category === 'Youth') catHi = 'युवा';
    if (category === 'Women Welfare') catHi = 'महिला कल्याण';
    if (category === 'Social') catHi = 'सामाजिक';
    return `मंत्री (${catHi})`;
  }
  if (role === 'Zonal Head') return 'क्षेत्रीय प्रभारी';
  if (role === 'Area Sub-Head') return 'क्षेत्रीय प्रतिनिधि';
  return role;
};

const getEnglishRole = (role) => {
  if (!role) return 'Officer';
  if (role === 'President' || role === 'Community Head') return 'President';
  if (role === 'Community Head (President)') return 'President';
  return role;
};

const getBadgeColor = (role) => {
  if (role === 'President' || role === 'Community Head') return 'bg-[#f08c35]';
  if (role === 'Patron') return 'bg-amber-600';
  if (role === 'Vice President') return 'bg-[#7c3aed]';
  if (role === 'Secretary' || role === 'General Secretary') return 'bg-[#ff3b68]';
  if (role === 'Joint Secretary') return 'bg-[#ff3b68]';
  if (role === 'Treasurer') return 'bg-[#00a651]';
  if (role === 'Women Cell Incharge') return 'bg-[#e91e8c]';
  return 'bg-[#ff3b68]';
};

const MISSION_PILLARS = [
  { icon: Building, labelHi: 'शिक्षा', labelEn: 'Education', desc: 'ज्ञान और विकास', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: Globe, labelHi: 'सेवा', labelEn: 'Service', desc: 'समाज की सेवा', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { icon: Landmark, labelHi: 'विकास', labelEn: 'Development', desc: 'सतत प्रगति', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: Users, labelHi: 'एकता', labelEn: 'Unity', desc: 'एक समाज, एक लक्ष्य', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
];

// ─── HERO BANNER ──────────────────────────────────────────────────────────────
const LeaderHeroBanner = ({ leader, city, onBack, navigate, hideHeader = false, activeCityDetail }) => {
  if (!leader) return null;

  const rawDesignation = leader.designation || leader.role;
  const designation = (!rawDesignation || rawDesignation.toLowerCase() === 'member') ? 'Community Head' : rawDesignation;
  const isPresident = designation === 'President' || designation === 'Community Head' || designation === 'Community Head (President)';
  const isPatron = designation === 'Patron';

  const roleDisplay = isPresident ? 'COMMUNITY HEAD (PRESIDENT)' : isPatron ? 'PATRON' : designation.toUpperCase();

  const cityHindiMap = {
    'Indore': 'इंदौर',
    'Bhopal': 'भोपाल',
    'Ujjain': 'उज्जैन',
    'Gwalior': 'ग्वालियर',
    'Jabalpur': 'जबलपुर',
    'Jaipur': 'जयपुर'
  };
  const cityHindi = city ? (cityHindiMap[city] || city) : '';
  const title = city ? `${cityHindi} शहर` : 'समाज नेतृत्व';
  const subtitle = city ? `${city.toUpperCase()} CITY LEADERSHIP` : 'हमारा नेतृत्व, हमारा गौरव';

  const defaultLeaderPhoto = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80';
  const avatarUrl = (leader.avatar && !leader.avatar.includes('ui-avatars.com')) 
    ? leader.avatar 
    : defaultLeaderPhoto;

  return (
    <div className={`relative overflow-hidden ${city ? 'rounded-[28px]' : ''}`} style={{ background: 'linear-gradient(135deg, #120b32 0%, #1e1145 50%, #2e1a6c 100%)' }}>
      <div className="relative z-10 px-4 pt-6 pb-5">
        
        {/* Header Row */}
        {!hideHeader && (
          <div className="flex items-center gap-3 mb-5 pt-2">
            {onBack && (
              <button onClick={onBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            )}
            <div>
              <h1 className="text-white text-[20px] font-black tracking-tight">{title}</h1>
              <p className="text-purple-200/70 text-[11px] font-semibold mt-0.5">{subtitle}</p>
            </div>
          </div>
        )}

        {/* Hero Card Layout */}
        <div 
          onClick={() => navigate(`/member/directory/${leader._id || leader.id}`, { state: { fromCity: activeCityDetail } })}
          className="relative w-full rounded-[24px] bg-gradient-to-r from-[#1e1145] via-[#2d1b69] to-[#4C1D95] shadow-xl shadow-purple-500/10 border border-purple-400/10 overflow-hidden py-9 px-5 shrink-0 cursor-pointer active:scale-[0.99] transition-all duration-300"
        >
          {/* Dark overlay backdrop */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e1145] via-[#2d1b69]/70 via-[#2d1b69]/15 to-transparent pointer-events-none z-0" />

          {/* Blended portrait */}
          <img 
            src={avatarUrl} 
            className="absolute right-0 top-0 bottom-0 w-[55%] h-full object-cover object-[center_30%] pointer-events-none z-10" 
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 15%, black 45%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 15%, black 45%)'
            }}
            alt={leader.name} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultLeaderPhoto;
            }}
          />

          {/* Left content */}
          <div className="relative z-20 flex flex-col justify-between h-full max-w-[55%]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400/60 flex items-center justify-center bg-black/20 shadow-sm shrink-0">
                <Crown size={14} className="text-amber-400 fill-amber-400" />
              </div>
              <span className="bg-purple-500/80 backdrop-blur-sm text-white text-[7px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider border border-purple-400/30 leading-none">
                {roleDisplay}
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-white text-[16px] font-black leading-tight tracking-tight drop-shadow-sm">
                {leader.name}
              </h4>
              {(() => {
                const loc = [leader.city, leader.state].filter(Boolean).join(', ');
                const term = leader.termYears ? `Term: ${leader.termYears}` : '';
                const meta = [loc, term].filter(Boolean).join(' • ');
                return meta ? (
                  <p className="text-purple-200/90 text-[11px] font-bold mt-1.5">
                    {meta}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MEMBER SLIDER CARD UI (matches HomePage core member card style) ─────────
const MemberSliderCard = ({ member, navigate, activeCityDetail }) => {
  const rawRole = member.designation || member.role;
  const badgeColor = getBadgeColor(rawRole);
  const displayRole = rawRole && rawRole !== 'user' ? rawRole : 'Executive Member';
  const avatarUrl = member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C3BFF&color=ffffff&bold=true`;

  return (
    <div 
      onClick={() => navigate(`/member/directory/${member._id || member.id}`, { state: { fromCity: activeCityDetail } })}
      className="shrink-0 w-[calc((100vw-56px)/3.1)] max-w-[130px] bg-white rounded-3xl flex flex-col items-center cursor-pointer transition-all duration-300 pb-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-purple-50 hover:border-purple-200 overflow-hidden"
    >
      {/* Full Width Portrait Photo */}
      <div className="w-full aspect-[4/3.8] overflow-hidden bg-gray-50 shrink-0 mb-1.5 pointer-events-none rounded-t-3xl">
        <img src={avatarUrl} className="w-full h-full object-cover" alt={member.name} />
      </div>
      
      {/* Role Badge - below photo */}
      <span className={`text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-md shadow-sm leading-none mb-1.5 shrink-0 ${badgeColor}`}>
        {displayRole}
      </span>
      
      {/* Name */}
      <h4 className="text-slate-900 text-[9.5px] font-extrabold text-center leading-tight mb-2 px-1 h-5 flex items-center justify-center truncate w-full">
        {member.name}
      </h4>
      
      {/* Interactive Buttons: Call & Chat */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <a 
          href={`tel:${member.phone || ''}`}
          className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
        >
          <Phone size={10} />
        </a>
        <button 
          onClick={() => navigate(`/member/chat/member/${member._id || member.id}`)}
          className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
        >
          <MessageCircle size={10} />
        </button>
      </div>
    </div>
  );
};

// ─── CABINET MEMBER CARD ──────────────────────────────────────────────────────
const CabinetMemberCard = ({ member, navigate, activeCityDetail }) => {
  const rawRole = member.designation || member.role;
  const badgeColor = getBadgeColor(rawRole);
  const hindiRole = getHindiRole(rawRole);
  const avatarUrl = member.avatar || `https://i.pravatar.cc/150?u=${member.initials || member.name}`;

  return (
    <div 
      onClick={() => navigate(`/member/directory/${member._id || member.id}`, { state: { fromCity: activeCityDetail } })}
      className="bg-white rounded-3xl p-3.5 border border-purple-100/55 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 cursor-pointer hover:border-purple-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-purple-100/50 shadow-sm">
          <img src={avatarUrl} className="w-full h-full object-cover" alt={member.name} />
        </div>
        <div className="min-w-0">
          <span className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded-md leading-none ${badgeColor}`}>
            {hindiRole}
          </span>
          <h4 className="text-[12px] font-black text-slate-800 truncate mt-0.5 leading-tight">{member.name}</h4>
          {(() => {
            const subMeta = [member.city, member.department].filter(Boolean).join(' • ');
            return subMeta ? (
              <p className="text-[9.5px] text-slate-400 font-semibold truncate">{subMeta}</p>
            ) : null;
          })()}
        </div>
      </div>
      
      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center gap-1.5">
        <a href={`tel:${member.phone}`}
          className="w-7 h-7 rounded-lg border border-purple-100 flex items-center justify-center text-[#6C3BFF] hover:bg-purple-50 active:scale-95 transition-all"
          style={{ background: 'rgba(108,59,255,0.04)' }}>
          <Phone size={11} />
        </a>
        <a href={`https://wa.me/${(member.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg border border-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all"
          style={{ background: 'rgba(16,185,129,0.04)' }}>
          <MessageCircle size={11} className="text-emerald-500" />
        </a>
      </div>
    </div>
  );
};

// ─── CITY CARD ────────────────────────────────────────────────────────────────
const CityCard = ({ data, onClick }) => {
  const { nameHi, nameEn, icon: Icon, bg, count = 0 } = data;
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }} 
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl p-4.5 border border-purple-100/50 shadow-[0_4px_16px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-[0_8px_24px_rgba(108,59,255,0.06)] transition-all flex items-center justify-between gap-4"
    >
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon size={22} color="#fff" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-[12.5px] font-black text-slate-800 truncate leading-tight">{nameHi}</h4>
        <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{nameEn} City ({count} Leaders)</p>
      </div>

      <ChevronRight size={16} className="text-slate-400 shrink-0" />
    </motion.div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ stat }) => {
  const Icon = stat.icon;
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white rounded-3xl p-4 border border-purple-100/50 shadow-sm text-center"
    >
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
        <Icon size={20} />
      </div>
      <p className="text-lg font-black text-slate-900">{stat.value.toLocaleString()}{stat.suffix}</p>
      <p className="text-[11px] font-black text-slate-700 mt-1">{stat.labelHi}</p>
      <p className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{stat.labelEn}</p>
    </motion.div>
  );
};

// ─── MISSION SECTION ──────────────────────────────────────────────────────────
const MissionSection = () => (
  <div className="rounded-[28px] overflow-hidden relative"
    style={{ 
      background: 'linear-gradient(135deg, #0e072b 0%, #170d3e 60%, #221258 100%)', 
      border: '1.5px solid rgba(124,58,237,0.25)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
    }}>
    <div className="px-5 py-5.5 relative z-10">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-purple-200/80 text-[9px] font-black uppercase tracking-widest">हमारा लक्ष्य और विचार</p>
      </div>
      <h3 className="text-white text-[13.5px] font-black leading-snug mb-4">शिक्षा, सेवा, विकास और एकता को बढ़ावा देकर समाज को एक सूत्र में बांधना।</h3>
      
      <div className="grid grid-cols-2 gap-2.5">
        {MISSION_PILLARS.map(({ icon: Icon, labelHi, labelEn, desc, color, bg }) => (
          <div key={labelHi} className={`rounded-2xl p-3 border backdrop-blur-md transition-transform hover:scale-[1.02] duration-200 ${bg}`}
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={`${color} shrink-0`} />
              <p className="text-white text-[11px] font-black leading-none">{labelHi}</p>
            </div>
            <p className="text-purple-200/50 text-[8px] font-bold uppercase tracking-wider">{labelEn}</p>
            <p className="text-purple-200/40 text-[8px] mt-1.5 leading-snug">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ titleHi, subtitleEn, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-start gap-2">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#6C3BFF] to-[#8B5CFF] mt-0.5 shrink-0" />
      <div>
        <h3 className="text-[15.5px] font-black text-slate-800 tracking-tight leading-none">{titleHi}</h3>
        {subtitleEn && <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider mt-1">{subtitleEn}</p>}
      </div>
    </div>
    {action && (
      <button onClick={action.onClick}
        className="text-[9px] font-black uppercase tracking-wider text-[#6C3BFF] bg-purple-50/80 px-3 py-1 rounded-lg border border-purple-100 flex items-center gap-0.5 active:scale-95 transition-all shadow-sm shadow-purple-500/5"
      >
        {action.label} <ChevronRight size={11} strokeWidth={3} />
      </button>
    )}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const LeadershipPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useData();

  const [activeCityDetail, setActiveCityDetail] = useState(
    location.state?.activeCityDetail || null
  );
  const [showAllCities, setShowAllCities] = useState(false);

  // LIVE MONGO DB DATA STATES
  const [loading, setLoading] = useState(true);
  const [communityHead, setCommunityHead] = useState(null);
  const [subLeaders, setSubLeaders] = useState([]);
  const [liveStats, setLiveStats] = useState({
    totalMembers: 0,
    totalStates: 0,
    totalDistricts: 0,
    totalVillageUnits: 0
  });

  // Sliders refs
  const cityLeadersSliderRef = useRef(null);
  const userCitySliderRef = useRef(null);
  const detailCitySliderRef = useRef(null);

  const scrollSlider = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 130, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLeadership = async () => {
      try {
        setLoading(true);
        const res = await axiosPrivate.get('/member/leadership');
        if (isMounted && res.data?.success && res.data?.data) {
          setCommunityHead(res.data.data.communityHead);
          setSubLeaders(res.data.data.subLeaders || []);
          if (res.data.data.stats) {
            setLiveStats(res.data.data.stats);
          }
        }
      } catch (err) {
        console.error("Failed to load live leadership payload:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLeadership();
    return () => { isMounted = false; };
  }, []);

  const userCity = currentUser?.city || 'Indore';

  // Group sub-leaders dynamically by city
  const leadersByCity = {};
  subLeaders.forEach(sl => {
    const c = sl.city || 'Indore';
    if (!leadersByCity[c]) leadersByCity[c] = [];
    leadersByCity[c].push(sl);
  });

  // Extract list of cities dynamically from live payload
  const citiesList = [
    { id: 'indore', nameHi: 'इंदौर नगर समिति', nameEn: 'Indore', icon: Building2, bg: 'bg-[#6C3BFF]', count: (leadersByCity['Indore'] || []).length },
    { id: 'bhopal', nameHi: 'भोपाल नगर समिति', nameEn: 'Bhopal', icon: Landmark, bg: 'bg-[#ff9f43]', count: (leadersByCity['Bhopal'] || []).length },
    { id: 'ujjain', nameHi: 'उज्जैन नगर समिति', nameEn: 'Ujjain', icon: Home, bg: 'bg-[#ff5252]', count: (leadersByCity['Ujjain'] || []).length },
    { id: 'gwalior', nameHi: 'ग्वालियर नगर समिति', nameEn: 'Gwalior', icon: Building, bg: 'bg-[#3380ff]', count: (leadersByCity['Gwalior'] || []).length },
    { id: 'jabalpur', nameHi: 'जबलपुर नगर समिति', nameEn: 'Jabalpur', icon: Globe, bg: 'bg-[#00a680]', count: (leadersByCity['Jabalpur'] || []).length },
    { id: 'jaipur', nameHi: 'जयपुर नगर समिति', nameEn: 'Jaipur', icon: Users, bg: 'bg-[#10b981]', count: (leadersByCity['Jaipur'] || []).length }
  ];

  const visibleCities = showAllCities ? citiesList : citiesList.slice(0, 4);

  const userCityMembers = leadersByCity[userCity] || subLeaders.slice(0, 5);

  const handleBackToMain = () => {
    setActiveCityDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // If viewing a specific city details view
  if (activeCityDetail) {
    const cityMembers = leadersByCity[activeCityDetail] || [];

    return (
      <div className="min-h-screen pb-28" style={{ backgroundColor: '#F8F7FF' }}>
        <LeaderHeroBanner leader={communityHead} city={activeCityDetail} onBack={handleBackToMain} navigate={navigate} hideHeader={false} activeCityDetail={activeCityDetail} />

        <div className="px-4 pt-5 max-w-5xl mx-auto space-y-6">
          
          {/* City Office Bearers Slider */}
          {cityMembers.length > 0 && (
            <div>
              <SectionHeader 
                titleHi={`${activeCityDetail} कार्यकारिणी`} 
                subtitleEn={`${activeCityDetail} Office Bearers`} 
              />
              <div className="relative">
                <div 
                  ref={detailCitySliderRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
                >
                  {cityMembers.map(m => (
                    <MemberSliderCard key={m._id} member={m} navigate={navigate} activeCityDetail={activeCityDetail} />
                  ))}
                </div>
                {cityMembers.length > 3 && (
                  <button 
                    onClick={() => scrollSlider(detailCitySliderRef)}
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#6C3BFF] hover:border-purple-200 active:scale-90 transition-all z-20"
                  >
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* City Scoped Sub Leaders Grid */}
          {cityMembers.length > 0 && (
            <div>
              <SectionHeader titleHi="मंत्रिमंडल एवं टीम" subtitleEn="Cabinet & Committee Members" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cityMembers.map(m => (
                  <CabinetMemberCard key={m._id} member={m} navigate={navigate} activeCityDetail={activeCityDetail} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-4">
            <div className="h-px bg-gradient-to-r from-transparent via-purple-200/40 to-transparent mb-4" />
            <p className="text-[10px] text-gray-400">{currentUser?.community || 'Samaj Directory'} · {activeCityDetail}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#F8F7FF' }}>

      {/* 1. Main Leader Hero Banner (Top Community Head) */}
      <LeaderHeroBanner leader={communityHead} city={null} onBack={() => navigate(-1)} navigate={navigate} hideHeader={false} activeCityDetail={activeCityDetail} />

      {/* MAIN CONTENT */}
      <div className="px-4 pt-5 max-w-5xl mx-auto space-y-7">

        {/* 2. Executive Officers Slider */}
        {subLeaders.length > 0 && (
          <div>
            <SectionHeader titleHi="कार्यकारिणी सदस्य" subtitleEn="Executive Officers" />
            <div className="relative">
              <div 
                ref={cityLeadersSliderRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
              >
                {subLeaders.map(m => (
                  <MemberSliderCard key={m._id} member={m} navigate={navigate} activeCityDetail={activeCityDetail} />
                ))}
              </div>
              {subLeaders.length > 3 && (
                <button 
                  onClick={() => scrollSlider(cityLeadersSliderRef)}
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#6C3BFF] hover:border-purple-200 active:scale-90 transition-all z-20"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Your City Leader Section */}
        <div className="space-y-4">
          <LeaderHeroBanner leader={communityHead} city={userCity} navigate={navigate} hideHeader={false} activeCityDetail={activeCityDetail} />
          
          {userCityMembers.length > 0 && (
            <div className="relative">
              <div 
                ref={userCitySliderRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
              >
                {userCityMembers.map(m => (
                  <MemberSliderCard key={m._id} member={m} navigate={navigate} activeCityDetail={activeCityDetail} />
                ))}
              </div>
              {userCityMembers.length > 3 && (
                <button 
                  onClick={() => scrollSlider(userCitySliderRef)}
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#6C3BFF] hover:border-purple-200 active:scale-90 transition-all z-20"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Our Organization Section */}
        <div>
          <SectionHeader 
            titleHi="हमारा संगठन" 
            subtitleEn="समाज की एक मजबूत संरचना" 
            action={{ 
              label: showAllCities ? "कम देखें" : "सभी देखें", 
              onClick: () => setShowAllCities(!showAllCities) 
            }} 
          />
          <div className="flex flex-col gap-3">
            {visibleCities.map((data) => (
              <CityCard 
                key={data.id} 
                data={data} 
                onClick={() => {
                  setActiveCityDetail(data.nameEn);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />
            ))}
          </div>
        </div>

        {/* Community Strength (Stats) */}
        <div>
          <SectionHeader titleHi="समाज की ताकत" subtitleEn="Community Strength" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard stat={{ id: 'members', labelHi: 'कुल सदस्य', labelEn: 'Total Members', value: liveStats.totalMembers || 1, suffix: '', icon: Users, color: 'from-purple-500 to-violet-600' }} />
            <StatCard stat={{ id: 'states', labelHi: 'राज्य', labelEn: 'States', value: liveStats.totalStates || 1, suffix: '', icon: Globe, color: 'from-orange-500 to-amber-600' }} />
            <StatCard stat={{ id: 'districts', labelHi: 'जिले', labelEn: 'Districts', value: liveStats.totalDistricts || 1, suffix: '', icon: Landmark, color: 'from-blue-500 to-cyan-600' }} />
            <StatCard stat={{ id: 'units', labelHi: 'ग्राम इकाइयाँ', labelEn: 'Village Units', value: liveStats.totalVillageUnits || 1, suffix: '', icon: Home, color: 'from-emerald-500 to-teal-600' }} />
          </div>
        </div>

        {/* Mission */}
        <MissionSection />

        {/* Footer */}
        <div className="text-center py-4">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-200/40 to-transparent mb-4" />
          <p className="text-[10px] text-gray-400">{currentUser?.community || 'Samaj Directory'} · {userCity}</p>
        </div>
      </div>
    </div>
  );
};

export default LeadershipPage;

