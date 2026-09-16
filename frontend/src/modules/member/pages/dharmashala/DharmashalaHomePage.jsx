import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Menu, Filter, Loader, ArrowRight, Home, Shield, Check } from 'lucide-react';
import dharmashalaService from '../../../../core/api/dharmashalaService';
import { useData } from '../../context/DataProvider';

export default function DharmashalaHomePage() {
  const navigate = useNavigate();
  const { setMobileMenuOpen, markModuleAsVisited } = useData();

  useEffect(() => {
    if (markModuleAsVisited) {
      markModuleAsVisited('dharmashala');
    }
  }, [markModuleAsVisited]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dharamshalas, setDharamshalas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedFacilities, setSelectedFacilities] = useState({ ac: false, food: false });
  const [tempLocation, setTempLocation] = useState('all');
  const [tempFacilities, setTempFacilities] = useState({ ac: false, food: false });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchDharamshalas = async (pageNum = 1) => {
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await dharmashalaService.getDharmashalas({
        search: searchQuery,
        city: selectedLocation,
        ac: selectedFacilities.ac ? 'true' : 'false',
        food: selectedFacilities.food ? 'true' : 'false',
        page: pageNum,
        limit: 12
      });
      if (res.status === 'success') {
        const list = res.data || [];
        if (pageNum === 1) {
          setDharamshalas(list);
        } else {
          setDharamshalas(prev => [...prev, ...list]);
        }
        if (res.pagination) {
          setHasMore(pageNum < res.pagination.pages);
        } else {
          setHasMore(list.length >= 12);
        }
      }
    } catch (error) {
      console.error("Failed to fetch dharmashalas", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchDharamshalas(1);
  }, [searchQuery, selectedLocation, selectedFacilities]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDharamshalas(nextPage);
  };

  const handleOpenFilter = () => {
    setTempLocation(selectedLocation);
    setTempFacilities({ ...selectedFacilities });
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setSelectedLocation(tempLocation);
    setSelectedFacilities({ ...tempFacilities });
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setTempLocation('all');
    setTempFacilities({ ac: false, food: false });
  };

  const handleToggleLocation = (loc) => {
    setTempLocation(prev => prev === loc ? 'all' : loc);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-purple-100/30 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.02)] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-text-primary tracking-tight">Dharmashala Booking</h1>
        </div>
        <button 
          onClick={handleOpenFilter}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all press-scale ${selectedLocation !== 'all' || selectedFacilities.ac || selectedFacilities.food ? 'bg-purple-50 text-brand-primary border border-purple-200/40' : 'bg-gray-50 text-text-primary hover:bg-purple-50'}`}
        >
          <Filter size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="p-4 bg-white/40 backdrop-blur-md border-b border-purple-100/20 flex gap-3 items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search Dharmashala..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-purple-100/30 rounded-2xl pl-11 pr-4 py-3.5 text-[14px] font-bold outline-none focus:border-brand-primary/45 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] transition-all text-slate-800"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
          </div>
          <button 
            onClick={() => navigate('/member/dharmashala/bookings')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3.5 rounded-2xl font-bold text-[12.5px] shadow-sm shrink-0 transition-all press-scale"
          >
            My Bookings
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : dharamshalas.length === 0 ? (
            <div className="card-neo p-8 text-center text-slate-500 font-bold">
              No Dharmashala found
            </div>
          ) : (
            <>
              {dharamshalas.map(d => (
                <div 
                  key={d._id} 
                  className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.08)] hover:border-purple-200 transition-all duration-300 flex flex-col sm:flex-row gap-4 relative overflow-hidden group"
                >
                  {/* Property Image & Location Badge */}
                  <div className="relative w-full sm:w-32 h-36 sm:h-32 rounded-[18px] overflow-hidden shrink-0 bg-slate-100 border border-slate-100">
                    <img 
                      src={d.image || (d.galleryImages && d.galleryImages[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'} 
                      alt={d.name} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                        {d.city || 'Indore'}
                      </span>
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-extrabold text-slate-800 text-[15px] truncate tracking-tight">{d.name}</h3>
                        <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {d.status || 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                        <MapPin size={12} className="shrink-0 text-purple-600" />
                        <span className="text-[11px] font-medium text-slate-600 truncate">{d.address || d.location || 'Samaj Premises'}</span>
                      </div>

                      {/* Property Metadata Chips — Clean Flex, NO Overlap */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <div className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="text-purple-400 font-medium">Ownership:</span>
                          <span className="truncate max-w-[120px]">{d.community || 'Samaj Trust'}</span>
                        </div>
                        {d.ac && (
                          <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            AC Rooms
                          </div>
                        )}
                        {d.food && (
                          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Food Service
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer CTA & Pricing */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Rate / Day</span>
                        <span className="text-[13.5px] font-black text-purple-700 tracking-tight">
                          ₹{d.pricePerNight || d.ratePerDay || '500'}<span className="text-[9.5px] font-bold text-slate-400">/day</span>
                        </span>
                      </div>

                      <button 
                        onClick={() => navigate(`/member/dharmashala/${d._id}`)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[11.5px] font-bold rounded-xl shadow-sm shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-1"
                      >
                        Booking <ArrowRight size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 font-bold text-xs bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading more properties...' : 'Load More Dharmashalas'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="p-5 pb-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-black text-slate-800">Filter Search</h3>
                <button onClick={handleResetFilter} className="text-[13px] font-bold text-indigo-650">Reset</button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-600 mb-2">Location</h4>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleToggleLocation('indore')}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${tempLocation === 'indore' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Indore
                    </button>
                    <button 
                      onClick={() => handleToggleLocation('ujjain')}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${tempLocation === 'ujjain' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Ujjain
                    </button>
                    <button 
                      onClick={() => handleToggleLocation('bhopal')}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${tempLocation === 'bhopal' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Bhopal
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-600 mb-2">Facilities</h4>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setTempFacilities(prev => ({ ...prev, ac: !prev.ac }))}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${tempFacilities.ac ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      AC Rooms
                    </button>
                    <button 
                      onClick={() => setTempFacilities(prev => ({ ...prev, food: !prev.food }))}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${tempFacilities.food ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
                    >
                      Dining / Food
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 text-[14px] font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyFilter}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-bold rounded-xl shadow-sm transition-all active:scale-95"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
