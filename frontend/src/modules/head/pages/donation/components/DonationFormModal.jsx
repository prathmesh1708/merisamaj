import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, IndianRupee, Image, Info, Users, Settings, Search, ChevronDown, ChevronUp, Check, Upload, Trash2, Plus } from 'lucide-react';
import { useData } from '../../../../member/context/DataProvider';
import headDonationService from '../../../../../core/api/headDonationService';

const DonationFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: 'General Relief',
    targetAmount: '',
    minDonation: 1,
    visibility: 'All Members',
    locations: [],
    targetedMembers: [],
    status: 'Published',
    bannerImage: ''
  });

  // Dynamic Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await headDonationService.getCategories();
      if (res && (res.data || Array.isArray(res))) {
        setCategories(res.data || res);
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
      const res = await headDonationService.createCategory({ name: newCategoryName.trim() });
      if (res) {
        await fetchCategories();
        const createdName = res.data?.name || res.name || newCategoryName.trim();
        setFormData(prev => ({ ...prev, category: createdName }));
        setNewCategoryName('');
        setIsAddingCategory(false);
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
      await headDonationService.deleteCategory(catId);
      await fetchCategories();
      if (formData.category === catName) {
        setFormData(prev => ({ ...prev, category: 'General Relief' }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete category');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        shortDescription: initialData.shortDescription || '',
        description: initialData.description || '',
        category: initialData.category || 'General Relief',
        targetAmount: initialData.targetAmount || '',
        minDonation: initialData.minDonation || 1,
        visibility: initialData.visibility || 'All Locations',
        locations: initialData.locations || [],
        targetedMembers: initialData.targetedMembers || [],
        status: initialData.status || 'Draft',
        bannerImage: initialData.bannerImage || ''
      });
    }
  }, [initialData]);

  // Use Data context to get members
  const { members = [] } = useData() || {};

  const uniqueCities = useMemo(() => {
    return [...new Set(members.map(m => m.city).filter(Boolean))].sort();
  }, [members]);

  const uniqueCommunities = useMemo(() => {
    return [...new Set(members.map(m => m.community).filter(Boolean))].sort();
  }, [members]);

  const [expandedGroup, setExpandedGroup] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');

  const toggleLocation = (loc) => {
    setFormData(prev => {
      const locations = prev.locations.includes(loc)
        ? prev.locations.filter(l => l !== loc)
        : [...prev.locations, loc];
      return { ...prev, locations };
    });
  };

  const toggleMember = (memberId) => {
    setFormData(prev => {
      const targetedMembers = prev.targetedMembers.includes(memberId)
        ? prev.targetedMembers.filter(id => id !== memberId)
        : [...prev.targetedMembers, memberId];
      return { ...prev, targetedMembers };
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, bannerImage: file }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, bannerImage: file }));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, bannerImage: '' }));
  };

  const imagePreview = useMemo(() => {
    if (!formData.bannerImage) return null;
    if (formData.bannerImage instanceof File) {
      return URL.createObjectURL(formData.bannerImage);
    }
    return formData.bannerImage;
  }, [formData.bannerImage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e, field) => {
    const value = e.target.value;
    const arrayValues = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: arrayValues }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please provide a Campaign Title in the Basic Info tab.');
      setActiveTab('basic');
      return;
    }
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      alert('Please provide a valid Target Amount in the Financials tab.');
      setActiveTab('financials');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {initialData ? 'Edit Campaign' : 'Create New Campaign'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Configure donation details and visibility.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30 flex flex-row md:flex-col p-3 md:p-4 gap-2 overflow-x-auto hide-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'basic' ? 'bg-brand-50 text-brand-primary' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Info size={16} /> Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('financials')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'financials' ? 'bg-brand-50 text-brand-primary' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <IndianRupee size={16} /> Financials
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('visibility')}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'visibility' ? 'bg-brand-50 text-brand-primary' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Users size={16} /> Visibility
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Title *</label>
                      <input 
                        type="text" 
                        name="title" 
                        required
                        value={formData.title} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        placeholder="e.g. Samaj Bhawan Renovation Fund"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-semibold text-gray-700">Category *</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setIsAddingCategory(prev => !prev); setIsManagingCategories(false); }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-secondary bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            title="Create New Category"
                          >
                            <Plus size={13} /> New Category
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsManagingCategories(prev => !prev); setIsAddingCategory(false); }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            title="Manage / Delete Categories"
                          >
                            Manage
                          </button>
                        </div>
                      </div>

                      {/* Inline Add Category Form */}
                      {isAddingCategory && (
                        <div className="mb-3 p-3 bg-brand-50/60 border border-brand-primary/20 rounded-xl space-y-2 animate-in fade-in duration-150">
                          <p className="text-xs font-bold text-brand-primary uppercase tracking-wider">Create New Category</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Gau Seva, Disaster Relief..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                              className="flex-1 bg-white border border-brand-primary/30 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/20"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={isSavingCategory || !newCategoryName.trim()}
                              onClick={handleCreateCategory}
                              className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                            >
                              {isSavingCategory ? 'Saving...' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Manage / Delete Categories Drawer/List */}
                      {isManagingCategories && (
                        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 max-h-44 overflow-y-auto animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Delete / Manage Categories</p>
                            <button
                              type="button"
                              onClick={() => setIsManagingCategories(false)}
                              className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {categories.map(cat => (
                              <div key={cat._id || cat.key || cat.name} className="py-1.5 flex items-center justify-between text-sm">
                                <span className="text-gray-700 font-medium truncate">{cat.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat._id, cat.name)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer ml-2"
                                  title={`Delete ${cat.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="relative flex items-center">
                        <select 
                          name="category"
                          value={formData.category} 
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary outline-none transition-all pr-12"
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

                        {/* Quick Delete for Selected Category */}
                        {(() => {
                          const selectedCatObj = categories.find(c => c.name === formData.category);
                          if (!selectedCatObj) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(selectedCatObj._id, selectedCatObj.name)}
                              className="absolute right-8 p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title={`Delete "${selectedCatObj.name}" category`}
                            >
                              <Trash2 size={14} />
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                      <select 
                        name="status"
                        value={formData.status} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary outline-none transition-all"
                      >
                        <option value="Published">Active / Published</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Short Description</label>
                      <input 
                        type="text" 
                        name="shortDescription" 
                        value={formData.shortDescription} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        placeholder="A brief summary for the card view"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Description</label>
                      <textarea 
                        name="description" 
                        value={formData.description} 
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all resize-none"
                        placeholder="Detailed information about the cause..."
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Banner Image</label>
                      
                      {imagePreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 h-40 bg-gray-50 flex items-center justify-center">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-md"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          className="border-2 border-dashed border-gray-300 hover:border-brand-primary rounded-2xl p-6 text-center transition-colors cursor-pointer bg-gray-50/50 flex flex-col items-center justify-center gap-2 group"
                          onClick={() => document.getElementById('banner-image-file').click()}
                        >
                          <div className="w-10 h-10 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                            <Upload size={18} className="text-brand-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">Click to upload or drag & drop</p>
                            <p className="text-[10px] text-gray-500 mt-1">PNG, JPG or JPEG (Max 5MB)</p>
                          </div>
                          <input
                            type="file"
                            id="banner-image-file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'financials' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Target Amount (₹) *</label>
                      <input 
                        type="number" 
                        name="targetAmount" 
                        required
                        value={formData.targetAmount} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Minimum Donation (₹)</label>
                      <input 
                        type="number" 
                        name="minDonation" 
                        value={formData.minDonation} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        placeholder="1"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'visibility' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Target Audience (Visibility)</label>
                      <select 
                        name="visibility"
                        value={formData.visibility} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary outline-none transition-all"
                      >
                        <option value="All Members">All Members</option>
                      </select>
                      


                      {formData.visibility === 'Selected Cities' && (
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Cities & Members</label>
                          
                          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                            {uniqueCities.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">No cities found in member directory</div>
                            ) : (
                              <div className="max-h-[300px] overflow-y-auto">
                                {uniqueCities.map(city => {
                                  const isCitySelected = formData.locations.includes(city);
                                  const isExpanded = expandedGroup === city;
                                  const cityMembers = members.filter(m => m.city === city);
                                  const filteredMembers = cityMembers.filter(m => 
                                    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                    (m.phone && m.phone.includes(memberSearch))
                                  );

                                  return (
                                    <div key={city} className="border-b border-gray-100 last:border-b-0">
                                      <div className={`flex items-center justify-between p-3 transition-colors ${isCitySelected ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleLocation(city)}
                                            className={`w-5 h-5 rounded flex items-center justify-center border ${isCitySelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}
                                          >
                                            {isCitySelected && <Check size={14} />}
                                          </button>
                                          <div>
                                            <span className="font-semibold text-gray-800">{city}</span>
                                            <span className="text-xs text-gray-500 ml-2">({cityMembers.length} members)</span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedGroup(isExpanded ? null : city);
                                            setMemberSearch('');
                                          }}
                                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                                        >
                                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                      </div>
                                      
                                      {isExpanded && (
                                        <div className="p-3 bg-gray-50 border-t border-gray-100">
                                          <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                              type="text"
                                              placeholder={`Search members in ${city}...`}
                                              value={memberSearch}
                                              onChange={(e) => setMemberSearch(e.target.value)}
                                              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brand-primary outline-none"
                                            />
                                          </div>
                                          
                                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredMembers.length > 0 ? (
                                              filteredMembers.map(member => {
                                                const isMemberSelected = formData.targetedMembers.includes(member.id);
                                                return (
                                                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleMember(member.id)}
                                                      className={`w-4 h-4 rounded flex items-center justify-center border ${isMemberSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}
                                                    >
                                                      {isMemberSelected && <Check size={12} />}
                                                    </button>
                                                    <div className="flex-1">
                                                      <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                                                      <p className="text-xs text-gray-500">{member.phone || member.email || 'No contact info'}</p>
                                                    </div>
                                                  </div>
                                                )
                                              })
                                            ) : (
                                              <p className="text-xs text-gray-500 text-center py-2">No members found matching "{memberSearch}"</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {formData.visibility === 'Selected Communities' && (
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Communities & Members</label>
                          
                          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                            {uniqueCommunities.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">No communities found in member directory</div>
                            ) : (
                              <div className="max-h-[300px] overflow-y-auto">
                                {uniqueCommunities.map(community => {
                                  const isCommunitySelected = formData.locations.includes(community);
                                  const isExpanded = expandedGroup === community;
                                  const communityMembers = members.filter(m => m.community === community);
                                  const filteredMembers = communityMembers.filter(m => 
                                    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                    (m.phone && m.phone.includes(memberSearch))
                                  );

                                  return (
                                    <div key={community} className="border-b border-gray-100 last:border-b-0">
                                      <div className={`flex items-center justify-between p-3 transition-colors ${isCommunitySelected ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleLocation(community)}
                                            className={`w-5 h-5 rounded flex items-center justify-center border ${isCommunitySelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}
                                          >
                                            {isCommunitySelected && <Check size={14} />}
                                          </button>
                                          <div>
                                            <span className="font-semibold text-gray-800">{community}</span>
                                            <span className="text-xs text-gray-500 ml-2">({communityMembers.length} members)</span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedGroup(isExpanded ? null : community);
                                            setMemberSearch('');
                                          }}
                                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                                        >
                                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                      </div>
                                      
                                      {isExpanded && (
                                        <div className="p-3 bg-gray-50 border-t border-gray-100">
                                          <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                              type="text"
                                              placeholder={`Search members in ${community}...`}
                                              value={memberSearch}
                                              onChange={(e) => setMemberSearch(e.target.value)}
                                              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brand-primary outline-none"
                                            />
                                          </div>
                                          
                                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredMembers.length > 0 ? (
                                              filteredMembers.map(member => {
                                                const isMemberSelected = formData.targetedMembers.includes(member.id);
                                                return (
                                                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleMember(member.id)}
                                                      className={`w-4 h-4 rounded flex items-center justify-center border ${isMemberSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}
                                                    >
                                                      {isMemberSelected && <Check size={12} />}
                                                    </button>
                                                    <div className="flex-1">
                                                      <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                                                      <p className="text-xs text-gray-500">{member.phone || member.email || 'No contact info'}</p>
                                                    </div>
                                                  </div>
                                                )
                                              })
                                            ) : (
                                              <p className="text-xs text-gray-500 text-center py-2">No members found matching "{memberSearch}"</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {formData.visibility === 'Selected Members' && (() => {
                        const filteredAllMembers = members.filter(m => 
                          m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                          (m.phone && m.phone.includes(memberSearch)) ||
                          (m.city && m.city.toLowerCase().includes(memberSearch.toLowerCase()))
                        );
                        
                        return (
                          <div className="mt-4 space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Specific Members</label>
                            
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col h-[300px]">
                              <div className="p-3 border-b border-gray-100 bg-gray-50 shrink-0">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                  <input
                                    type="text"
                                    placeholder="Search members by name, phone, or city..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brand-primary outline-none"
                                  />
                                </div>
                                <div className="mt-2 text-xs font-semibold text-gray-500 flex justify-between items-center">
                                  <span>{formData.targetedMembers.length} member(s) selected</span>
                                  <span>Total {filteredAllMembers.length} members found</span>
                                </div>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {filteredAllMembers.length > 0 ? (
                                  filteredAllMembers.map(member => {
                                    const isMemberSelected = formData.targetedMembers.includes(member.id);
                                    return (
                                      <div key={member.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${isMemberSelected ? 'border-brand-primary/30 bg-brand-50/50' : 'border-transparent hover:bg-gray-50'}`} onClick={() => toggleMember(member.id)}>
                                        <button
                                          type="button"
                                          className={`w-5 h-5 rounded flex items-center justify-center border ${isMemberSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}
                                        >
                                          {isMemberSelected && <Check size={14} />}
                                        </button>
                                        <div className="flex-1">
                                          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                            {member.name}
                                            {member.isVerified && <Check size={12} className="text-emerald-500 bg-emerald-100 rounded-full p-0.5" />}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                                            <span>{member.city || 'No city'}</span>
                                            {member.phone && <span>• {member.phone}</span>}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                      <Users size={20} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium">No members found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Status</label>
                      <select 
                        name="status"
                        value={formData.status} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-primary outline-none transition-all"
                      >
                        <option value="Draft">Draft (Hidden)</option>
                        <option value="Published">Published (Active)</option>
                        <option value="Completed">Completed</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Save size={18} /> {initialData ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DonationFormModal;
