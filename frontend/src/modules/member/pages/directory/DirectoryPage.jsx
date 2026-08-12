import { useState, useEffect } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { getMembers } from '../../services/directoryApi';

const DirectoryPage = () => {
  const navigate = useNavigate();
  const { setMobileMenuOpen, getUnreadCountForModule } = useData();

  // API State
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Local Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter Drawer selectors state
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedProfession, setSelectedProfession] = useState('All Professions');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAge, setSelectedAge] = useState('All Ages');

  // Selector dropdown visibility toggles
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Dropdown lists
  const [cities, setCities] = useState(['All Cities']);
  const professions = ['All Professions', 'Architect', 'Doctor', 'Software Engineer', 'Teacher', 'CA', 'Pharmacist', 'Lawyer', 'Business Owner', 'Interior Designer', 'Homemaker'];
  const categories = ['All Categories', 'Executive Members', 'Business Owners', 'Teachers', 'Doctors', 'Engineers'];
  const ageGroups = ['All Ages', 'youth', 'senior'];

  // Load Cities dynamically
  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await axiosPublic.get('/auth/cities');
        if (res.data.success) {
          setCities(['All Cities', ...res.data.data.map(c => c.name)]);
        }
      } catch (err) {
        console.error('Failed to load cities for directory filters:', err);
      }
    };
    loadCities();
  }, []);

  // Fetch Members from Backend
  const fetchMembersData = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const params = {
        page: isLoadMore ? page + 1 : 1,
        limit: 10,
        search: searchQuery || undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        profession: selectedProfession !== 'All Professions' ? selectedProfession : undefined,
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
      console.error("Failed to fetch directory members:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Run fetch on mount and filter change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMembersData(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCity, selectedProfession, selectedCategory, selectedAge]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedProfession('All Professions');
    setSelectedCategory('All Categories');
    setSelectedAge('All Ages');
    setActiveDropdown(null);
  };

  const toggleDropdown = (dropdownName) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  const hasActiveFilters = searchQuery !== '' || selectedCity !== 'All Cities' || selectedProfession !== 'All Professions' || selectedCategory !== 'All Categories' || selectedAge !== 'All Ages';

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 flex items-center justify-between px-4 h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1 press-scale">
            <Menu size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-bold text-text-primary tracking-tight">Directory</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/member/profile/family')} 
            className="text-xs font-bold text-brand-primary bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100/50 press-scale flex items-center gap-1 hover:bg-purple-100/50 transition-colors"
          >
            <Users size={13} />
            My Family
          </button>
          <button onClick={() => navigate('/member/notifications?module=community')} className="p-1 press-scale relative">
            <Bell size={22} className="text-text-primary" />
            {getUnreadCountForModule('community') > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-4xl mx-auto space-y-6">
        {/* Purple Hero Banner */}
        <div className="bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] text-white rounded-[28px] p-5 relative overflow-hidden shadow-xl shadow-purple-500/15 border border-purple-400/15 flex flex-col justify-between min-h-[170px]">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-300/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          
          <div className="space-y-1 relative z-10">
            <h2 className="text-[20px] font-bold text-white tracking-tight">Our Community, Our Family</h2>
            <p className="text-xs text-purple-200/80 font-medium">Connect, Collaborate, Grow</p>
          </div>

          {/* Community Illustration */}
          <div className="flex justify-center items-end mt-4 relative z-10 w-full">
            <svg viewBox="0 0 200 80" className="w-56 h-20 text-white" fill="currentColor">
              <circle cx="100" cy="35" r="14" className="text-purple-300" />
              <path d="M78 80 C78 50, 122 50, 122 80 Z" className="text-purple-400" />
              <circle cx="68" cy="42" r="11" className="text-purple-200" />
              <path d="M50 80 C50 55, 86 55, 86 80 Z" className="text-purple-300" />
              <circle cx="132" cy="42" r="11" className="text-purple-200" />
              <path d="M114 80 C114 55, 150 55, 150 80 Z" className="text-purple-300" />
              <circle cx="40" cy="48" r="9" className="text-purple-100" />
              <path d="M26 80 C26 60, 54 60, 54 80 Z" className="text-purple-200" />
              <circle cx="160" cy="48" r="9" className="text-purple-100" />
              <path d="M146 80 C146 60, 174 60, 174 80 Z" className="text-purple-200" />
            </svg>
          </div>
        </div>

        {/* Search Bar & Filter Button */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-white/85 backdrop-blur-md rounded-2xl px-4 py-3.5 gap-2.5 border border-purple-100/30 shadow-sm focus-within:border-brand-primary/40 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] transition-all duration-200">
            <Search size={18} className="text-text-secondary shrink-0" />
            <input 
              type="text" 
              placeholder="Search member name, profession, city..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text-primary flex-1 outline-none placeholder-text-secondary"
            />
          </div>
          <button 
            onClick={() => setShowFilters(true)}
            className={`p-3.5 rounded-2xl border flex items-center justify-center press-scale shadow-sm transition-all duration-200 ${
              showFilters || hasActiveFilters
                ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-purple-500/25' 
                : 'bg-white border-purple-100/50 text-text-primary hover:border-purple-200'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Count Indicator */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">
            Total Members: {totalCount}
          </span>
          {hasActiveFilters && (
            <button 
              onClick={handleResetFilters} 
              className="text-xs font-extrabold text-brand-primary cursor-pointer hover:underline uppercase tracking-wider"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Members List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
          {loading ? (
            <div className="col-span-full py-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
            </div>
          ) : membersList.length > 0 ? (
            membersList.map((member) => (
              <div 
                key={member._id}
                onClick={() => navigate(`/member/directory/${member._id}`)}
                className="bg-white rounded-2xl p-4 border border-purple-100/20 flex items-center justify-between shadow-[0_4px_16px_rgba(109,40,217,0.02)] hover:border-purple-200/50 hover:shadow-[0_8px_24px_rgba(109,40,217,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar src={member.avatar} initials={member.name ? member.name.charAt(0) : '?'} size="md" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-text-primary leading-tight group-hover:text-brand-primary transition-colors duration-200">{member.name}</span>
                      {member.verificationStatus === 'verified' && <CheckCircle size={14} className="text-emerald-500 fill-emerald-50 shrink-0" />}
                    </div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">
                      {(() => {
                        const r = (member.role || '').toLowerCase();
                        const d = member.designation || '';
                        if (r === 'head' || d.toLowerCase() === 'community head' || d.toLowerCase() === 'president') return 'Community Head';
                        if (r === 'sub_head' || d.toLowerCase() === 'sub head') return 'Sub Head';
                        return member.profession || (member.role && member.role !== 'user' ? member.role : 'Member');
                      })()}
                    </p>
                    <p className="text-[9.5px] font-semibold text-text-muted mt-0.5 flex items-center gap-1">
                      <MapPin size={9} className="text-purple-300" /> {member.city || 'Location not specified'}
                    </p>
                  </div>
                </div>

                {/* Quick actions (Chat only) */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => navigate(`/member/chat/member/${member._id}`)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-primary border border-purple-100/50 hover:bg-brand-primary hover:text-white transition-all duration-200 press-scale"
                    style={{ background: 'rgba(124,58,237,0.05)' }}
                  >
                    <MessageCircle size={13} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-2xl py-12 px-4 text-center border border-dashed border-purple-200/50">
              <p className="text-xs text-text-secondary font-medium">No members found</p>
              <button 
                onClick={handleResetFilters}
                className="mt-3 text-xs font-bold text-brand-primary bg-purple-50 border border-purple-150/15 px-4 py-2 rounded-full press-scale"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </div>

        {/* Load More Pagination */}
        {hasMore && !loading && membersList.length > 0 && (
          <div className="flex justify-center -mt-2 pb-6">
            <button 
              onClick={() => fetchMembersData(true)}
              disabled={loadingMore}
              className="bg-brand-primary text-white font-bold text-xs py-3 px-8 rounded-full shadow-lg shadow-brand-primary/30 hover:bg-brand-secondary transition-colors press-scale flex items-center gap-2"
            >
              {loadingMore ? (
                <><Loader2 className="animate-spin" size={14} /> Loading...</>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}

      </div>

      {/* Advanced Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 transition-opacity">
          <div className="absolute inset-0" onClick={() => { setShowFilters(false); setActiveDropdown(null); }} />

          <div className="relative bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl z-10 animate-slide-up pb-8">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setShowFilters(false); setActiveDropdown(null); }}
                  className="p-1 -ml-1 press-scale"
                >
                  <ArrowLeft size={22} className="text-text-primary" />
                </button>
                <h2 className="text-base font-bold text-text-primary">Filters</h2>
              </div>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 press-scale"
              >
                Reset
              </button>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* Filter 1: City */}
              <div className={`space-y-1.5 relative ${activeDropdown === 'city' ? 'z-50' : 'z-10'}`}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">City</label>
                <button 
                  onClick={() => toggleDropdown('city')}
                  className="w-full flex items-center justify-between bg-surface border border-gray-150 px-4 py-3 rounded-2xl text-xs font-semibold text-text-primary"
                >
                  <span>{selectedCity}</span>
                  <ChevronDown size={16} className={`text-text-secondary transition-transform ${activeDropdown === 'city' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'city' && (
                  <div className="absolute top-[68px] left-0 right-0 bg-white border border-gray-150 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-2">
                    {cities.map((city) => (
                      <button 
                        key={city}
                        onClick={() => { setSelectedCity(city); setActiveDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs font-semibold text-text-primary flex-1 flex items-center justify-between"
                      >
                        <span className={selectedCity === city ? 'text-indigo-600' : ''}>{city}</span>
                        {selectedCity === city && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter 2: Profession */}
              <div className={`space-y-1.5 relative ${activeDropdown === 'profession' ? 'z-50' : 'z-10'}`}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Profession</label>
                <button 
                  onClick={() => toggleDropdown('profession')}
                  className="w-full flex items-center justify-between bg-surface border border-gray-150 px-4 py-3 rounded-2xl text-xs font-semibold text-text-primary"
                >
                  <span>{selectedProfession}</span>
                  <ChevronDown size={16} className={`text-text-secondary transition-transform ${activeDropdown === 'profession' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'profession' && (
                  <div className="absolute top-[68px] left-0 right-0 bg-white border border-gray-150 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-2">
                    {professions.map((prof) => (
                      <button 
                        key={prof}
                        onClick={() => { setSelectedProfession(prof); setActiveDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs font-semibold text-text-primary flex-1 flex items-center justify-between"
                      >
                        <span className={selectedProfession === prof ? 'text-indigo-600' : ''}>{prof}</span>
                        {selectedProfession === prof && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter 3: Category */}
              <div className={`space-y-1.5 relative ${activeDropdown === 'category' ? 'z-50' : 'z-10'}`}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Category</label>
                <button 
                  onClick={() => toggleDropdown('category')}
                  className="w-full flex items-center justify-between bg-surface border border-gray-150 px-4 py-3 rounded-2xl text-xs font-semibold text-text-primary"
                >
                  <span>{selectedCategory}</span>
                  <ChevronDown size={16} className={`text-text-secondary transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'category' && (
                  <div className="absolute top-[68px] left-0 right-0 bg-white border border-gray-150 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-2">
                    {categories.map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setActiveDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs font-semibold text-text-primary flex-1 flex items-center justify-between"
                      >
                        <span className={selectedCategory === cat ? 'text-indigo-600' : ''}>{cat}</span>
                        {selectedCategory === cat && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Filter 4: Age */}
              <div className={`space-y-1.5 relative ${activeDropdown === 'age' ? 'z-50' : 'z-10'}`}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Age Group</label>
                <button 
                  onClick={() => toggleDropdown('age')}
                  className="w-full flex items-center justify-between bg-surface border border-gray-150 px-4 py-3 rounded-2xl text-xs font-semibold text-text-primary"
                >
                  <span className="capitalize">{selectedAge}</span>
                  <ChevronDown size={16} className={`text-text-secondary transition-transform ${activeDropdown === 'age' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'age' && (
                  <div className="absolute top-[68px] left-0 right-0 bg-white border border-gray-150 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto py-2">
                    {ageGroups.map((age) => (
                      <button 
                        key={age}
                        onClick={() => { setSelectedAge(age); setActiveDropdown(null); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-xs font-semibold text-text-primary flex-1 flex items-center justify-between"
                      >
                        <span className={`capitalize ${selectedAge === age ? 'text-indigo-600' : ''}`}>{age}</span>
                        {selectedAge === age && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pt-4 border-t border-gray-100 flex gap-3">
              <button 
                onClick={handleResetFilters}
                className="flex-1 py-3.5 border border-gray-200 text-text-primary rounded-2xl font-bold text-xs press-scale text-center hover:bg-gray-50"
              >
                Reset
              </button>
              <button 
                onClick={() => { setShowFilters(false); setActiveDropdown(null); fetchMembersData(false); }}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs press-scale text-center hover:bg-indigo-700 shadow-md"
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

export default DirectoryPage;
