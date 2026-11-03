import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, RefreshCw, Calendar, Eye, Trash2, RotateCcw, 
  MapPin, Building2, Heart, MessageCircle, FileText, Image as ImageIcon, 
  Video, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, ShieldAlert, X
} from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import PostDetailDrawer from './PostDetailDrawer';
import { socialFeedService } from '../../../services/socialFeedService';
import { cityService } from '../../../services/cityService';

export const SocialFeedManager = ({ feedType = 'city' }) => {
  const isCityFeed = feedType === 'city';

  // Filter States
  const [scopesList, setScopesList] = useState([]); // Cities or Communities
  const [communitiesList, setCommunitiesList] = useState([]);
  const [selectedScope, setSelectedScope] = useState(''); // Scope ID or City Name
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedSubCommunity, setSelectedSubCommunity] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'deleted' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Data & UI States
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const activeCommunityId = isCityFeed ? selectedCommunity : selectedScope;
  const selectedCommunityRecord = communitiesList.find(item => String(item.id || item._id) === activeCommunityId);
  const selectedSubCommunityRecord = selectedCommunityRecord?.subCommunities?.find(sub =>
    String(sub.name || '').toLowerCase() === selectedSubCommunity.toLowerCase()
  );
  const configuredCities = selectedSubCommunityRecord?.cityOptions?.length
    ? selectedSubCommunityRecord.cityOptions
    : selectedSubCommunityRecord?.cityIds?.length
      ? selectedSubCommunityRecord.cityIds
      : (selectedCommunityRecord?.cityOptions?.length ? selectedCommunityRecord.cityOptions : (selectedCommunityRecord?.cityIds || []));
  const cityOptions = [...new Map([
    ...configuredCities.map(item => typeof item === 'object' ? item : { name: '' }),
    ...(selectedCommunityRecord?.city ? [{ name: selectedCommunityRecord.city }] : [])
  ].filter(item => item.name).map(item => [String(item.name).toLowerCase(), item])).values()];

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load baseline scopes (Cities or Communities)
  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const communities = await socialFeedService.fetchCommunitiesForFilter();
        setCommunitiesList(communities || []);
        if (isCityFeed) {
          const cities = await cityService.fetchCities();
          setScopesList(cities || []);
        } else {
          setScopesList(communities || []);
        }
      } catch (err) {
        console.error('Failed to load filter scopes:', err);
      }
    };
    fetchScopes();
  }, [isCityFeed]);

  // Main data fetcher
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      if (isCityFeed) {
        const result = await socialFeedService.fetchCityFeed({
          city: selectedScope,
          communityId: selectedCommunity,
          subCommunity: selectedSubCommunity,
          status: statusFilter,
          search: debouncedSearch,
          page,
          limit,
        });
        setPosts(result.posts || []);
        setPagination({
          total: result.total,
          totalPages: result.totalPages,
          page: result.page,
          limit,
        });
      } else {
        const result = await socialFeedService.fetchCommunityFeed({
          communityId: selectedScope,
          subCommunity: selectedSubCommunity,
          city: selectedCity,
          status: statusFilter,
          search: debouncedSearch,
          page,
          limit,
        });
        setPosts(result.posts || []);
        setPagination({
          total: result.total,
          totalPages: result.totalPages,
          page: result.page,
          limit,
        });
      }
    } catch (err) {
      console.error('Failed to fetch social posts:', err);
    } finally {
      setLoading(false);
    }
  }, [isCityFeed, page, limit, selectedScope, selectedCommunity, selectedSubCommunity, selectedCity, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleResetFilters = () => {
    setSelectedScope('');
    setSelectedCommunity('');
    setSelectedSubCommunity('');
    setSelectedCity('');
    setStatusFilter('active');
    setSearchQuery('');
    setPage(1);
  };

  // Moderation Handlers — Delete Post by ID
  const handleSoftDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post from the platform?')) return;
    try {
      setActionLoading(true);
      await socialFeedService.deletePost(postId);
      showToast('Post deleted successfully');
      fetchPosts();
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (postId) => {
    try {
      setActionLoading(true);
      await axiosPrivate.post(`/admin/social/posts/${postId}/restore`);
      showToast('Post restored successfully');
      fetchPosts();
    } catch (err) {
      alert('Failed to restore post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDrawer = (postId) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPostId(null);
  };

  // Helper for Post Type Badge
  const renderMediaTypeBadge = (media = []) => {
    if (!media || media.length === 0) {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-slate-100 text-slate-600 rounded flex items-center gap-1 w-fit">
          <FileText className="w-3 h-3" /> Text
        </span>
      );
    }
    const hasVideo = media.some(m => m.type === 'video');
    if (hasVideo) {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-purple-50 text-purple-700 rounded flex items-center gap-1 w-fit">
          <Video className="w-3 h-3" /> Video
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10.5px] font-bold bg-blue-50 text-blue-700 rounded flex items-center gap-1 w-fit">
        <ImageIcon className="w-3 h-3" /> Image ({media.length})
      </span>
    );
  };

  return (
    <div className="w-full max-w-none mx-0 p-3 sm:p-4 lg:p-5 space-y-4 sm:space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              {isCityFeed ? <MapPin className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isCityFeed ? 'City Feed Moderation' : 'Community Feed Moderation'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time monitoring and moderation of live posts created in the Member Panel
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            onClick={fetchPosts}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md text-center animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Smart Filter Bar */}
      <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" /> Smart Filters
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Scope Dropdown (City or Community) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {isCityFeed ? 'City' : 'Community'}
            </label>
            <select
              value={selectedScope}
              onChange={(e) => {
                setSelectedScope(e.target.value);
                if (!isCityFeed) {
                  setSelectedSubCommunity('');
                  setSelectedCity('');
                }
                setPage(1);
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{isCityFeed ? 'All Cities' : 'All Communities'}</option>
              {scopesList.map((item) => {
                const val = isCityFeed ? item.name : (item._id || item.id);
                const label = item.name + (isCityFeed && item.state ? ` (${item.state})` : '');
                return (
                  <option key={item.id || item._id || item.name} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {isCityFeed && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Community</label>
              <select
                value={selectedCommunity}
                onChange={(e) => { setSelectedCommunity(e.target.value); setSelectedSubCommunity(''); setPage(1); }}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Communities</option>
                {communitiesList.map(community => (
                  <option key={community.id || community._id} value={community.id || community._id}>{community.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Subcommunity</label>
            <select
              value={selectedSubCommunity}
              onChange={(e) => { setSelectedSubCommunity(e.target.value); setSelectedCity(''); setPage(1); }}
              disabled={!selectedCommunityRecord}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">All Subcommunities</option>
              {(selectedCommunityRecord?.subCommunities || []).map((sub) => (
                <option key={sub._id || sub.name} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>

          {!isCityFeed && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
                disabled={!selectedCommunityRecord || cityOptions.length === 0}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">All Cities</option>
                {cityOptions.map((item) => (
                  <option key={item._id || item.name} value={item.name}>{item.name}{item.state ? ` (${item.state})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Post Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Post Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active Posts</option>
              <option value="deleted">Deleted Posts (Soft Deleted)</option>
              <option value="all">All Posts (Active & Deleted)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="User name or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-600">No posts found matching criteria</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <>
          <div className="xl:hidden p-3 sm:p-4 space-y-3">
            {posts.map((post) => {
              const author = post.userId || post.authorId;
              const mediaList = post.media?.length
                ? post.media
                : (post.images || []).map(url => ({ type: 'image', url }));
              return (
                <article key={post._id} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {author?.avatar ? (
                        <img src={author.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                          {author?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{author?.name || 'Member'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{post.communityId?.name || 'All Communities'}{post.resolvedCity ? ` · ${post.resolvedCity}` : ''}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full ${post.isDeleted ? 'bg-rose-100 text-rose-700' : post.status === 'archived' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {post.isDeleted ? 'Deleted' : post.status === 'archived' ? 'Hidden' : 'Active'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    {mediaList[0] && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 flex items-center justify-center">
                        {mediaList[0].type === 'video' ? <Video className="w-5 h-5 text-white" /> : <img src={mediaList[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                    )}
                    <p className="text-sm text-slate-700 line-clamp-3 break-words">{post.content || '(No text content)'}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      {renderMediaTypeBadge(mediaList)}
                      <span className="whitespace-nowrap">{new Date(post.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1 text-rose-600"><Heart className="w-3.5 h-3.5 fill-rose-500" />{post.likesCount || 0}</span>
                      <span className="flex items-center gap-1 text-indigo-600"><MessageCircle className="w-3.5 h-3.5" />{post.commentsCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenDrawer(post._id)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600" aria-label="View post details" title="View Details"><Eye className="w-4 h-4" /></button>
                      {post.isDeleted ? (
                        <button onClick={() => handleRestore(post._id)} disabled={actionLoading} className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100" aria-label="Restore post" title="Restore Post"><RotateCcw className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleSoftDelete(post._id)} disabled={actionLoading} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" aria-label="Delete post" title="Delete Post"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">{isCityFeed ? 'City' : 'Community'}</th>
                  <th className="py-3.5 px-4">Post Preview</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-center">Engagement</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {posts.map((post) => {
                  const author = post.userId || post.authorId;
                  const mediaList = (post.media && post.media.length > 0) 
                    ? post.media 
                    : (post.images && post.images.length > 0) 
                      ? post.images.map(url => ({ type: 'image', url })) 
                      : [];

                  return (
                    <tr key={post._id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Author */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {author?.avatar ? (
                            <img src={author.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {author?.name ? author.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{author?.name || 'Member'}</p>
                            <p className="text-[10.5px] text-slate-400">{author?.role || 'User'}</p>
                          </div>
                        </div>
                      </td>

                    {/* Scope (City or Community) */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {isCityFeed 
                          ? (post.cityId?.name || 'All Cities') 
                          : (post.communityId?.name || 'All Communities')}
                      </span>
                    </td>

                    {/* Post Preview & Thumbnail */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center space-x-2.5">
                        {mediaList.length > 0 && (
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200">
                            {mediaList[0].type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                                <Video className="w-4 h-4" />
                              </div>
                            ) : (
                              <img src={mediaList[0].url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <p className="truncate text-slate-700 text-xs font-normal">
                          {post.content || '(No text content)'}
                        </p>
                      </div>
                    </td>

                    {/* Post Type */}
                    <td className="py-3.5 px-4">
                      {renderMediaTypeBadge(mediaList)}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {new Date(post.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>

                    {/* Engagement Counters */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center space-x-3 text-slate-600 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <span className="flex items-center gap-1 text-rose-600">
                          <Heart className="w-3.5 h-3.5 fill-rose-500" /> {post.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-600">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount || 0}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                        post.isDeleted 
                          ? 'bg-rose-100 text-rose-700' 
                          : post.status === 'archived' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {post.isDeleted ? 'Deleted' : post.status === 'archived' ? 'Hidden' : 'Active'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenDrawer(post._id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {post.isDeleted ? (
                          <button
                            onClick={() => handleRestore(post._id)}
                            disabled={actionLoading}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Restore Post"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(post._id)}
                            disabled={actionLoading}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Soft Delete Post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination Bar */}
        {posts.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <span className="text-slate-800 font-bold">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="text-slate-800 font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-800 font-bold">{pagination.total}</span> posts
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-slate-500 font-semibold">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2 text-slate-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Details Drawer */}
      <PostDetailDrawer
        postId={selectedPostId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onPostUpdated={fetchPosts}
      />
    </div>
  );
};

export default SocialFeedManager;
