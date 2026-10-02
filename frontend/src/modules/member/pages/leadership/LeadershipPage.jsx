import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, Crown, ChevronRight, ChevronDown, MapPin,
  Users, Globe, Landmark, Home, Loader, Search
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

// ─── ROLE BADGE COLOR ─────────────────────────────────────────────────────────
const getBadgeColor = (role) => {
  if (role === 'President' || role === 'Community Head' || role === 'Local Head') return 'bg-[#f08c35]';
  if (role === 'Patron') return 'bg-amber-600';
  if (role === 'Vice President') return 'bg-[#7c3aed]';
  if (role === 'Secretary' || role === 'General Secretary') return 'bg-[#ff3b68]';
  if (role === 'Joint Secretary') return 'bg-[#ff3b68]';
  if (role === 'Treasurer') return 'bg-[#00a651]';
  if (role === 'Women Cell Incharge') return 'bg-[#e91e8c]';
  return 'bg-[#6C3BFF]';
};

const MISSION_PILLARS = [
  { icon: Landmark, labelHi: 'शिक्षा', labelEn: 'Education', desc: 'ज्ञान और विकास', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: Globe, labelHi: 'सेवा', labelEn: 'Service', desc: 'समाज की सेवा', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { icon: Landmark, labelHi: 'विकास', labelEn: 'Development', desc: 'सतत प्रगति', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: Users, labelHi: 'एकता', labelEn: 'Unity', desc: 'एक समाज, एक लक्ष्य', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
];

// ─── GROUP HEAD BANNER (Community Head / Local Head hero card) ───────────────
const GroupHeadBanner = ({ head, navigate }) => {
  const designation = head.designation || head.role || 'Community Head';
  const defaultPhoto = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80';
  const avatarUrl = (head.avatar && !head.avatar.includes('ui-avatars.com')) ? head.avatar : defaultPhoto;
  const locationText = [head.city, head.state].filter(Boolean).join(', ');
  const targetId = head._id || head.id;

  return (
    <div
      onClick={() => navigate(`/member/directory/${targetId}`)}
      className="relative w-full rounded-[24px] overflow-hidden shadow-xl shadow-sky-500/10 border border-sky-200 cursor-pointer active:scale-[0.99] transition-all duration-300 min-h-[172px]"
      style={{ background: '#FFFFFF' }}
    >
      <img
        src={avatarUrl}
        className="absolute right-0 top-0 bottom-0 w-[58%] h-full object-cover object-[center_20%] pointer-events-none z-0"
        alt={head.name}
        onError={(e) => { e.target.onerror = null; e.target.src = defaultPhoto; }}
      />

      <div className="relative z-10 p-5 flex flex-col justify-between h-full max-w-[55%] min-h-[172px]">
        <div className="w-9 h-9 rounded-full border-2 border-amber-400 flex items-center justify-center bg-white shadow-sm shrink-0">
          <Crown size={16} className="text-amber-500 fill-amber-500" />
        </div>

        <div>
          <h4 className="text-slate-900 text-[18px] font-black leading-tight tracking-tight">{head.name}</h4>
          <p className="text-sky-700 text-[11px] font-black mt-0.5 uppercase tracking-wide">{designation}</p>
          {locationText && (
            <p className="text-slate-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
              <MapPin size={11} className="shrink-0" /> {locationText}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3.5" onClick={(e) => e.stopPropagation()}>
            <a
              href={`tel:${head.phone || ''}`}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-bold shadow-sm active:scale-95 transition-all"
            >
              <Phone size={12} /> Call
            </a>
            <button
              onClick={() => {
                if (targetId && /^[0-9a-fA-F]{24}$/.test(targetId.toString())) {
                  navigate(`/member/chat/member/${targetId}`);
                } else {
                  navigate('/member/chat');
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-sky-300 text-sky-700 text-[11px] font-bold shadow-sm active:scale-95 transition-all"
            >
              <MessageCircle size={12} /> Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MEMBER SLIDER CARD UI (matches HomePage core member card style) ─────────
const MemberSliderCard = ({ member, navigate }) => {
  const rawRole = member.designation || member.role;
  const badgeColor = getBadgeColor(rawRole);
  const displayRole = rawRole && rawRole !== 'user' ? rawRole : 'Member';
  const avatarUrl = member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6C3BFF&color=ffffff&bold=true`;

  return (
    <div
      onClick={() => navigate(`/member/directory/${member._id || member.id}`)}
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
          onClick={() => {
            const targetId = member._id || member.id;
            if (targetId && /^[0-9a-fA-F]{24}$/.test(targetId.toString())) {
              navigate(`/member/chat/member/${targetId}`);
            } else {
              navigate('/member/chat');
            }
          }}
          className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
        >
          <MessageCircle size={10} />
        </button>
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ stat, navigate }) => {
  const Icon = stat.icon;
  const isClickable = !!stat.path;
  return (
    <div
      onClick={() => isClickable && navigate(stat.path)}
      className={`bg-white rounded-3xl p-4 border border-purple-100/50 shadow-sm text-center relative overflow-hidden transition-all duration-200
        ${isClickable ? 'cursor-pointer active:scale-[0.96] hover:shadow-md hover:border-purple-300/60 hover:bg-purple-50/30' : ''}`}
    >
      {isClickable && (
        <div className="absolute top-2.5 right-2.5">
          <ChevronRight size={12} className="text-purple-300" strokeWidth={3} />
        </div>
      )}
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
        <Icon size={20} />
      </div>
      <p className="text-lg font-black text-slate-900">{stat.value.toLocaleString()}{stat.suffix}</p>
      <p className="text-[11px] font-black text-slate-700 mt-1">{stat.labelHi}</p>
      <p className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{stat.labelEn}</p>
    </div>
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
  <div className="flex items-center justify-between mb-3">
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

// ─── LEADER GROUP BLOCK (banner + its own "Sab ... Head" sub-heads row) ──────
// `showGroupLabel` is false when this block shares a Group label with the block
// right before it (e.g. two Community Heads both tagged "Group 1") — the label
// is then shown once for the whole cluster instead of being repeated per head.
const LeaderGroupBlock = ({ groupLabel, showGroupLabel = true, subHeadsLabel, group, navigate, sliderKey, sliderRefs, scrollSlider }) => (
  <div className="space-y-3">
    {showGroupLabel && (
      <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{groupLabel}</p>
    )}
    <GroupHeadBanner head={group.head} navigate={navigate} />
    {group.subHeads.length > 0 && (
      <div>
        <p className="text-[11px] font-black text-purple-700 uppercase tracking-wider mb-2 mt-1">{subHeadsLabel}</p>
        <div className="relative">
          <div
            ref={(el) => { sliderRefs.current[sliderKey] = el; }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
          >
            {group.subHeads.map(m => <MemberSliderCard key={m._id} member={m} navigate={navigate} />)}
          </div>
          {group.subHeads.length > 3 && (
            <button
              onClick={() => scrollSlider(sliderKey)}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#6C3BFF] hover:border-purple-200 active:scale-90 transition-all z-20"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    )}
    {group.head.mantriMandal?.length > 0 && (
      <div>
        <div className="flex items-baseline gap-2 mb-2.5 mt-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#6C3BFF] to-[#8B5CFF] shrink-0" />
          <h4 className="text-[14.5px] font-black text-slate-800 tracking-tight">मंत्री मंडल</h4>
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Mantri Mandal</span>
        </div>
        <div className="relative">
          <div
            ref={(el) => { sliderRefs.current[`${sliderKey}-mm`] = el; }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
          >
            {group.head.mantriMandal.map(m => <MemberSliderCard key={m._id} member={m} navigate={navigate} />)}
          </div>
          {group.head.mantriMandal.length > 3 && (
            <button
              onClick={() => scrollSlider(`${sliderKey}-mm`)}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-[#6C3BFF] hover:border-purple-200 active:scale-90 transition-all z-20"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const LeadershipPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useData();

  const [loading, setLoading] = useState(true);
  const [communityHeadGroups, setCommunityHeadGroups] = useState([]);
  const [localHeadGroups, setLocalHeadGroups] = useState([]);
  const [availableLocalCities, setAvailableLocalCities] = useState([]);
  const [liveStats, setLiveStats] = useState({
    totalMembers: 0,
    totalStates: 0,
    totalDistricts: 0,
    totalVillageUnits: 0
  });

  // Local Head location filter — defaults to the member's own city, switchable
  const [selectedLocalCity, setSelectedLocalCity] = useState(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const sliderRefs = useRef({});
  const scrollSlider = (key) => {
    const el = sliderRefs.current[key];
    if (el) el.scrollBy({ left: 130, behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLeadership = async () => {
      try {
        setLoading(true);
        const res = await axiosPrivate.get('/member/leadership');
        if (isMounted && res.data?.success && res.data?.data) {
          const d = res.data.data;
          setCommunityHeadGroups(d.communityHeadGroups || []);
          setLocalHeadGroups(d.localHeadGroups || []);
          setAvailableLocalCities(d.availableLocalCities || []);
          if (d.stats) setLiveStats(d.stats);
        }
      } catch (err) {
        console.error('Failed to load live leadership payload:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLeadership();
    return () => { isMounted = false; };
  }, []);

  const userCity = currentUser?.city || '';

  // Default to the member's own city when it has a Local Head group; otherwise
  // the first city that does. The member can still switch via the picker.
  const effectiveLocalCity = selectedLocalCity
    || (availableLocalCities.includes(userCity) ? userCity : (availableLocalCities[0] || null));

  const visibleLocalHeadGroups = effectiveLocalCity
    ? localHeadGroups.filter(g => g.head.city === effectiveLocalCity)
    : localHeadGroups;

  const filteredLocalCities = citySearch.trim()
    ? availableLocalCities.filter(c => c.toLowerCase().includes(citySearch.trim().toLowerCase()))
    : availableLocalCities;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#F8F7FF' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-purple-100 text-slate-700 shadow-sm active:scale-95 transition-all shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[19px] font-black text-slate-900 tracking-tight">समाज नेतृत्व</h1>
          <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">Leadership Directory</p>
        </div>
      </div>

      <div className="px-4 pt-3 max-w-5xl mx-auto space-y-8">

        {/* ── COMMUNITY HEAD GROUPS ── */}
        <div className="space-y-6">
          <SectionHeader titleHi="समाज नेतृत्व" subtitleEn="Community Head" />
          {communityHeadGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-purple-100 p-6 text-center">
              <p className="text-sm font-bold text-slate-500">No Community Head appointed yet.</p>
            </div>
          ) : (
            communityHeadGroups.map((g, idx) => (
              <LeaderGroupBlock
                key={g.head._id}
                groupLabel={g.group}
                showGroupLabel={idx === 0 || g.group !== communityHeadGroups[idx - 1].group}
                subHeadsLabel="Sub Community Head"
                group={g}
                navigate={navigate}
                sliderKey={`ch-${idx}`}
                sliderRefs={sliderRefs}
                scrollSlider={scrollSlider}
              />
            ))
          )}
        </div>

        {/* ── LOCAL HEAD GROUPS ── */}
        <div className="space-y-4">
          <SectionHeader titleHi="स्थानीय नेतृत्व" subtitleEn="Local Community Head" />

          {availableLocalCities.length > 0 && (
            <div className="relative -mt-2">
              <button
                onClick={() => { setShowCityPicker(s => !s); setCitySearch(''); }}
                className="w-full min-w-[260px] sm:w-auto flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-purple-100 shadow-sm text-[13.5px] font-bold text-purple-700 active:scale-95 transition-all"
              >
                <MapPin size={16} className="shrink-0" />
                <span className="flex-1 text-left truncate">{effectiveLocalCity || 'Select Location'}</span>
                <Search size={14} className="text-slate-400 shrink-0" />
                <ChevronDown size={15} className={`shrink-0 transition-transform ${showCityPicker ? 'rotate-180' : ''}`} />
              </button>
              {showCityPicker && (
                <div className="absolute z-20 mt-1.5 w-full min-w-[260px] bg-white border border-purple-100 rounded-xl shadow-lg overflow-hidden max-h-[320px] flex flex-col">
                  <div className="relative shrink-0 p-2 border-b border-purple-50">
                    <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={citySearch}
                      onChange={e => setCitySearch(e.target.value)}
                      placeholder="Search location..."
                      className="w-full pl-7 pr-2 py-2 text-[12.5px] font-semibold text-slate-700 bg-purple-50/50 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="overflow-y-auto">
                    {filteredLocalCities.length === 0 ? (
                      <p className="px-4 py-3 text-[12px] text-slate-400 font-semibold">No matching location</p>
                    ) : (
                      filteredLocalCities.map(c => (
                        <button
                          key={c}
                          onClick={() => { setSelectedLocalCity(c); setShowCityPicker(false); setCitySearch(''); }}
                          className={`w-full text-left px-4 py-2.5 text-[12.5px] font-semibold hover:bg-purple-50 transition-colors ${c === effectiveLocalCity ? 'text-purple-700 bg-purple-50/70' : 'text-slate-700'}`}
                        >
                          {c}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {visibleLocalHeadGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-purple-100 p-6 text-center">
              <p className="text-sm font-bold text-slate-500">
                {effectiveLocalCity ? `No Local Head appointed for ${effectiveLocalCity} yet.` : 'No Local Head appointed yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleLocalHeadGroups.map((g, idx) => (
                <LeaderGroupBlock
                  key={g.head._id}
                  groupLabel={g.group}
                  showGroupLabel={idx === 0 || g.group !== visibleLocalHeadGroups[idx - 1].group}
                  subHeadsLabel="Sub Local Community Head"
                  group={g}
                  navigate={navigate}
                  sliderKey={`lh-${idx}`}
                  sliderRefs={sliderRefs}
                  scrollSlider={scrollSlider}
                />
              ))}
            </div>
          )}
        </div>

        {/* Community Strength (Stats) */}
        <div>
          <SectionHeader titleHi="समाज की ताकत" subtitleEn="Community Strength" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard navigate={navigate} stat={{ id: 'members', labelHi: 'कुल सदस्य', labelEn: 'Total Members', value: liveStats.totalMembers || 1, suffix: '', icon: Users, path: '/member/directory' }} />
            <StatCard navigate={navigate} stat={{ id: 'states', labelHi: 'राज्य', labelEn: 'States', value: liveStats.totalStates || 1, suffix: '', icon: Globe, path: '/member/directory?filter=state' }} />
            <StatCard navigate={navigate} stat={{ id: 'districts', labelHi: 'जिले', labelEn: 'Districts', value: liveStats.totalDistricts || 1, suffix: '', icon: Landmark, path: '/member/directory?filter=district' }} />
            <StatCard navigate={navigate} stat={{ id: 'units', labelHi: 'ग्राम इकाइयाँ', labelEn: 'Village Units', value: liveStats.totalVillageUnits || 1, suffix: '', icon: Home, path: '/member/directory?filter=village' }} />
          </div>
        </div>

        {/* Mission */}
        <MissionSection />

        {/* Footer */}
        <div className="text-center py-4">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-200/40 to-transparent mb-4" />
          <p className="text-[10px] text-gray-400">{currentUser?.community || 'Samaj Directory'}</p>
        </div>
      </div>
    </div>
  );
};

export default LeadershipPage;
