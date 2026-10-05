import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosPublic } from '../../../../core/api/axiosConfig';
import { useData } from '../../context/DataProvider';
import {
  Search,
  Menu,
  Bell,
  Users,
  Filter,
  MessageCircle,
  CheckCircle,
  ChevronDown,
  Check,
  MapPin,
  Loader2,
  ArrowLeft,
  Lock,
  Phone,
  ChevronRight,
  Home,
  Building2,
  Stethoscope,
  HardHat,
  Store,
  Leaf,
  GraduationCap,
  Landmark,
  Briefcase,
  MoreHorizontal,
  Presentation,
  User,
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { getMembers, getMemberStats } from '../../services/directoryApi';
import { getProfessionVisual } from './professionVisuals';

/* ─────────────────────────────── CATEGORY CONFIG ─────────────────────────────── */

const OCCUPATION_CATEGORIES = [
  {
    id: 'doctor',
    name: 'Doctor',
    regex: /doctor|physician|surgeon|dentist|mbbs|md|bds|medic/i,
    bg: '#FFF0F0',
    border: '#FFE2E2',
    iconColor: '#D32F2F',
    countColor: '#D32F2F',
    Icon: Stethoscope,
  },
  {
    id: 'engineer',
    name: 'Engineer',
    regex: /engineer|b\.?tech|developer|software|civil|mechanical|electrical|it\b|architect/i,
    bg: '#EBF5FF',
    border: '#D6EBFF',
    iconColor: '#1976D2',
    countColor: '#1976D2',
    Icon: HardHat,
  },
  {
    id: 'business',
    name: 'Merchant / Business',
    regex: /business|merchant|vyapari|trader|shop|owner|retail|entrepreneur|store/i,
    bg: '#FFF8E7',
    border: '#FFECC0',
    iconColor: '#E65100',
    countColor: '#E65100',
    Icon: Store,
  },
  {
    id: 'farmer',
    name: 'Farmer / Agriculture',
    regex: /farmer|kisan|agricult|farming|krishi/i,
    bg: '#F0FAF0',
    border: '#D8F3D8',
    iconColor: '#2E7D32',
    countColor: '#2E7D32',
    Icon: Leaf,
  },
  {
    id: 'teacher',
    name: 'Teacher',
    regex: /teacher|professor|lecturer|educat|shikshak|faculty/i,
    bg: '#F4F0FF',
    border: '#E4DAFF',
    iconColor: '#6A1B9A',
    countColor: '#6A1B9A',
    Icon: Presentation,
  },
  {
    id: 'govt',
    name: 'Govt. Employee',
    regex: /govt|government|civil servant|sarkari|police|ias|ips|officer|bank/i,
    bg: '#E8F8F8',
    border: '#CEF0F0',
    iconColor: '#00838F',
    countColor: '#00838F',
    Icon: Landmark,
  },
  {
    id: 'private',
    name: 'Private Job',
    regex: /private|corporate|manager|executive|sales|consultant|employee|analyst|associate/i,
    bg: '#FFF0F5',
    border: '#FFE0EC',
    iconColor: '#C2185B',
    countColor: '#C2185B',
    Icon: Briefcase,
  },
  {
    id: 'student',
    name: 'Student',
    regex: /student|chhatra|graduate|studying|learner|undergrad/i,
    bg: '#FFFDE7',
    border: '#FFF9B3',
    iconColor: '#F57F17',
    countColor: '#F57F17',
    Icon: GraduationCap,
  },
  {
    id: 'homemaker',
    name: 'Homemaker',
    regex: /homemaker|housewife|grihini/i,
    bg: '#FFF0F5',
    border: '#FFE0EB',
    iconColor: '#D81B60',
    countColor: '#D81B60',
    Icon: User,
  },
  {
    id: 'others',
    name: 'Others',
    regex: null, // Fallback for unmatched
    bg: '#F3F4F6',
    border: '#E5E7EB',
    iconColor: '#374151',
    countColor: '#374151',
    Icon: MoreHorizontal,
  },
];

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */

const DirectoryPage = () => {
  const navigate = useNavigate();
  const { setMobileMenuOpen, getUnreadCountForModule, markModuleAsVisited } = useData();

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('directory');
    }
  }, [markModuleAsVisited]);

  /* ── API state ── */
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  /* Stats breakdown from backend */
  const [rawStats, setRawStats] = useState({ cities: [], professions: [] });
  const [statsLoading, setStatsLoading] = useState(true);

  /* Active occupation filter */
  const [selectedOccupation, setSelectedOccupation] = useState(null);

  /* Search & filter */
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedProfession, setSelectedProfession] = useState('All Professions');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAge, setSelectedAge] = useState('All Ages');
  const [activeDropdown, setActiveDropdown] = useState(null);

  /* Dynamic cities */
  const [cities, setCities] = useState(['All Cities']);
  const professions = [
    'All Professions', 'Architect', 'Doctor', 'Software Engineer', 'Teacher',
    'CA', 'Pharmacist', 'Lawyer', 'Business Owner', 'Interior Designer', 'Homemaker',
  ];
  const categories = ['All Categories', 'Executive Members', 'Business Owners', 'Teachers', 'Doctors', 'Engineers'];
  const ageGroups = ['All Ages', 'youth', 'senior'];

  /* ── Load Cities ── */
  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await axiosPublic.get('/auth/cities');
        if (res.data.success) {
          setCities(['All Cities', ...res.data.data.map(c => c.name)]);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    };
    loadCities();
  }, []);

  /* ── Load Stats ── */
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await getMemberStats();
        if (res.success && res.data) {
          setRawStats({
            cities: res.data.cities || [],
            professions: res.data.professions || [],
          });
        }
      } catch (err) {
        console.error('Failed to load member stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  /* ── Aggregate Occupation Counts ── */
  const categoryCounts = useMemo(() => {
    const counts = {};
    OCCUPATION_CATEGORIES.forEach(c => {
      counts[c.id] = 0;
    });

    let matchedTotal = 0;
    rawStats.professions.forEach(({ name, count }) => {
      const cat = OCCUPATION_CATEGORIES.find(c => c.regex && c.regex.test(name));
      if (cat) {
        counts[cat.id] += count;
        matchedTotal += count;
      } else {
        counts.others += count;
      }
    });

    // If total count is larger than matched professions, add unassigned to others
    if (totalCount > matchedTotal && rawStats.professions.length > 0) {
      counts.others += Math.max(0, totalCount - (matchedTotal + counts.others));
    }

    return counts;
  }, [rawStats, totalCount]);

  /* ── Fetch Members ── */
  const fetchMembersData = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      let professionParam;
      if (selectedOccupation) {
        professionParam = selectedOccupation.name;
      } else if (selectedProfession !== 'All Professions') {
        professionParam = selectedProfession;
      }

      const params = {
        page: isLoadMore ? page + 1 : 1,
        limit: 10,
        search: searchQuery || undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        profession: professionParam,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        age: selectedAge !== 'All Ages' ? selectedAge : undefined,
      };

      const response = await getMembers(params);

      if (response.success) {
        if (isLoadMore) {
          setMembersList(prev => [...prev, ...response.data]);
          setPage(prev => prev + 1);
        } else {
          setMembersList(response.data);
          setPage(1);
        }
        setTotalCount(response.pagination.total);
        setHasMore(response.pagination.page < response.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch directory members:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      fetchMembersData(false);
    }, 400);
    return () => clearTimeout(id);
  }, [searchQuery, selectedCity, selectedProfession, selectedCategory, selectedAge, selectedOccupation]);

  /* ── Helpers ── */
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedProfession('All Professions');
    setSelectedCategory('All Categories');
    setSelectedAge('All Ages');
    setSelectedOccupation(null);
    setActiveDropdown(null);
  };

  const toggleDropdown = name => setActiveDropdown(prev => (prev === name ? null : name));

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCity !== 'All Cities' ||
    selectedProfession !== 'All Professions' ||
    selectedCategory !== 'All Categories' ||
    selectedAge !== 'All Ages' ||
    selectedOccupation !== null;

  /* ── Member label helper ── */
  const getMemberLabel = member => {
    if (member.maritalStatus === 'Single') return 'Profile Hidden';
    const r = (member.role || '').toLowerCase();
    const d = member.designation || '';
    if (r === 'head' || d.toLowerCase() === 'community head' || d.toLowerCase() === 'president')
      return 'Community Head';
    if (r === 'sub_head' || d.toLowerCase() === 'sub head') return 'Sub Head';
    return member.profession || (member.role && member.role !== 'user' ? member.role : 'Member');
  };

  const totalCitiesCount = rawStats.cities.length > 0 ? rawStats.cities.length : (cities.length > 1 ? cities.length - 1 : 1);
  const totalFamiliesCount = Math.max(1, Math.round(totalCount * 0.45));

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="min-h-screen pb-20" style={{ background: '#F8F9FD' }}>

      {/* ── Top Header Bar ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #388E3C 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1">
            <Menu size={22} className="text-white" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">Community Directory</h1>
            <p className="text-[10px] text-green-200 font-medium mt-0.5">Our Samaj — Our Identity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/member/profile/family')}
            className="text-xs font-bold text-white bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/25 flex items-center gap-1"
          >
            <Users size={13} />
            My Family
          </button>
          <button onClick={() => navigate('/member/notifications?module=community')} className="p-1 relative">
            <Bell size={22} className="text-white" />
            {getUnreadCountForModule('community') > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-4xl mx-auto space-y-4">

        {/* ── Top 3-Column Summary Stats Card (Reference Style) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 p-3.5 flex items-center justify-between divide-x divide-slate-100">
          {/* 1. Total Families */}
          <div className="flex items-center gap-2.5 px-2 flex-1 justify-center">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Home size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Families</p>
              <p className="text-base font-black text-slate-900 leading-tight mt-0.5">
                {totalFamiliesCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 2. Total Members */}
          <div className="flex items-center gap-2.5 px-2 flex-1 justify-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Members</p>
              <p className="text-base font-black text-slate-900 leading-tight mt-0.5">
                {totalCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 3. Total Cities */}
          <div className="flex items-center gap-2.5 px-2 flex-1 justify-center">
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Cities</p>
              <p className="text-base font-black text-slate-900 leading-tight mt-0.5">
                {totalCitiesCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ── Occupation Section Header with Icon and Chevron ── */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Users size={14} />
            </div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Members by Occupation</h2>
          </div>
          {selectedOccupation ? (
            <button
              onClick={() => setSelectedOccupation(null)}
              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Show All
            </button>
          ) : (
            <ChevronRight size={18} className="text-slate-400" />
          )}
        </div>

        {/* ── Category-wise Occupation Grid (2 Columns, Exact Reference Styling) ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {OCCUPATION_CATEGORIES.map((cat) => {
            const Icon = cat.Icon;
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedOccupation?.id === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedOccupation(isSelected ? null : cat)}
                className={`rounded-2xl p-3 flex items-center gap-3 text-left transition-all duration-200 border-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md ${
                  isSelected ? 'ring-2 ring-offset-1 ring-slate-800' : ''
                }`}
                style={{
                  background: cat.bg,
                  borderColor: isSelected ? cat.iconColor : cat.border,
                }}
              >
                {/* Left: Distinct Category Icon */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: cat.iconColor,
                  }}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>

                {/* Right: Title on Top & Bold Colored Count Below */}
                <div className="text-left min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                    {cat.name}
                  </p>
                  <p
                    className="text-xl font-black leading-none mt-1 tracking-tight"
                    style={{ color: cat.countColor }}
                  >
                    {statsLoading ? '...' : count.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Search Bar & Filter Button ── */}
        <div className="flex gap-2 items-center pt-2">
          <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-3 gap-2.5 border border-slate-200 shadow-sm focus-within:border-green-500 focus-within:shadow-[0_0_0_3px_rgba(34,197,94,0.10)] transition-all duration-200">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search member name, profession, city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 flex-1 outline-none placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between -mt-1">
            <div className="flex flex-wrap gap-1.5">
              {selectedOccupation && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  Occupation: {selectedOccupation.name}
                  <button onClick={() => setSelectedOccupation(null)} className="ml-0.5 hover:text-red-500">×</button>
                </span>
              )}
              {selectedCity !== 'All Cities' && (
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  City: {selectedCity}
                  <button onClick={() => setSelectedCity('All Cities')} className="ml-0.5 hover:text-red-500">×</button>
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs font-extrabold text-rose-600 hover:underline uppercase tracking-wider cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* ── Section Title: Member Directory List ── */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-black text-slate-900">
            {selectedOccupation ? `${selectedOccupation.name} Members` : 'Directory Members'}
            {!loading && (
              <span className="ml-1.5 text-xs font-bold text-slate-400">
                ({totalCount.toLocaleString()})
              </span>
            )}
          </h3>
          <button
            onClick={() => setShowFilters(true)}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-emerald-100"
          >
            <Filter size={12} /> Filter
          </button>
        </div>

        {/* ── Members List ── */}
        <div className="space-y-2.5 pb-8">
          {loading ? (
            <div className="py-14 flex justify-center items-center">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : membersList.length > 0 ? (
            membersList.map(member => {
              const isHidden = member.maritalStatus === 'Single';
              const label = getMemberLabel(member);
              const visual = getProfessionVisual(member.profession || '');
              const ProfIcon = visual.icon;

              return (
                <div
                  key={member._id}
                  onClick={() => navigate(`/member/directory/${member._id}`)}
                  className={`bg-white rounded-2xl px-4 py-3.5 border border-slate-100 flex items-center justify-between shadow-sm hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${
                    isHidden ? 'opacity-60' : ''
                  }`}
                >
                  {/* Avatar + Member Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar
                        src={member.avatar}
                        initials={member.name ? member.name.charAt(0) : '?'}
                        size="md"
                      />
                      {isHidden && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-700 border-2 border-white flex items-center justify-center">
                          <Lock size={9} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Name + Verified Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900 leading-tight truncate">
                          {member.name}
                        </span>
                        {member.verificationStatus === 'verified' && (
                          <CheckCircle size={14} className="text-emerald-500 fill-emerald-50 shrink-0" />
                        )}
                      </div>

                      {/* Profession label */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <ProfIcon size={11} className={`${visual.text} shrink-0`} />
                        <p className="text-[11px] font-bold text-slate-600 truncate">
                          {label}
                        </p>
                      </div>

                      {/* Location */}
                      {member.city && (
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={9} className="text-emerald-500 shrink-0" />
                          {member.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Call & Chat */}
                  {!isHidden && (
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform cursor-pointer"
                          style={{ background: '#E53935' }}
                          title="Call"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/member/chat/member/${member._id}`)}
                        className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Message"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl py-14 px-4 text-center border border-dashed border-slate-200 shadow-sm">
              <Users size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">No members found</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting another occupation or clearing filters</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-5 py-2 rounded-full cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </div>

        {/* ── Load More Button ── */}
        {hasMore && !loading && membersList.length > 0 && (
          <div className="flex justify-center -mt-4 pb-6">
            <button
              onClick={() => fetchMembersData(true)}
              disabled={loadingMore}
              className="text-white font-bold text-xs py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Loading...
                </>
              ) : (
                <>
                  Load More
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Advanced Filter Drawer ── */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
          <div className="absolute inset-0" onClick={() => { setShowFilters(false); setActiveDropdown(null); }} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl z-10 pb-8">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowFilters(false); setActiveDropdown(null); }} className="p-1 -ml-1">
                  <ArrowLeft size={22} className="text-slate-700" />
                </button>
                <h2 className="text-base font-bold text-slate-900">Advanced Filters</h2>
              </div>
              <button onClick={handleResetFilters} className="text-xs font-bold text-rose-600">
                Reset
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* City */}
              <FilterDropdown
                label="City"
                value={selectedCity}
                options={cities}
                isOpen={activeDropdown === 'city'}
                onToggle={() => toggleDropdown('city')}
                onSelect={v => { setSelectedCity(v); setActiveDropdown(null); }}
              />
              {/* Profession */}
              <FilterDropdown
                label="Profession"
                value={selectedProfession}
                options={professions}
                isOpen={activeDropdown === 'profession'}
                onToggle={() => toggleDropdown('profession')}
                onSelect={v => { setSelectedProfession(v); setActiveDropdown(null); }}
              />
              {/* Category */}
              <FilterDropdown
                label="Category"
                value={selectedCategory}
                options={categories}
                isOpen={activeDropdown === 'category'}
                onToggle={() => toggleDropdown('category')}
                onSelect={v => { setSelectedCategory(v); setActiveDropdown(null); }}
              />
              {/* Age */}
              <FilterDropdown
                label="Age Group"
                value={selectedAge}
                options={ageGroups}
                isOpen={activeDropdown === 'age'}
                onToggle={() => toggleDropdown('age')}
                onSelect={v => { setSelectedAge(v); setActiveDropdown(null); }}
                capitalize
              />
            </div>

            <div className="px-5 pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-3.5 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => { setShowFilters(false); setActiveDropdown(null); fetchMembersData(false); }}
                className="flex-1 py-3.5 text-white rounded-2xl font-bold text-xs shadow-md cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Reusable filter dropdown ── */
const FilterDropdown = ({ label, value, options, isOpen, onToggle, onSelect, capitalize }) => (
  <div className={`space-y-1.5 relative ${isOpen ? 'z-50' : 'z-10'}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs font-semibold text-slate-800"
    >
      <span className={capitalize ? 'capitalize' : ''}>{value}</span>
      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="absolute top-[68px] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-between"
          >
            <span className={`${capitalize ? 'capitalize' : ''} ${value === opt ? 'text-emerald-600' : ''}`}>{opt}</span>
            {value === opt && <Check size={14} className="text-emerald-600" />}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default DirectoryPage;
