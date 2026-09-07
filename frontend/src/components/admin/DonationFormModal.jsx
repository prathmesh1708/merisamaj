import React, { useState, useEffect } from 'react';
import { X, Heart, Globe, Building2, CheckSquare, Square, Search, Image as ImageIcon, IndianRupee, Layers, Plus, Trash2 } from 'lucide-react';
import adminDonationApi from '../../api/adminDonationApi';

export const DonationFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  donation = null,
  isSubmitting = false
}) => {
  const [activeTab, setActiveTab] = useState('targeting'); // 'targeting' | 'basic' | 'financials'

  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    targetAmount: '',
    minDonation: '1',
    category: 'General Relief',
    priority: 'Medium',
    city: '',
    startDate: '',
    endDate: '',
    coverImage: '',
    status: 'Active',
    targetScope: 'global', // 'global' | 'targeted'
    targetedCommunities: []
  });

  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');

  // Categories dynamic state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await adminDonationApi.getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load donation categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e?.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsSavingCategory(true);
      const res = await adminDonationApi.createCategory({ name: newCategoryName.trim() });
      if (res.success && res.data) {
        await fetchCategories();
        setFormData(prev => ({ ...prev, category: res.data.name }));
        setNewCategoryName('');
        setIsAddingCategory(false);
      } else {
        alert(res.message || 'Failed to create category');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      const res = await adminDonationApi.deleteCategory(catId);
      if (res.success) {
        await fetchCategories();
        if (formData.category === catName) {
          setFormData(prev => ({ ...prev, category: 'General Relief' }));
        }
      } else {
        alert(res.message || 'Failed to delete category');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete category');
    }
  };

  // Fetch communities list for selection
  useEffect(() => {
    if (!isOpen) return;
    fetchCategories();
    const fetchCommList = async () => {
      try {
        setLoadingCommunities(true);
        const res = await adminDonationApi.getCommunities();
        if (res.success && Array.isArray(res.data)) {
          setCommunities(res.data);
        } else if (Array.isArray(res)) {
          setCommunities(res);
        }
      } catch (err) {
        console.error('Failed to load communities for campaign targeting:', err);
      } finally {
        setLoadingCommunities(false);
      }
    };
    fetchCommList();
  }, [isOpen]);

  useEffect(() => {
    if (donation) {
      const isGlobal = donation.isGlobalCampaign === true || donation.visibility === 'All Members' || (!donation.targetedCommunities || donation.targetedCommunities.length === 0);
      const initialTargeted = Array.isArray(donation.targetedCommunities)
        ? donation.targetedCommunities.map(c => (typeof c === 'object' ? c._id : c))
        : [];

      const formatDateForInput = (d) => {
        if (!d) return '';
        try {
          return new Date(d).toISOString().split('T')[0];
        } catch (e) {
          return '';
        }
      };

      setFormData({
        title: donation.title || '',
        shortDescription: donation.shortDescription || '',
        description: donation.description || '',
        targetAmount: donation.targetAmount || '',
        minDonation: donation.minDonation || '1',
        category: donation.category || 'General',
        priority: donation.priority || 'Medium',
        city: donation.city || '',
        startDate: formatDateForInput(donation.startDate),
        endDate: formatDateForInput(donation.endDate),
        coverImage: donation.coverImage || donation.bannerImage || '',
        status: donation.status || 'Active',
        targetScope: isGlobal ? 'global' : 'targeted',
        targetedCommunities: initialTargeted
      });
    } else {
      setFormData({
        title: '',
        shortDescription: '',
        description: '',
        targetAmount: '',
        minDonation: '1',
        category: 'General',
        priority: 'Medium',
        city: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        coverImage: '',
        status: 'Active',
        targetScope: 'global',
        targetedCommunities: []
      });
    }
  }, [donation, isOpen]);

  if (!isOpen) return null;

  const toggleCommunity = (id) => {
    setFormData(prev => {
      const exists = prev.targetedCommunities.includes(id);
      return {
        ...prev,
        targetedCommunities: exists
          ? prev.targetedCommunities.filter(cId => cId !== id)
          : [...prev.targetedCommunities, id]
      };
    });
  };

  const handleSelectAllCommunities = () => {
    setFormData(prev => ({
      ...prev,
      targetedCommunities: communities.map(c => c._id)
    }));
  };

  const handleClearAllCommunities = () => {
    setFormData(prev => ({
      ...prev,
      targetedCommunities: []
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please provide a Campaign Title.');
      setActiveTab('basic');
      return;
    }

    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      alert('Please provide a valid Target Amount.');
      setActiveTab('financials');
      return;
    }

    if (formData.targetScope === 'targeted' && formData.targetedCommunities.length === 0) {
      alert('Please select at least one targeted community or switch to All Communities (Global).');
      setActiveTab('targeting');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      targetAmount: Number(formData.targetAmount),
      minDonation: Number(formData.minDonation) || 1,
      category: formData.category,
      priority: formData.priority,
      city: formData.city.trim(),
      startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      coverImage: formData.coverImage.trim(),
      status: formData.status,
      targetScope: formData.targetScope === 'global' ? 'All Communities / All Members' : 'Selected Communities',
      isGlobalCampaign: formData.targetScope === 'global',
      targetedCommunities: formData.targetScope === 'global' ? [] : formData.targetedCommunities
    };

    onSubmit(payload);
  };

  const filteredCommunities = communities.filter(c => {
    if (!communitySearch.trim()) return true;
    const q = communitySearch.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || (c.code && c.code.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {donation ? 'Edit Donation Campaign' : 'Create New Donation Campaign'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Configure global/targeted campaign settings & visibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('targeting')}
            className={`py-3 px-2 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'targeting'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe size={14} /> Target Scope
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-2 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={14} /> Basic Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={`py-3 px-2 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'financials'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee size={14} /> Financials & Dates
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-semibold text-slate-700">
          
          {/* TAB 1: TARGETING */}
          {activeTab === 'targeting' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Target Scope *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, targetScope: 'global' })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      formData.targetScope === 'global'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.targetScope === 'global' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">All Communities (Global)</h4>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Campaign is published globally to all members across all registered communities.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, targetScope: 'targeted' })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      formData.targetScope === 'targeted'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formData.targetScope === 'targeted' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Selected Communities</h4>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Restrict campaign visibility strictly to chosen target communities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Multi-Select Section */}
              {formData.targetScope === 'targeted' && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Choose Target Communities</span>
                      <span className="text-[11px] text-slate-500 block font-normal">
                        Selected: <span className="font-bold text-indigo-600">{formData.targetedCommunities.length}</span> of {communities.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCommunities}
                        className="px-2.5 py-1 text-[11px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllCommunities}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search community name or code..."
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checkbox Grid */}
                  {loadingCommunities ? (
                    <div className="p-6 text-center text-slate-500 font-semibold text-xs">
                      Loading community directory...
                    </div>
                  ) : filteredCommunities.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No communities found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredCommunities.map((comm) => {
                        const isChecked = formData.targetedCommunities.includes(comm._id);
                        return (
                          <div
                            key={comm._id}
                            onClick={() => toggleCommunity(comm._id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="block truncate text-xs">{comm.name}</span>
                              {comm.code && (
                                <span className="text-[10px] text-slate-400 font-normal block">({comm.code})</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Community Health & Medical Relief Drive"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Category *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setIsAddingCategory(prev => !prev); setIsManagingCategories(false); }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="Create New Category"
                      >
                        <Plus size={11} /> New
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsManagingCategories(prev => !prev); setIsAddingCategory(false); }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="Manage / Delete Categories"
                      >
                        Manage
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Category Form */}
                  {isAddingCategory && (
                    <div className="mb-2 p-2 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Create Category</p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. Gau Seva, Disaster Relief..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                          className="flex-1 bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={isSavingCategory || !newCategoryName.trim()}
                          onClick={handleCreateCategory}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          {isSavingCategory ? 'Saving...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manage / Delete Categories Drawer/List */}
                  {isManagingCategories && (
                    <div className="mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-40 overflow-y-auto animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Delete / Manage Categories</p>
                        <button
                          type="button"
                          onClick={() => setIsManagingCategories(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {categories.map(cat => (
                          <div key={cat._id || cat.key || cat.name} className="py-1 flex items-center justify-between text-xs">
                            <span className="text-slate-700 font-medium truncate">{cat.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat._id, cat.name)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer ml-2"
                              title={`Delete ${cat.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative flex items-center">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer pr-14"
                    >
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <option key={cat._id || cat.key || cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="General Relief">General Relief</option>
                          <option value="Health & Medical">Health & Medical</option>
                          <option value="Education & Scholarships">Education & Scholarships</option>
                          <option value="Temple & Infrastructure">Temple & Infrastructure</option>
                          <option value="Social Welfare">Social Welfare</option>
                          <option value="Event Funding">Event Funding</option>
                        </>
                      )}
                    </select>

                    {/* Quick Delete Button for Selected Category */}
                    {(() => {
                      const selectedCatObj = categories.find(c => c.name === formData.category);
                      if (!selectedCatObj) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(selectedCatObj._id, selectedCatObj.name)}
                          className="absolute right-7 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={`Delete "${selectedCatObj.name}"`}
                        >
                          <Trash2 size={13} />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="A brief summary for cards and lists..."
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Detailed information about the cause and fund utilization..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Banner / Cover Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Active">Active (Published & Accepting Donations)</option>
                  <option value="Draft">Draft (Hidden from Members)</option>
                  <option value="Closed">Closed (Visible but Blocked from Donations)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIALS & DATES */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Target Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="50000"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Minimum Donation (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.minDonation}
                    onChange={(e) => setFormData({ ...formData, minDonation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  City (Optional Filter)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indore"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-medium">
              {formData.targetScope === 'global' ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1"><Globe size={12} /> Target: All Communities</span>
              ) : (
                <span className="text-indigo-600 font-bold flex items-center gap-1"><Building2 size={12} /> Target: {formData.targetedCommunities.length} Communities</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                {isSubmitting ? 'Saving...' : (donation ? 'Update Campaign' : 'Create Campaign')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationFormModal;
