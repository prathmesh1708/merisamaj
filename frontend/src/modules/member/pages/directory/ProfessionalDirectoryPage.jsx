import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, MapPin, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useProfessionalDirectory from '../../hooks/useProfessionalDirectory';
import { useData } from '../../context/DataProvider';

import DirectoryHeader from './components/DirectoryHeader';
import SearchSection from './components/SearchSection';
import CategoryCard from './components/CategoryCard';
import BusinessCard from './components/BusinessCard';
import EmptyState from './components/EmptyState';

// Skeleton Loader
const SkeletonCard = () => (
  <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs animate-pulse flex items-center justify-between gap-4">
    <div className="flex items-center gap-3.5">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-200 shrink-0" />
      <div className="space-y-2">
        <div className="h-4 w-36 bg-slate-200 rounded-md" />
        <div className="h-3 w-24 bg-slate-100 rounded-md" />
        <div className="h-3 w-16 bg-slate-100 rounded-md" />
      </div>
    </div>
    <div className="flex gap-1.5 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-slate-200" />
      <div className="w-9 h-9 rounded-xl bg-slate-200" />
      <div className="w-9 h-9 rounded-xl bg-slate-200" />
    </div>
  </div>
);

const ProfessionalDirectoryPage = () => {
  const navigate = useNavigate();
  const { currentUser, markModuleAsVisited } = useData();

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('professional');
    }
  }, [markModuleAsVisited]);

  // State (100% preserved)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [tempCategory, setTempCategory] = useState('All');
  const [tempCity, setTempCity] = useState('All Cities');

  // 250ms debounced search query to maintain instant live-as-you-type feel while querying server
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filterParams = useMemo(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (selectedCategory !== 'All') params.category = selectedCategory;
    if (selectedCity !== 'All Cities') params.city = selectedCity;
    return params;
  }, [debouncedSearch, selectedCategory, selectedCity]);

  // Custom hook logic with server-side filtering
  const { listings, categories, cities, isLoading, error } = useProfessionalDirectory(
    currentUser?.communityId || 'default',
    filterParams
  );

  // Filter handlers
  const openFilter = () => {
    setTempCategory(selectedCategory);
    setTempCity(selectedCity);
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    setSelectedCategory(tempCategory);
    setSelectedCity(tempCity);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setTempCategory('All');
    setTempCity('All Cities');
  };

  const clearAllApplied = () => {
    setSelectedCategory('All');
    setSelectedCity('All Cities');
    setSearchQuery('');
  };

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedCity !== 'All Cities' ? 1 : 0);

  // Preserved fallback filtering logic
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedCategory !== 'All' && item.categoryKey !== selectedCategory) return false;
      if (selectedCity !== 'All Cities' && item.city !== selectedCity) return false;
      return true;
    });
  }, [listings, searchQuery, selectedCategory, selectedCity]);

  // Categories with "All" option
  const allCategoriesOption = useMemo(() => {
    const allCat = {
      id: 'All',
      name: 'All Categories',
      categoryKey: 'all',
      iconName: 'LayoutGrid',
    };
    return [allCat, ...categories];
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5 pt-2">
        {/* Directory Header */}
        <DirectoryHeader
          onBack={() => navigate(-1)}
          onAddBusiness={() => navigate('/member/professional/apply')}
        />

        {/* Search Section */}
        <SearchSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openFilter={openFilter}
          activeFilterCount={activeFilterCount}
          selectedCategory={selectedCategory}
          selectedCity={selectedCity}
          categories={categories}
          setSelectedCategory={setSelectedCategory}
          setSelectedCity={setSelectedCity}
          clearAllApplied={clearAllApplied}
          isLoading={isLoading}
        />

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">Failed to load data</p>
              <p className="text-xs font-semibold text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Categories Section */}
        {!error && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Categories
              </span>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Reset Category
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex gap-3 overflow-hidden py-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-[155px] h-[98px] bg-slate-200/60 rounded-2xl animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5 -mx-0.5">
                {allCategoriesOption.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listings Section */}
        {!error && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isLoading
                  ? 'Loading Professionals...'
                  : `${filteredListings.length} ${
                      filteredListings.length === 1 ? 'Business' : 'Businesses'
                    } Found`}
              </span>
              {activeFilterCount > 0 && !isLoading && (
                <button
                  onClick={clearAllApplied}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Clear All Filters →
                </button>
              )}
            </div>

            {/* Business List or Empty State */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredListings.map((biz) => (
                    <BusinessCard
                      key={biz.id}
                      business={biz}
                      onClick={() => navigate(`/member/professional/${biz.id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                onReset={clearAllApplied}
                onAddBusiness={() => navigate('/member/professional/apply')}
              />
            )}
          </div>
        )}
      </div>

      {/* ─── FILTER BOTTOM SHEET MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterPanel && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterPanel(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Sheet Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100"
            >
              {/* Handle Bar */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden" />

              {/* Modal Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Filters</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearFilters}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Category Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTempCategory('All')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        tempCategory === 'All'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setTempCategory(tempCategory === cat.id ? 'All' : cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          tempCategory === cat.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" /> City
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => setTempCity(city)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                          tempCity === city
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={applyFilters}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex justify-center items-center gap-2"
                >
                  <span>Apply Filters</span>
                  {tempCategory !== 'All' || tempCity !== 'All Cities' ? (
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-xs font-bold">
                      {(tempCategory !== 'All' ? 1 : 0) + (tempCity !== 'All Cities' ? 1 : 0)}
                    </span>
                  ) : null}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfessionalDirectoryPage;
