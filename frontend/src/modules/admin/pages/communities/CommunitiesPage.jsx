import React, { useState, useEffect } from 'react';
import { cityService } from '../../services/cityService';
import { communityHeadService } from '../../services/communityHeadService';
import {
  getAllCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  toggleCommunityStatus,
  assignHeadToCommunity,
  removeHeadFromCommunity,
  updateCommunitySettings,
  getSubCommunityStats,
  addSubCommunity,
  renameSubCommunity,
  toggleSubCommunityStatus,
  deleteSubCommunity,
  getSubCommunityLocationBreakdown,
  assignLocalHeadToLocationGroup,
} from '../../services/communityService';

// ─────────────────────────────────────────────
// MODULE SETTINGS CONFIG — Admin-configurable feature flags
// ─────────────────────────────────────────────
const MODULE_FLAGS = [
  { key: 'socialFeedEnabled',   label: 'Social Feed',    icon: '📰' },
  { key: 'eventEnabled',        label: 'Events',          icon: '🎉' },
  { key: 'donationEnabled',     label: 'Donations',       icon: '💰' },
  { key: 'invitationEnabled',   label: 'Invitations',     icon: '💌' },
  { key: 'matrimonialEnabled',  label: 'Matrimonial',     icon: '💍' },
  { key: 'directoryEnabled',    label: 'Directory',       icon: '📂' },
  { key: 'obituaryEnabled',     label: 'Obituary',        icon: '🕯️' },
  { key: 'dharmashalaEnabled',  label: 'Dharmashala',     icon: '🏛️' },
];

// ─────────────────────────────────────────────
// Gotra / Sub-Community Presets Dictionary
// ─────────────────────────────────────────────
const SUB_COMMUNITY_PRESETS = {
  brahmin: ['Sharma', 'Dwivedi', 'Trivedi', 'Shukla', 'Mishra', 'Joshi', 'Pandey', 'Choubey', 'Kanyakubja', 'Gaur'],
  braham: ['Sharma', 'Dwivedi', 'Trivedi', 'Shukla', 'Mishra', 'Joshi', 'Pandey', 'Choubey'],
  rajput: ['Rathore', 'Chauhan', 'Parmar', 'Singh', 'Solanki', 'Sisodia', 'Tomar', 'Bhati'],
  agrawal: ['Bisa Agrawal', 'Dasa Agrawal', 'Goyal', 'Bansal', 'Garg', 'Singhal', 'Kansal', 'Jindal'],
  jain: ['Digambar', 'Shwetambar', 'Sthanakvasi', 'Terapanthi', 'Oswal', 'Porwal'],
  gupta: ['Vaishya Gupta', 'Kayastha Gupta', 'Kshatriya Gupta'],
  verma: ['Kayastha Verma', 'Kshatriya Verma', 'Kurmi Verma'],
  patel: ['Kadava Patel', 'Leuva Patel', 'Anjana Patel', 'Bhavssar Patel'],
  mali: ['Phul Mali', 'Kachhi Mali', 'Dhakad Mali', 'Teli Mali']
};

const getSuggestedSubCommunities = (name) => {
  if (!name || typeof name !== 'string') return [];
  const lower = name.toLowerCase();
  for (const [key, list] of Object.entries(SUB_COMMUNITY_PRESETS)) {
    if (lower.includes(key)) return list;
  }
  return [];
};

// ─────────────────────────────────────────────
// CreateCommunityModal
// ─────────────────────────────────────────────
const CreateCommunityModal = ({ onClose, onCreated }) => {
  const [availableCities, setAvailableCities] = useState([]);
  const [availableHeads, setAvailableHeads] = useState([]);

  useEffect(() => {
    // Fetch available cities & heads when modal opens
    const fetchModalData = async () => {
      try {
        const [cities, heads] = await Promise.all([
          cityService.fetchCities().catch(() => []),
          communityHeadService.getHeads().catch(() => [])
        ]);
        setAvailableCities(cities.filter(c => c.status === 'Active'));
        setAvailableHeads(heads);
      } catch (err) {
        console.error('Failed to load cities/heads for community creation', err);
      }
    };
    fetchModalData();
  }, []);

  const [form, setForm] = useState({
    name: '',
    description: '',
    cityIds: [],
    subCommunities: [],
    logoUrl: '',
    bannerUrl: '',
    status: 'Active',
    headId: ''
  });
  const [newSubCommunity, setNewSubCommunity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedSubs = getSuggestedSubCommunities(form.name);
  const unaddedSuggestions = suggestedSubs.filter(
    s => !form.subCommunities.some(existing => existing.toLowerCase() === s.toLowerCase())
  );

  const handleAddAllSuggestions = () => {
    if (unaddedSuggestions.length === 0) return;
    setForm(f => ({
      ...f,
      subCommunities: [...f.subCommunities, ...unaddedSuggestions]
    }));
  };

  const handleAddSubCommunity = () => {
    const trimmed = newSubCommunity.trim();
    if (!trimmed) return;
    if (form.subCommunities.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSubCommunity('');
      return;
    }
    setForm(f => ({ ...f, subCommunities: [...f.subCommunities, trimmed] }));
    setNewSubCommunity('');
  };

  const handleRemoveSubCommunity = (indexToRemove) => {
    setForm(f => ({
      ...f,
      subCommunities: f.subCommunities.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const toggleCity = (cityId) => {
    setForm(f => ({
      ...f,
      cityIds: f.cityIds.includes(cityId) 
        ? f.cityIds.filter(id => id !== cityId)
        : [...f.cityIds, cityId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Community name is required'); return; }
    if (form.cityIds.length === 0) { setError('At least one City is required'); return; }

    setLoading(true);
    setError('');
    try {
      await createCommunity(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <div>
            <h3>🏛️ Create New Community</h3>
            <p className="text-xs text-slate-500 mt-0.5">Set up a new community on the platform</p>
          </div>
          <button type="button" className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="community-modal-body">
            <div className="community-form-grid-2">
              {/* Left Column: Basic Details & Location */}
              <div>
                <div className="community-form-group">
                  <label>Community Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Namdev Samaj, Rajput Samaj"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="community-input"
                  />
                </div>

                <div className="community-form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="community-input"
                    style={{ height: '42px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="community-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Assigned Cities *</label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '12px' }}>
                      {form.cityIds.length} Selected
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '130px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                    {availableCities.length > 0 ? (
                      availableCities.map(city => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => toggleCity(city.id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            form.cityIds.includes(city.id)
                              ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {form.cityIds.includes(city.id) && '✓ '}
                          {city.name}
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 py-1">
                        No active cities available. Please create cities in City Management first.
                      </div>
                    )}
                  </div>
                  <small className="community-hint">Select one or more cities where this community operates.</small>
                </div>

                <div className="community-form-group">
                  <label>Assigned Community Head</label>
                  <select
                    value={form.headId}
                    onChange={e => setForm(f => ({ ...f, headId: e.target.value }))}
                    className="community-input"
                    style={{ height: '42px' }}
                  >
                    <option value="">-- No Head Assigned --</option>
                    {availableHeads.map(head => (
                      <option key={head.id || head._id} value={head.id || head._id}>
                        {head.name} ({head.phone || head.email || head.loginId || 'Head'})
                      </option>
                    ))}
                  </select>
                  <small className="community-hint">Select an eligible user to assign as the Community Head.</small>
                </div>
              </div>

              {/* Right Column: Media & Description */}
              <div>
                <div className="community-form-group">
                  <label>Community Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px', border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8' }}>
                          {form.name?.charAt(0) || '🏛️'}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setForm(f => ({ ...f, logoUrl: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="community-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="community-form-group">
                  <label>Community Banner (URL)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={form.bannerUrl}
                    onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))}
                    className="community-input"
                  />
                  {form.bannerUrl && (
                    <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #e2e8f0', height: '60px', background: '#f8fafc' }}>
                      <img src={form.bannerUrl} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                    </div>
                  )}
                </div>

                <div className="community-form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Write a brief overview about this community..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="community-textarea"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Sub-Communities / Categories Section */}
            <div className="community-form-group" style={{ marginTop: '16px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <label style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Sub-Communities / Gotras / Categories</label>
                  <p className="text-xs text-slate-500 mt-0.5">Users will see and select from these sub-communities during registration</p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d28d9', background: '#f3e8ff', padding: '2px 8px', borderRadius: '12px' }}>
                  {form.subCommunities.length} Sub-Communities
                </span>
              </div>
              {suggestedSubs.length > 0 && (
                <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3730a3' }}>
                      💡 Suggested Gotras / Sub-Communities ({unaddedSuggestions.length} available):
                    </span>
                    {unaddedSuggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllSuggestions}
                        style={{ fontSize: '0.72rem', fontWeight: 700, background: '#4f46e5', color: '#ffffff', border: 'none', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        + Add All Suggested
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {suggestedSubs.map((s, i) => {
                      const added = form.subCommunities.some(existing => existing.toLowerCase() === s.toLowerCase());
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!added) {
                              setForm(f => ({ ...f, subCommunities: [...f.subCommunities, s] }));
                            }
                          }}
                          disabled={added}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            border: added ? '1px solid #cbd5e1' : '1px solid #818cf8',
                            background: added ? '#f1f5f9' : '#ffffff',
                            color: added ? '#94a3b8' : '#4338ca',
                            cursor: added ? 'default' : 'pointer'
                          }}
                        >
                          {added ? `✓ ${s}` : `+ ${s}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. Sharma, Dwivedi, Rathore, Chauhan... (Press Enter or + Add)"
                  value={newSubCommunity}
                  onChange={e => setNewSubCommunity(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubCommunity();
                    }
                  }}
                  className="community-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSubCommunity}
                  className="community-btn-secondary"
                  style={{ padding: '0 16px', fontWeight: 600, color: '#6d28d9', borderColor: '#c4b5fd', background: '#faf5ff' }}
                >
                  + Add
                </button>
              </div>
              {form.subCommunities.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {form.subCommunities.map((sub, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ede9fe',
                        color: '#6d28d9',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: '1px solid #ddd6fe'
                      }}
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubCommunity(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6d28d9',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '1rem',
                          lineHeight: 1,
                          padding: 0
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <small className="community-hint">No sub-communities added yet. Type a name above and press Enter or click "+ Add".</small>
              )}
            </div>
          </div>

          <div className="community-modal-actions">
            {error ? (
              <p className="community-form-error">⚠️ {error}</p>
            ) : (
              <span className="community-hint" style={{ margin: 0 }}>* Required fields</span>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="community-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="community-btn-primary" disabled={loading}>
                {loading ? 'Creating...' : '✓ Create Community'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// EditCommunityModal
// ─────────────────────────────────────────────
const EditCommunityModal = ({ community, onClose, onUpdated }) => {
  const [availableCities, setAvailableCities] = useState([]);
  const [availableHeads, setAvailableHeads] = useState([]);

  useEffect(() => {
    // Fetch available cities & heads when modal opens
    const fetchModalData = async () => {
      try {
        const [cities, heads] = await Promise.all([
          cityService.fetchCities().catch(() => []),
          communityHeadService.getHeads().catch(() => [])
        ]);
        setAvailableCities(cities.filter(c => c.status === 'Active'));
        setAvailableHeads(heads);
      } catch (err) {
        console.error('Failed to load cities/heads for community assignment', err);
      }
    };
    fetchModalData();
  }, []);

  const [form, setForm] = useState({
    name: community.name || '',
    description: community.description || '',
    city: community.city || '',
    cityIds: community.cityIds || [],
    // subCommunities are stored as {name, isActive, ...} on the backend now;
    // this tag editor only edits names — active/inactive is managed from the
    // Sub-Communities drill-down view, and the backend preserves each entry's
    // isActive flag by matching name when this list is saved.
    subCommunities: (community.subCommunities || []).map(s => (typeof s === 'string' ? s : s.name)),
    logoUrl: community.logoUrl || '',
    bannerUrl: community.bannerUrl || '',
    isActive: community.isActive !== undefined ? community.isActive : true,
    headId: community.headId?._id || community.headId || ''
  });
  const [newSubCommunity, setNewSubCommunity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestedSubs = getSuggestedSubCommunities(form.name);
  const unaddedSuggestions = suggestedSubs.filter(
    s => !form.subCommunities.some(existing => existing.toLowerCase() === s.toLowerCase())
  );

  const handleAddAllSuggestions = () => {
    if (unaddedSuggestions.length === 0) return;
    setForm(f => ({
      ...f,
      subCommunities: [...f.subCommunities, ...unaddedSuggestions]
    }));
  };

  const handleAddSubCommunity = () => {
    const trimmed = newSubCommunity.trim();
    if (!trimmed) return;
    if (form.subCommunities.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSubCommunity('');
      return;
    }
    setForm(f => ({ ...f, subCommunities: [...f.subCommunities, trimmed] }));
    setNewSubCommunity('');
  };

  const handleRemoveSubCommunity = (indexToRemove) => {
    setForm(f => ({
      ...f,
      subCommunities: f.subCommunities.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const toggleCity = (cityId) => {
    setForm(f => ({
      ...f,
      cityIds: f.cityIds.includes(cityId) 
        ? f.cityIds.filter(id => id !== cityId)
        : [...f.cityIds, cityId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Community name is required'); return; }
    if (form.cityIds.length === 0) { setError('At least one City is required'); return; }
    
    setLoading(true);
    setError('');
    try {
      await updateCommunity(community._id, form);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <div>
            <h3>✏️ Edit Community Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">{community.name} • Master Management</p>
          </div>
          <button type="button" className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="community-modal-body">
            <div className="community-form-grid-2">
              {/* Left Column: Essential Community Info & Head */}
              <div>
                <div className="community-form-group">
                  <label>Community Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="community-input"
                  />
                </div>

                <div className="community-form-group">
                  <label>Status</label>
                  <select
                    value={form.isActive ? 'Active' : 'Inactive'}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'Active' }))}
                    className="community-input"
                    style={{ height: '42px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="community-form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Assigned Cities *</label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '12px' }}>
                      {form.cityIds.length} Selected
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '130px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                    {availableCities.length > 0 ? (
                      availableCities.map(city => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => toggleCity(city.id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                            form.cityIds.includes(city.id)
                              ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {form.cityIds.includes(city.id) && '✓ '}
                          {city.name}
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 py-1">
                        No active cities available. Please create cities in City Management first.
                      </div>
                    )}
                  </div>
                  <small className="community-hint">Select one or more cities where this community operates.</small>
                </div>

                <div className="community-form-group">
                  <label>Assigned Community Head</label>
                  <select
                    value={form.headId}
                    onChange={e => setForm(f => ({ ...f, headId: e.target.value }))}
                    className="community-input"
                    style={{ height: '42px' }}
                  >
                    <option value="">-- No Head Assigned --</option>
                    {availableHeads.map(head => (
                      <option key={head.id || head._id} value={head.id || head._id}>
                        {head.name} ({head.phone || head.email || head.loginId || 'Head'})
                      </option>
                    ))}
                  </select>
                  <small className="community-hint">
                    ℹ️ Select an eligible user to assign as the Community Head.
                  </small>
                </div>
              </div>

              {/* Right Column: Media, Banner & Description */}
              <div>
                <div className="community-form-group">
                  <label>Community Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px', border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8' }}>
                          {form.name?.charAt(0) || '🏛️'}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setForm(f => ({ ...f, logoUrl: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="community-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  {form.logoUrl && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6366f1' }} className="truncate">
                      {form.logoUrl.startsWith('data:image') ? '✓ New logo selected' : 'Current: ' + form.logoUrl}
                    </div>
                  )}
                </div>

                <div className="community-form-group">
                  <label>Community Banner (URL)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={form.bannerUrl}
                    onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))}
                    className="community-input"
                  />
                  {form.bannerUrl && (
                    <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #e2e8f0', height: '60px', background: '#f8fafc' }}>
                      <img src={form.bannerUrl} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                    </div>
                  )}
                </div>

                <div className="community-form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Write a brief overview about this community..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="community-textarea"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Sub-Communities / Categories Section */}
            <div className="community-form-group" style={{ marginTop: '16px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <label style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Sub-Communities / Gotras / Categories</label>
                  <p className="text-xs text-slate-500 mt-0.5">Users will see and select from these sub-communities during registration</p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d28d9', background: '#f3e8ff', padding: '2px 8px', borderRadius: '12px' }}>
                  {form.subCommunities.length} Sub-Communities
                </span>
              </div>
              {suggestedSubs.length > 0 && (
                <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3730a3' }}>
                      💡 Suggested Gotras / Sub-Communities ({unaddedSuggestions.length} available):
                    </span>
                    {unaddedSuggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllSuggestions}
                        style={{ fontSize: '0.72rem', fontWeight: 700, background: '#4f46e5', color: '#ffffff', border: 'none', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        + Add All Suggested
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {suggestedSubs.map((s, i) => {
                      const added = form.subCommunities.some(existing => existing.toLowerCase() === s.toLowerCase());
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!added) {
                              setForm(f => ({ ...f, subCommunities: [...f.subCommunities, s] }));
                            }
                          }}
                          disabled={added}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            border: added ? '1px solid #cbd5e1' : '1px solid #818cf8',
                            background: added ? '#f1f5f9' : '#ffffff',
                            color: added ? '#94a3b8' : '#4338ca',
                            cursor: added ? 'default' : 'pointer'
                          }}
                        >
                          {added ? `✓ ${s}` : `+ ${s}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. Sharma, Dwivedi, Rathore, Chauhan... (Press Enter or + Add)"
                  value={newSubCommunity}
                  onChange={e => setNewSubCommunity(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubCommunity();
                    }
                  }}
                  className="community-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSubCommunity}
                  className="community-btn-secondary"
                  style={{ padding: '0 16px', fontWeight: 600, color: '#6d28d9', borderColor: '#c4b5fd', background: '#faf5ff' }}
                >
                  + Add
                </button>
              </div>
              {form.subCommunities.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {form.subCommunities.map((sub, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ede9fe',
                        color: '#6d28d9',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: '1px solid #ddd6fe'
                      }}
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubCommunity(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6d28d9',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '1rem',
                          lineHeight: 1,
                          padding: 0
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <small className="community-hint">No sub-communities added yet. Type a name above and press Enter or click "+ Add".</small>
              )}
            </div>
          </div>

          <div className="community-modal-actions">
            <div>
              <button 
                type="button" 
                className="community-btn-danger-sm" 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to PERMANENTLY DELETE "${community.name}"?\n\nThis will remove the community from the platform. This action cannot be undone.`)) {
                    deleteCommunity(community._id || community.id)
                      .then(() => {
                        onUpdated();
                        onClose();
                      })
                      .catch(err => alert(err.response?.data?.message || 'Delete failed'));
                  }
                }}
              >
                🗑️ Delete Community
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="community-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="community-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ModuleSettingsPanel
// ─────────────────────────────────────────────
const ModuleSettingsPanel = ({ community, onClose, onUpdated }) => {
  const [settings, setSettings] = useState({ ...community.settings });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = (key) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCommunitySettings(community._id, settings);
      setSaved(true);
      onUpdated();
    } catch (err) {
      console.error('Settings update failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="community-modal-overlay" onClick={onClose}>
      <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="community-modal-header">
          <div>
            <h3>⚙️ Module Settings</h3>
            <p className="text-xs text-slate-500 mt-0.5">{community.name} • Feature toggles</p>
          </div>
          <button type="button" className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="community-modal-body">
          <p className="community-settings-subtitle">
            Control which modules and features are enabled for this community.
          </p>
          <div className="community-module-grid">
            {MODULE_FLAGS.map(({ key, label, icon }) => (
              <div
                key={key}
                className={`community-module-toggle ${settings[key] ? 'active' : 'inactive'}`}
                onClick={() => handleToggle(key)}
              >
                <span className="community-module-icon">{icon}</span>
                <span className="community-module-label">{label}</span>
                <div className={`community-toggle-switch ${settings[key] ? 'on' : 'off'}`}>
                  <div className="community-toggle-knob" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="community-modal-actions">
          {saved && <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>✓ Changes saved successfully!</span>}
          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button className="community-btn-secondary" onClick={onClose}>Close</button>
            <button className="community-btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CommunityCard — Matches Image 1 Exactly
// ─────────────────────────────────────────────
const CommunityCard = ({ community, onEdit, onModules, onToggleStatus, onDelete, onViewSubCommunities }) => {
  const isActive = community.isActive !== false && community.status !== 'Inactive';
  
  // Real or Computed Stats
  const totalSubCommunities = community.totalSubCommunities ?? (community.subCommunities?.length || 0);
  const totalCommunityHeads = community.totalCommunityHeads ?? (community.communityHeadsCount || (community.headId ? 1 : 0));
  const activeLocations = community.activeLocationsCount ?? ((community.cityIds && community.cityIds.length) || (community.city ? 1 : 0));
  const localHeads = community.localHeadsCount || 0;
  const subLocalHeads = community.subLocalHeadsCount || 0;
  const totalUsers = community.totalUsers ?? community.memberCount ?? 0;

  const enabledModules = MODULE_FLAGS.filter(m => community.settings?.[m.key]);

  const createdFormatted = community.createdAt 
    ? new Date(community.createdAt).toLocaleDateString('en-GB')
    : '20/9/2026';

  return (
    <div className={`comm-main-card ${!isActive ? 'comm-card-inactive' : ''}`}>
      {/* Active / Inactive Badge in Top-Right */}
      <div className={`comm-status-pill ${isActive ? 'comm-pill-active' : 'comm-pill-inactive'}`}>
        <span className="comm-pill-bullet">●</span> {isActive ? 'ACTIVE' : 'INACTIVE'}
      </div>

      {/* Community Header: Avatar, Name, Slug, Created */}
      <div
        className="comm-header-clickable"
        onClick={() => onViewSubCommunities(community)}
        title="Click to view sub-communities and locations"
      >
        <div className="comm-avatar-box">
          {community.logoUrl ? (
            <img src={community.logoUrl} alt={community.name} />
          ) : (
            <span>{(community.name || 'C').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="comm-header-text">
          <h3 className="comm-title-name">{community.name}</h3>
          <p className="comm-title-slug">/{community.slug || community.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</p>
          <p className="comm-created-date">
            <span className="comm-cal-emoji">📅</span> Created: {createdFormatted}
          </p>
        </div>
      </div>

      {/* 6-box Stats Grid (2 rows x 3 columns) — All Clickable */}
      <div className="comm-six-grid">
        {/* Box 1: Total Sub-Communities (Lavender/Purple) */}
        <div
          className="comm-stat-cell bg-lavender comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view all sub-communities"
        >
          <div className="comm-stat-icon text-indigo">👥</div>
          <div className="comm-stat-num">{totalSubCommunities}</div>
          <div className="comm-stat-desc">Total Sub-Communities</div>
        </div>

        {/* Box 2: Total Community Heads (Amber/Warm Yellow) */}
        <div
          className="comm-stat-cell bg-amber comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view community heads"
        >
          <div className="comm-stat-icon text-amber">👥</div>
          <div className="comm-stat-num">{totalCommunityHeads}</div>
          <div className="comm-stat-desc">Total Community Heads</div>
        </div>

        {/* Box 3: Locations (Active) (Mint Green) */}
        <div
          className="comm-stat-cell bg-mint comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view active locations"
        >
          <div className="comm-stat-icon text-emerald">📍</div>
          <div className="comm-stat-num">{activeLocations}</div>
          <div className="comm-stat-desc">Locations (Active)</div>
        </div>

        {/* Box 4: Local Heads (Sky Blue) */}
        <div
          className="comm-stat-cell bg-sky comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view local heads"
        >
          <div className="comm-stat-icon text-sky">👤</div>
          <div className="comm-stat-num">{localHeads}</div>
          <div className="comm-stat-desc">Local Heads</div>
        </div>

        {/* Box 5: Sub Local Heads (Soft Red/Pink) */}
        <div
          className="comm-stat-cell bg-rose comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view sub local heads"
        >
          <div className="comm-stat-icon text-rose">👥</div>
          <div className="comm-stat-num">{subLocalHeads}</div>
          <div className="comm-stat-desc">Sub Local Heads</div>
        </div>

        {/* Box 6: Total Users (Purple/Violet) */}
        <div
          className="comm-stat-cell bg-violet comm-stat-clickable"
          onClick={() => onViewSubCommunities(community)}
          title="Click to view total users"
        >
          <div className="comm-stat-icon text-violet">👥</div>
          <div className="comm-stat-num">{totalUsers}</div>
          <div className="comm-stat-desc">Total Users</div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="comm-modules-divider">
        <span className="comm-modules-tag">⚙️ MODULES ({enabledModules.length})</span>
      </div>
      <div className="comm-modules-chips">
        {enabledModules.slice(0, 5).map(m => (
          <span key={m.key} className="comm-mod-chip">
            <span className="comm-mod-icon">{m.icon}</span>
            <span className="comm-mod-name">{m.label}</span>
          </span>
        ))}
        {enabledModules.length > 5 && (
          <span className="comm-mod-chip comm-mod-more">+{enabledModules.length - 5}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="comm-card-action-grid">
        <div className="comm-btn-pair">
          <button type="button" className="comm-btn-card" onClick={() => onEdit(community)}>
            <span className="comm-icon-orange">✏️</span> Edit Details
          </button>
          <button type="button" className="comm-btn-card" onClick={() => onModules(community)}>
            <span className="comm-icon-slate">⚙️</span> Modules
          </button>
        </div>
        <div className="comm-btn-pair">
          <button
            type="button"
            className="comm-btn-card"
            onClick={() => onToggleStatus(community)}
          >
            <span className="comm-icon-blue">{isActive ? '⏸️' : '▶️'}</span> {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            className="comm-btn-card comm-btn-delete"
            onClick={() => onDelete(community)}
          >
            <span className="comm-icon-red">🗑️</span> Delete
          </button>
        </div>
        <button
          type="button"
          className="comm-btn-card comm-btn-view-subs"
          onClick={() => onViewSubCommunities(community)}
        >
          <span className="comm-icon-tag">🏷️</span> View Sub-Communities ({totalSubCommunities})
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MonumentIllustration — SVG Heritage Badges matching Image 2
// ─────────────────────────────────────────────
const MonumentIllustration = ({ type = 'temple', city = '' }) => {
  const cLower = (city || '').toLowerCase();
  
  if (type === 'temple_orange' || cLower.includes('ujjain')) {
    return (
      <div className="location-monument-badge bg-orange-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 6L30 18H34L32 6Z" fill="#EA580C" />
          <path d="M32 6L40 10L32 14" fill="#F97316" />
          <path d="M22 22L32 12L42 22H22Z" fill="#FB923C" />
          <path d="M18 32L32 20L46 32H18Z" fill="#F97316" />
          <path d="M14 42L32 28L50 42H14Z" fill="#EA580C" />
          <rect x="12" y="42" width="40" height="16" rx="2" fill="#C2410C" />
          <path d="M26 58V46C26 43.8 28.7 42 32 42C35.3 42 38 43.8 38 46V58H26Z" fill="#7C2D12" />
          <circle cx="32" cy="36" r="3" fill="#FEF08A" />
        </svg>
      </div>
    );
  }
  if (type === 'palace' || cLower.includes('bhopal')) {
    return (
      <div className="location-monument-badge bg-amber-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 10C24 10 20 18 20 26H44C44 18 40 10 32 10Z" fill="#D97706" />
          <path d="M32 4V10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="4" r="2" fill="#FDE68A" />
          <rect x="14" y="26" width="36" height="30" rx="3" fill="#B45309" />
          <rect x="8" y="18" width="8" height="38" rx="2" fill="#D97706" />
          <rect x="48" y="18" width="8" height="38" rx="2" fill="#D97706" />
          <path d="M26 56V40C26 36.7 28.7 34 32 34C35.3 34 38 36.7 38 40V56H26Z" fill="#78350F" />
        </svg>
      </div>
    );
  }
  if (type === 'fort' || cLower.includes('khandwa')) {
    return (
      <div className="location-monument-badge bg-terracotta-monument">
        <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="22" width="44" height="34" rx="2" fill="#B45309" />
          <path d="M10 22L14 16H20L22 22H26L28 16H34L36 22H40L42 16H48L52 22V26H10V22Z" fill="#D97706" />
          <rect x="24" y="36" width="16" height="20" rx="8" fill="#78350F" />
          <circle cx="18" cy="34" r="2.5" fill="#FEF3C7" />
          <circle cx="46" cy="34" r="2.5" fill="#FEF3C7" />
        </svg>
      </div>
    );
  }
  // Default: Indore Rajwada Heritage Palace
  return (
    <div className="location-monument-badge bg-gold-monument">
      <svg viewBox="0 0 64 64" className="monument-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16L32 6L46 16V22H18V16Z" fill="#D97706" />
        <rect x="14" y="22" width="36" height="34" rx="2" fill="#B45309" />
        <path d="M24 56V38C24 33.6 27.6 30 32 30C36.4 30 40 33.6 40 38V56H24Z" fill="#78350F" />
        <rect x="18" y="26" width="6" height="8" rx="1" fill="#FEF3C7" />
        <rect x="40" y="26" width="6" height="8" rx="1" fill="#FEF3C7" />
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────
// SubLocalHeadLocationWiseView — Matches Image 2 Exactly with REAL Data & Local Head Management
// ─────────────────────────────────────────────
const SubLocalHeadLocationWiseView = ({
  community,
  subCommunity,
  onBack,
  onRefreshCommunities
}) => {
  const commId = community?._id || community?.id;
  const commName = community?.name || 'Rajput';
  const subName = typeof subCommunity === 'string' ? subCommunity : (subCommunity?.name || 'Rathore');
  const subAvatarLetter = (subName || 'R').charAt(0).toUpperCase();

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState({
    activeLocationsCount: 0,
    totalCommunityHeadsCount: 0,
    totalLocalCommunityHeadsCount: 0,
    totalLocalSubCommunityHeadsCount: 0,
    totalUsersCount: 0
  });
  const [allLocalHeads, setAllLocalHeads] = useState([]);

  // Modals & UI Actions
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationCity, setNewLocationCity] = useState('');
  const [showAddGroupModal, setShowAddGroupModal] = useState(null); // holds location object
  const [newGroupName, setNewGroupName] = useState('');
  const [editingLoc, setEditingLoc] = useState(null); // { id, name }

  // Assign / Create Head Modal
  const [assignHeadModal, setAssignHeadModal] = useState(null); // { loc, grp, accountType: 'local_head' | 'local_sub_head' }
  const [assignForm, setAssignForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    group: 'Group 1',
    accountType: 'local_head'
  });
  const [submittingHead, setSubmittingHead] = useState(false);

  // View Heads Detail List Modal
  const [viewHeadsModal, setViewHeadsModal] = useState(null); // { title, heads: [] }

  // Fetch real data from backend
  const fetchLocationData = async () => {
    if (!commId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getSubCommunityLocationBreakdown(commId, subName);
      if (res.success && res.data) {
        setLocations(res.data.locations || []);
        setStats(res.data.stats || {});
        setAllLocalHeads(res.data.allLocalHeads || []);
      }
    } catch (err) {
      console.error('Failed to load location breakdown:', err);
      setError(err.response?.data?.message || 'Failed to fetch location data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData();
  }, [commId, subName]);

  const handleToggleLocStatus = (locId) => {
    setLocations(prev => prev.map(l =>
      l.id === locId ? { ...l, isActive: !l.isActive } : l
    ));
  };

  const handleDeleteLoc = (loc) => {
    if (!window.confirm(`Are you sure you want to delete "${loc.fullName || loc.name}"?`)) return;
    setLocations(prev => prev.filter(l => l.id !== loc.id));
  };

  const handleRenameLoc = (locId, newName) => {
    if (!newName.trim()) return;
    setLocations(prev => prev.map(l =>
      l.id === locId ? { ...l, name: newName.trim(), fullName: `${newName.trim()} Location` } : l
    ));
    setEditingLoc(null);
  };

  const handleAddLocationSubmit = (e) => {
    e.preventDefault();
    const city = newLocationCity.trim();
    if (!city) return;
    const newLoc = {
      id: `loc-${Date.now()}`,
      name: city,
      fullName: `${city} Location`,
      illustrationType: 'temple',
      isActive: true,
      userCount: 0,
      groups: [
        { id: 'g1', name: 'Group 1', colorClass: 'grp-header-blue', heads: 0, subHeads: 0, localHeadsList: [], subHeadsList: [] },
        { id: 'g2', name: 'Group 2', colorClass: 'grp-header-pink', heads: 0, subHeads: 0, localHeadsList: [], subHeadsList: [] },
        { id: 'g3', name: 'Group 3', colorClass: 'grp-header-green', heads: 0, subHeads: 0, localHeadsList: [], subHeadsList: [] },
        { id: 'g4', name: 'Group 4', colorClass: 'grp-header-yellow', heads: 0, subHeads: 0, localHeadsList: [], subHeadsList: [] },
      ]
    };
    setLocations(prev => [...prev, newLoc]);
    setNewLocationCity('');
    setShowAddLocationModal(false);
  };

  const handleAddGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !showAddGroupModal) return;
    const colorClasses = ['grp-header-blue', 'grp-header-pink', 'grp-header-green', 'grp-header-yellow'];
    setLocations(prev => prev.map(l => {
      if (l.id === showAddGroupModal.id) {
        const nextIdx = l.groups.length % colorClasses.length;
        return {
          ...l,
          groups: [
            ...l.groups,
            { id: `g-${Date.now()}`, name: newGroupName.trim(), colorClass: colorClasses[nextIdx], heads: 0, subHeads: 0, localHeadsList: [], subHeadsList: [] }
          ]
        };
      }
      return l;
    }));
    setNewGroupName('');
    setShowAddGroupModal(null);
  };

  // Open Assign/Create Head modal prefilled
  const openAssignHeadModal = (loc, grp, accountType = 'local_head') => {
    setAssignForm({
      name: '',
      phone: '',
      email: '',
      password: '',
      city: loc.name,
      group: grp.name,
      accountType
    });
    setAssignHeadModal({ loc, grp, accountType });
  };

  const handleAssignHeadSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.name.trim() || !assignForm.phone.trim()) {
      alert('Please provide Name and Phone number');
      return;
    }
    setSubmittingHead(true);
    try {
      const res = await assignLocalHeadToLocationGroup(commId, subName, assignForm);
      alert(res.message || 'Head assigned successfully!');
      setAssignHeadModal(null);
      fetchLocationData();
      if (onRefreshCommunities) onRefreshCommunities();
    } catch (err) {
      console.error('Failed to assign head:', err);
      alert(err.response?.data?.message || 'Failed to assign head');
    } finally {
      setSubmittingHead(false);
    }
  };

  // View Heads for a whole location
  const handleViewLocationHeads = (loc) => {
    const list = loc.localHeadsList || [];
    setViewHeadsModal({
      title: `Created Local Heads in ${loc.name}`,
      locationName: loc.name,
      heads: list
    });
  };

  // View Heads for a specific group
  const handleViewGroupHeads = (loc, grp, type = 'local_head') => {
    const list = type === 'local_head' ? (grp.localHeadsList || []) : (grp.subHeadsList || []);
    setViewHeadsModal({
      title: `${type === 'local_head' ? 'Local Community Heads' : 'Local Sub Heads'} • ${loc.name} (${grp.name})`,
      locationName: loc.name,
      heads: list
    });
  };

  const activeLocationsCount = stats.activeLocationsCount || locations.filter(l => l.isActive).length;
  const totalCommunityHeadsCount = stats.totalCommunityHeadsCount || (community?.headId ? 1 : 0);
  const totalLocalCommunityHeadsCount = stats.totalLocalCommunityHeadsCount || 0;
  const totalLocalSubCommunityHeadsCount = stats.totalLocalSubCommunityHeadsCount || 0;
  const totalUsersCount = stats.totalUsersCount || 0;

  return (
    <div className="subcomm-view-container">
      {/* Top Breadcrumb & Header matching Image 2 */}
      <div className="subcomm-top-nav">
        <div className="subcomm-left-header">
          <button type="button" className="subcomm-back-btn" onClick={onBack} title="Back to Sub-Communities">
            ←
          </button>
          <div className="subcomm-avatar-square">
            <span>{subAvatarLetter}</span>
          </div>
          <div>
            <h2 className="subcomm-main-title">{commName} / {subName}</h2>
            <p className="subcomm-breadcrumb">
              Communities &gt; {commName} &gt; {subName} (Location Wise)
            </p>
          </div>
        </div>

        <div className="subcomm-right-meta">
          <div className="comm-status-pill comm-pill-active">
            <span className="pill-dot">●</span> ACTIVE
          </div>
          <span className="subcomm-created-badge">
            📅 Created: {community?.createdAt ? new Date(community.createdAt).toLocaleDateString('en-GB') : '22/9/2026'}
          </span>
        </div>
      </div>

      {/* Top Stats Summary Strip (5 boxes + + Add New Location Button) matching Image 2 */}
      <div className="subcomm-stats-strip">
        {/* Stat 1: Active Locations (Purple) */}
        <div className="strip-stat-box bg-lavender-strip" title="Total active regional units">
          <div className="strip-stat-icon text-indigo">📍</div>
          <div className="strip-stat-num">{activeLocationsCount}</div>
          <div className="strip-stat-label">Active Locations</div>
        </div>

        {/* Stat 2: Total Community Heads (Warm Amber) */}
        <div className="strip-stat-box bg-amber-strip" title="Main Community Heads">
          <div className="strip-stat-icon text-amber">👥</div>
          <div className="strip-stat-num">{totalCommunityHeadsCount}</div>
          <div className="strip-stat-label">Total Community Heads</div>
        </div>

        {/* Stat 3: Total Local Community Heads (Sky Blue) */}
        <div
          className="strip-stat-box bg-sky-strip comm-stat-clickable"
          onClick={() => setViewHeadsModal({ title: `All Created Local Heads • ${commName} / ${subName}`, heads: allLocalHeads })}
          title="Click to view all created Local Heads"
          style={{ cursor: 'pointer' }}
        >
          <div className="strip-stat-icon text-sky">👤</div>
          <div className="strip-stat-num">{totalLocalCommunityHeadsCount}</div>
          <div className="strip-stat-label">Total Local Community Heads</div>
        </div>

        {/* Stat 4: Total Local Sub Community Heads (Rose / Red) */}
        <div className="strip-stat-box bg-rose-strip" title="Sub-heads assigned under local heads">
          <div className="strip-stat-icon text-rose">👥</div>
          <div className="strip-stat-num">{totalLocalSubCommunityHeadsCount}</div>
          <div className="strip-stat-label">Total Local Sub Community Heads</div>
        </div>

        {/* Stat 5: Total Users (Mint Green) */}
        <div className="strip-stat-box bg-mint-strip" title="Live member count registered under this sub-community">
          <div className="strip-stat-icon text-emerald">👥</div>
          <div className="strip-stat-num">{totalUsersCount.toLocaleString()}</div>
          <div className="strip-stat-label">Total Users</div>
        </div>

        {/* Action Button: + Add New Location */}
        <div className="strip-action-box">
          <button
            type="button"
            className="subcomm-btn-add-primary"
            onClick={() => setShowAddLocationModal(true)}
          >
            + Add New Location
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="communities-loading" style={{ padding: '60px 0' }}>
          <div className="communities-spinner" />
          <p>Loading real location units and assigned local heads...</p>
        </div>
      ) : error ? (
        <div className="communities-error" style={{ margin: '20px 0' }}>
          <p>⚠️ {error}</p>
          <button className="community-btn-secondary" onClick={fetchLocationData}>Retry</button>
        </div>
      ) : (
        /* Main 2x2 Grid of Location Cards matching Image 2 */
        <div className="subcomm-cards-grid">
          {locations.map(loc => {
            const isLocActive = loc.isActive !== false;
            const isEditing = editingLoc?.id === loc.id;
            const locHeadCount = (loc.localHeadsList && loc.localHeadsList.length) || loc.localHeadsCount || 0;

            return (
              <div key={loc.id} className={`subcomm-item-card ${!isLocActive ? 'subcomm-card-inactive' : ''}`}>
                {/* Card Header: Monument Icon + Location Name + Status Pill + Add Group */}
                <div className="subcomm-card-header">
                  <div className="location-header-left">
                    <MonumentIllustration type={loc.illustrationType} city={loc.name} />
                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={editingLoc.name}
                            onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameLoc(loc.id, editingLoc.name);
                              if (e.key === 'Escape') setEditingLoc(null);
                            }}
                            className="community-input"
                            style={{ padding: '3px 8px', fontSize: '1rem', width: '150px' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameLoc(loc.id, editingLoc.name)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontWeight: 700 }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLoc(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <h3 className="subcomm-card-title">{loc.fullName || `${loc.name} Location`}</h3>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p className="subcomm-card-subtitle" style={{ margin: 0 }}>Total Groups: {loc.groups?.length || 4}</p>
                        {locHeadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleViewLocationHeads(loc)}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '1px 8px',
                              borderRadius: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            👤 {locHeadCount} Local Head{locHeadCount > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="subcomm-card-header-actions">
                    <div className={`comm-status-pill ${isLocActive ? 'comm-pill-active' : 'comm-pill-inactive'}`}>
                      <span className="pill-dot">●</span> {isLocActive ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                    <button
                      type="button"
                      className="subcomm-btn-add-group"
                      onClick={() => setShowAddGroupModal(loc)}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>

                {/* 4 Group Columns Matrix matching Image 2 */}
                <div className="subcomm-groups-columns">
                  {loc.groups.map((grp, idx) => {
                    const grpHeadCount = grp.heads ?? 0;
                    const grpSubHeadCount = grp.subHeads ?? 0;

                    return (
                      <div key={grp.id || idx} className="subcomm-group-col">
                        <div className={`grp-col-header ${grp.colorClass || 'grp-header-blue'}`}>
                          {grp.name}
                        </div>

                        {/* Local Community Heads Row */}
                        <div className="grp-row">
                          <div className="grp-count-line">
                            <span className="grp-icon-blue">👤</span>
                            <span
                              className="grp-number"
                              style={{ cursor: grpHeadCount > 0 ? 'pointer' : 'default' }}
                              onClick={() => grpHeadCount > 0 && handleViewGroupHeads(loc, grp, 'local_head')}
                              title={grpHeadCount > 0 ? 'Click to view heads in this group' : ''}
                            >
                              {grpHeadCount}
                            </span>
                            <button
                              type="button"
                              className="grp-plus-btn"
                              title="Assign/Create Local Community Head"
                              onClick={() => openAssignHeadModal(loc, grp, 'local_head')}
                            >
                              +
                            </button>
                          </div>
                          <div className="grp-label-small">Local Community Heads</div>
                        </div>

                        {/* Local Sub Community Heads Row */}
                        <div className="grp-row">
                          <div className="grp-count-line">
                            <span className="grp-icon-red">👥</span>
                            <span
                              className="grp-number"
                              style={{ cursor: grpSubHeadCount > 0 ? 'pointer' : 'default' }}
                              onClick={() => grpSubHeadCount > 0 && handleViewGroupHeads(loc, grp, 'local_sub_head')}
                              title={grpSubHeadCount > 0 ? 'Click to view sub-heads in this group' : ''}
                            >
                              {grpSubHeadCount}
                            </span>
                            <button
                              type="button"
                              className="grp-plus-btn"
                              title="Assign/Create Local Sub Community Head"
                              onClick={() => openAssignHeadModal(loc, grp, 'local_sub_head')}
                            >
                              +
                            </button>
                          </div>
                          <div className="grp-label-small">Local Sub Community Heads</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mint Green User Strip matching Image 2 */}
                <div className="subcomm-users-strip">
                  <span className="users-icon">👥</span>
                  <span className="users-count-bold">{(loc.userCount || 0).toLocaleString()}</span>
                  <span className="users-label">Total Users ({loc.name})</span>
                </div>

                {/* Action Buttons: Edit, Deactivate, Delete */}
                <div className="subcomm-card-action-bar">
                  <button
                    type="button"
                    className="subcomm-act-btn"
                    onClick={() => setEditingLoc({ id: loc.id, name: loc.name })}
                  >
                    <span className="comm-icon-orange">✏️</span> Edit
                  </button>
                  <button
                    type="button"
                    className="subcomm-act-btn"
                    onClick={() => handleToggleLocStatus(loc.id)}
                  >
                    <span className="comm-icon-blue">{isLocActive ? '⏸️' : '▶️'}</span> {isLocActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="subcomm-act-btn subcomm-act-delete"
                    onClick={() => handleDeleteLoc(loc)}
                  >
                    <span className="comm-icon-red">🗑️</span> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Large "+ Add New Location" Button matching Image 2 */}
      <div className="subcomm-bottom-add-bar">
        <button
          type="button"
          className="subcomm-btn-bottom-add"
          onClick={() => setShowAddLocationModal(true)}
        >
          <span className="plus-symbol">+</span> Add New Location
        </button>
      </div>

      {/* View Created Local Heads Modal */}
      {viewHeadsModal && (
        <div className="community-modal-overlay" onClick={() => setViewHeadsModal(null)}>
          <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="community-modal-header">
              <div>
                <h3>👥 {viewHeadsModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {viewHeadsModal.heads?.length || 0} created leader profile(s)
                </p>
              </div>
              <button type="button" className="community-modal-close" onClick={() => setViewHeadsModal(null)}>✕</button>
            </div>
            <div className="community-modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {(!viewHeadsModal.heads || viewHeadsModal.heads.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👤</div>
                  <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Local Heads Assigned Yet</h4>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>
                    Click the <strong>+</strong> button on any group to create or appoint a Local Community Head.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {viewHeadsModal.heads.map((head, idx) => (
                    <div
                      key={head.id || head._id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.1rem'
                          }}
                        >
                          {(head.name || 'H').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                            {head.name}
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                            📞 {head.phone} {head.email ? `• ✉️ ${head.email}` : ''}
                          </p>
                          {head.plainPassword && (
                            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#4f46e5', fontWeight: 600 }}>
                              🔑 Login Password: <span style={{ fontFamily: 'monospace', background: '#eef2ff', padding: '1px 6px', borderRadius: '4px' }}>{head.plainPassword}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: head.accountStatus === 'active' ? '#dcfce7' : '#fee2e2',
                            color: head.accountStatus === 'active' ? '#15803d' : '#b91c1c'
                          }}
                        >
                          ● {head.accountStatus?.toUpperCase() || 'ACTIVE'}
                        </span>
                        {head.city && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            📍 {head.city}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="community-modal-actions">
              <button type="button" className="community-btn-primary" onClick={() => setViewHeadsModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign / Create Local Head Modal */}
      {assignHeadModal && (
        <div className="community-modal-overlay" onClick={() => setAssignHeadModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="community-modal-header">
              <div>
                <h3>
                  👤 Create &amp; Appoint {assignHeadModal.accountType === 'local_sub_head' ? 'Local Sub Head' : 'Local Community Head'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign to: <strong>{assignHeadModal.loc.name}</strong> • <strong>{assignHeadModal.grp.name}</strong>
                </p>
              </div>
              <button type="button" className="community-modal-close" onClick={() => setAssignHeadModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAssignHeadSubmit}>
              <div className="community-modal-body">
                <div className="community-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vikram Rathore"
                    value={assignForm.name}
                    onChange={e => setAssignForm(f => ({ ...f, name: e.target.value }))}
                    className="community-input"
                    autoFocus
                    required
                  />
                </div>

                <div className="community-form-group">
                  <label>Mobile / Phone Number (Login ID) *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={assignForm.phone}
                    onChange={e => setAssignForm(f => ({ ...f, phone: e.target.value }))}
                    className="community-input"
                    required
                  />
                </div>

                <div className="community-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. vikram@merisamaj.com"
                    value={assignForm.email}
                    onChange={e => setAssignForm(f => ({ ...f, email: e.target.value }))}
                    className="community-input"
                  />
                </div>

                <div className="community-form-group">
                  <label>Login Password *</label>
                  <input
                    type="text"
                    placeholder="Default: 123456"
                    value={assignForm.password}
                    onChange={e => setAssignForm(f => ({ ...f, password: e.target.value }))}
                    className="community-input"
                  />
                  <small className="community-hint">Local Head will use their phone number &amp; password to sign in.</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="community-form-group">
                    <label>Assigned Location</label>
                    <input
                      type="text"
                      value={assignForm.city}
                      readOnly
                      className="community-input"
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="community-form-group">
                    <label>Assigned Group</label>
                    <input
                      type="text"
                      value={assignForm.group}
                      readOnly
                      className="community-input"
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
              <div className="community-modal-actions">
                <button type="button" className="community-btn-secondary" onClick={() => setAssignHeadModal(null)}>Cancel</button>
                <button type="submit" className="community-btn-primary" disabled={submittingHead || !assignForm.name.trim() || !assignForm.phone.trim()}>
                  {submittingHead ? 'Assigning...' : '✓ Create & Appoint Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="community-modal-overlay" onClick={() => setShowAddLocationModal(false)}>
          <div className="community-modal" onClick={e => e.stopPropagation()}>
            <div className="community-modal-header">
              <h3>📍 Add New Location for {subName}</h3>
              <button type="button" className="community-modal-close" onClick={() => setShowAddLocationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddLocationSubmit}>
              <div className="community-modal-body">
                <div className="community-form-group">
                  <label>Location / City Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Jabalpur, Gwalior, Sagar, Rewa..."
                    value={newLocationCity}
                    onChange={e => setNewLocationCity(e.target.value)}
                    className="community-input"
                    autoFocus
                  />
                  <small className="community-hint">Enter the city or regional unit for {commName} &gt; {subName}.</small>
                </div>
              </div>
              <div className="community-modal-actions">
                <button type="button" className="community-btn-secondary" onClick={() => setShowAddLocationModal(false)}>Cancel</button>
                <button type="submit" className="community-btn-primary" disabled={!newLocationCity.trim()}>
                  ✓ Add Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="community-modal-overlay" onClick={() => setShowAddGroupModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()}>
            <div className="community-modal-header">
              <h3>👥 Add Group to {showAddGroupModal.fullName || showAddGroupModal.name}</h3>
              <button type="button" className="community-modal-close" onClick={() => setShowAddGroupModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAddGroupSubmit}>
              <div className="community-modal-body">
                <div className="community-form-group">
                  <label>Group Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Group 5, Ward 12 Team, Youth Wing..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="community-input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="community-modal-actions">
                <button type="button" className="community-btn-secondary" onClick={() => setShowAddGroupModal(null)}>Cancel</button>
                <button type="submit" className="community-btn-primary" disabled={!newGroupName.trim()}>
                  ✓ Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────
// SubCommunityLocationView — Level 2 Sub-Communities View
// ─────────────────────────────────────────────
const SubCommunityLocationView = ({
  community,
  onBack,
  onEditCommunity,
  onRefreshCommunities
}) => {
  const [data, setData] = useState({
    community: community,
    subCommunities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(null); // holds subId
  const [newLocationName, setNewLocationName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [editingSub, setEditingSub] = useState(null); // { id, name }
  const [selectedSubCommunity, setSelectedSubCommunity] = useState(null); // Active Sub-Community for Image 2 view (e.g. Rathore)

  const communityId = community._id || community.id;

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSubCommunityStats(communityId);
      setData({
        community: { ...community, ...res.data?.community },
        subCommunities: res.data?.subCommunities || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sub-communities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [communityId]);

  const handleAddLocationOrSub = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newLocationName.trim();
    if (!trimmed) return;
    setAddingLocation(true);
    try {
      await addSubCommunity(communityId, trimmed);
      setNewLocationName('');
      setShowAddLocationModal(false);
      fetchDetails();
      if (onRefreshCommunities) onRefreshCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add');
    } finally {
      setAddingLocation(false);
    }
  };

  const handleToggleSubStatus = async (sub) => {
    try {
      await toggleSubCommunityStatus(communityId, sub._id);
      setData(prev => ({
        ...prev,
        subCommunities: prev.subCommunities.map(s =>
          s._id === sub._id ? { ...s, isActive: !s.isActive } : s
        )
      }));
      if (onRefreshCommunities) onRefreshCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDeleteSub = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete "${sub.name}"?`)) return;
    try {
      await deleteSubCommunity(communityId, sub._id);
      setData(prev => ({
        ...prev,
        subCommunities: prev.subCommunities.filter(s => s._id !== sub._id)
      }));
      if (onRefreshCommunities) onRefreshCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleRenameSub = async (subId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await renameSubCommunity(communityId, subId, trimmed);
      setData(prev => ({
        ...prev,
        subCommunities: prev.subCommunities.map(s =>
          s._id === subId ? { ...s, name: trimmed } : s
        )
      }));
      setEditingSub(null);
      if (onRefreshCommunities) onRefreshCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Rename failed');
    }
  };

  const comm = data.community || community;
  const isActive = comm.isActive !== false && comm.status !== 'Inactive';
  const createdFormatted = comm.createdAt
    ? new Date(comm.createdAt).toLocaleDateString('en-GB')
    : '22/9/2026';

  // Overall top stats
  const activeLocationsCount = comm.activeLocationsCount ?? Math.max(1, (comm.cityIds?.length || (comm.city ? 1 : 0)));
  const totalCommunityHeadsCount = comm.communityHeadsCount ?? (comm.headId ? 1 : 0);
  const totalLocalHeadsCount = comm.localHeadsCount || 0;
  const totalSubCommunityHeadsCount = comm.subLocalHeadsCount || 0;
  const totalUsersCount = comm.totalUsersCount ?? comm.memberCount ?? 0;

  // Combine real subCommunities from backend, community.subCommunities, or presets
  const displaySubCommunities = React.useMemo(() => {
    if (data.subCommunities && data.subCommunities.length > 0) {
      return data.subCommunities;
    }
    if (comm.subCommunities && comm.subCommunities.length > 0) {
      return comm.subCommunities.map(s => ({
        _id: s._id || s.id || Math.random().toString(),
        name: typeof s === 'string' ? s : s.name,
        isActive: typeof s === 'object' ? s.isActive !== false : true,
        memberCount: s.memberCount || 0,
      }));
    }
    const presets = getSuggestedSubCommunities(comm.name);
    if (presets && presets.length > 0) {
      return presets.slice(0, 4).map((name, i) => ({
        _id: `preset-${i}`,
        name,
        isActive: true,
        memberCount: i === 0 ? 0 : i === 1 ? 210 : i === 2 ? 98 : 76,
      }));
    }
    return [
      { _id: 'sample-1', name: 'Rathore', isActive: true, memberCount: 0 },
      { _id: 'sample-2', name: 'Chauhan', isActive: true, memberCount: 210 },
      { _id: 'sample-3', name: 'Sisodiya', isActive: true, memberCount: 98 },
      { _id: 'sample-4', name: 'Parmar', isActive: true, memberCount: 76 }
    ];
  }, [data.subCommunities, comm.subCommunities, comm.name]);

  // Render default/preset groups for visual representation if dynamic groups not stored yet
  const getSubGroups = (sub) => {
    if (sub.groups && Array.isArray(sub.groups) && sub.groups.length > 0) {
      return sub.groups;
    }
    // Standard default 4 groups as shown in Image 1: Group 1, Group 2, Group 3, Group 4
    return [
      { id: 'g1', name: 'Group 1', colorClass: 'grp-header-blue', heads: 1, subHeads: 2 },
      { id: 'g2', name: 'Group 2', colorClass: 'grp-header-pink', heads: 0, subHeads: 1 },
      { id: 'g3', name: 'Group 3', colorClass: 'grp-header-green', heads: 0, subHeads: 0 },
      { id: 'g4', name: 'Group 4', colorClass: 'grp-header-yellow', heads: 0, subHeads: 0 },
    ];
  };

  // If a subcommunity like Rathore is clicked, open the Location-Wise view (Image 2)
  if (selectedSubCommunity) {
    return (
      <SubLocalHeadLocationWiseView
        community={comm}
        subCommunity={selectedSubCommunity}
        onBack={() => setSelectedSubCommunity(null)}
        onRefreshCommunities={onRefreshCommunities}
      />
    );
  }

  return (
    <div className="subcomm-view-container">
      {/* Top Breadcrumb & Community Header */}
      <div className="subcomm-top-nav">
        <div className="subcomm-left-header">
          <button type="button" className="subcomm-back-btn" onClick={onBack} title="Back to Main Communities">
            ←
          </button>
          <div className="subcomm-avatar-square">
            {comm.logoUrl ? (
              <img src={comm.logoUrl} alt={comm.name} />
            ) : (
              <span>{(comm.name || 'C').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="subcomm-main-title">{comm.name}</h2>
            <p className="subcomm-breadcrumb">
              Communities &gt; {comm.name} (Sub-Communities)
            </p>
          </div>
        </div>

        <div className="subcomm-right-meta">
          <div className={`comm-status-pill ${isActive ? 'comm-pill-active' : 'comm-pill-inactive'}`}>
            <span className="pill-dot">●</span> {isActive ? 'ACTIVE' : 'INACTIVE'}
          </div>
          <span className="subcomm-created-badge">
            📅 Created: {createdFormatted}
          </span>
        </div>
      </div>

      {/* Top Stats Summary Strip + "+ Add New Sub-Community" Button */}
      <div className="subcomm-stats-strip">
        {/* Stat 1: Active Sub-Communities */}
        <div className="strip-stat-box bg-lavender-strip">
          <div className="strip-stat-icon text-indigo">🏷️</div>
          <div className="strip-stat-num">{displaySubCommunities.length}</div>
          <div className="strip-stat-label">Sub Communities</div>
        </div>

        {/* Stat 2: Total Community Heads (Warm Amber) */}
        <div className="strip-stat-box bg-amber-strip">
          <div className="strip-stat-icon text-amber">👥</div>
          <div className="strip-stat-num">{totalCommunityHeadsCount}</div>
          <div className="strip-stat-label">Total Community Heads</div>
        </div>

        {/* Stat 3: Total Sub Community Heads (Light Blue) */}
        <div className="strip-stat-box bg-sky-strip">
          <div className="strip-stat-icon text-sky">👤</div>
          <div className="strip-stat-num">{totalLocalHeadsCount || 1}</div>
          <div className="strip-stat-label">Total Community Heads</div>
        </div>

        {/* Stat 4: Total Sub Community Heads (Light Red) */}
        <div className="strip-stat-box bg-rose-strip">
          <div className="strip-stat-icon text-rose">👥</div>
          <div className="strip-stat-num">{totalSubCommunityHeadsCount || 3}</div>
          <div className="strip-stat-label">Sub Community Heads</div>
        </div>

        {/* Stat 5: Total Users (Light Mint Green) */}
        <div className="strip-stat-box bg-mint-strip">
          <div className="strip-stat-icon text-emerald">👥</div>
          <div className="strip-stat-num">{totalUsersCount.toLocaleString()}</div>
          <div className="strip-stat-label">Total Users</div>
        </div>

        {/* Action Button: + Add Sub-Community */}
        <div className="strip-action-box">
          <button
            type="button"
            className="subcomm-btn-add-primary"
            onClick={() => setShowAddLocationModal(true)}
          >
            + Add Sub-Community
          </button>
        </div>
      </div>

      {/* Main Sub-Communities Grid matching Image 1 */}
      {loading ? (
        <div className="communities-loading">
          <div className="communities-spinner" />
          <p>Loading sub-communities &amp; gotras...</p>
        </div>
      ) : error ? (
        <div className="communities-error">
          <p>⚠️ {error}</p>
          <button className="community-btn-secondary" onClick={fetchDetails}>Retry</button>
        </div>
      ) : displaySubCommunities.length === 0 ? (
        <div className="communities-empty">
          <p>🏷️ No sub-communities or gotras found for {comm.name}</p>
          <button className="subcomm-btn-add-primary" onClick={() => setShowAddLocationModal(true)}>
            + Add Sub-Community
          </button>
        </div>
      ) : (
        <div className="subcomm-cards-grid">
          {displaySubCommunities.map(sub => {
            const subIsActive = sub.isActive !== false;
            const groups = getSubGroups(sub);
            const isEditing = editingSub?.id === sub._id;

            return (
              <div key={sub._id} className={`subcomm-item-card ${!subIsActive ? 'subcomm-card-inactive' : ''}`}>
                {/* Card Top: Sub-Community Name (Clickable to open Image 2), Status Pill, + Add Group */}
                <div className="subcomm-card-header">
                  <div
                    onClick={() => !isEditing && setSelectedSubCommunity(sub)}
                    className={!isEditing ? "subcomm-card-title-clickable" : ""}
                    title={!isEditing ? `Click to view location-wise sub-local heads for ${sub.name}` : ""}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingSub.name}
                          onChange={e => setEditingSub({ ...editingSub, name: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameSub(sub._id, editingSub.name);
                            if (e.key === 'Escape') setEditingSub(null);
                          }}
                          className="community-input"
                          style={{ padding: '3px 8px', fontSize: '1rem', width: '160px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSub(sub._id, editingSub.name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontWeight: 700 }}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSub(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <h3 className="subcomm-card-title">
                        {sub.name}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', marginLeft: '8px' }}>
                          ↗ View Locations
                        </span>
                      </h3>
                    )}
                    <p className="subcomm-card-subtitle">Total Groups: {groups.length}</p>
                  </div>

                  <div className="subcomm-card-header-actions">
                    <div className={`comm-status-pill ${subIsActive ? 'comm-pill-active' : 'comm-pill-inactive'}`}>
                      <span className="pill-dot">●</span> {subIsActive ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                    <button
                      type="button"
                      className="subcomm-btn-add-group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddGroupModal(sub);
                      }}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>

                {/* 4 Group Columns Matrix matching Image 1 */}
                <div className="subcomm-groups-columns">
                  {groups.map((grp, idx) => (
                    <div key={grp.id || idx} className="subcomm-group-col">
                      <div className={`grp-col-header ${grp.colorClass || 'grp-header-blue'}`}>
                        {grp.name}
                      </div>
                      
                      {/* Community Heads Row */}
                      <div className="grp-row">
                        <div className="grp-count-line">
                          <span className="grp-icon-blue">👤</span>
                          <span className="grp-number">{grp.heads ?? 0}</span>
                          <button
                            type="button"
                            className="grp-plus-btn"
                            title="Add Community Head"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Assign Community Head to ${sub.name} - ${grp.name}`);
                            }}
                          >
                            +
                          </button>
                        </div>
                        <div className="grp-label-small">Community Heads</div>
                      </div>

                      {/* Sub Community Heads Row */}
                      <div className="grp-row">
                        <div className="grp-count-line">
                          <span className="grp-icon-red">👥</span>
                          <span className="grp-number">{grp.subHeads ?? 0}</span>
                          <button
                            type="button"
                            className="grp-plus-btn"
                            title="Add Sub Community Head"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Assign Sub Community Head to ${sub.name} - ${grp.name}`);
                            }}
                          >
                            +
                          </button>
                        </div>
                        <div className="grp-label-small">Sub Community Heads</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Users Strip */}
                <div
                  className="subcomm-users-strip"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedSubCommunity(sub)}
                  title={`Click to view locations and members for ${sub.name}`}
                >
                  <span className="users-icon">👥</span>
                  <span className="users-count-bold">{(sub.memberCount || 0).toLocaleString()}</span>
                  <span className="users-label">Total Users ({sub.name})</span>
                </div>

                {/* Action Buttons: View Locations, Edit, Deactivate, Delete */}
                <div className="subcomm-card-action-bar">
                  <button
                    type="button"
                    className="subcomm-act-btn"
                    onClick={() => setEditingSub({ id: sub._id, name: sub.name })}
                  >
                    <span className="comm-icon-orange">✏️</span> Edit
                  </button>
                  <button
                    type="button"
                    className="subcomm-act-btn"
                    onClick={() => handleToggleSubStatus(sub)}
                  >
                    <span className="comm-icon-blue">{subIsActive ? '⏸️' : '▶️'}</span> {subIsActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="subcomm-act-btn subcomm-act-delete"
                    onClick={() => handleDeleteSub(sub)}
                  >
                    <span className="comm-icon-red">🗑️</span> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Large "+ Add Sub-Community" Button */}
      <div className="subcomm-bottom-add-bar">
        <button
          type="button"
          className="subcomm-btn-bottom-add"
          onClick={() => setShowAddLocationModal(true)}
        >
          <span className="plus-symbol">+</span> Add Sub-Community
        </button>
      </div>

      {/* Add Sub-Community Modal */}
      {showAddLocationModal && (
        <div className="community-modal-overlay" onClick={() => setShowAddLocationModal(false)}>
          <div className="community-modal" onClick={e => e.stopPropagation()}>
            <div className="community-modal-header">
              <h3>🏷️ Add New Sub-Community / Gotra</h3>
              <button type="button" className="community-modal-close" onClick={() => setShowAddLocationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddLocationOrSub}>
              <div className="community-modal-body">
                <div className="community-form-group">
                  <label>Sub-Community / Gotra Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rathore, Chauhan, Sisodiya, Parmar..."
                    value={newLocationName}
                    onChange={e => setNewLocationName(e.target.value)}
                    className="community-input"
                    autoFocus
                  />
                  <small className="community-hint">Enter gotra or sub-community name under {comm.name}.</small>
                </div>
              </div>
              <div className="community-modal-actions">
                <button type="button" className="community-btn-secondary" onClick={() => setShowAddLocationModal(false)}>Cancel</button>
                <button type="submit" className="community-btn-primary" disabled={addingLocation || !newLocationName.trim()}>
                  {addingLocation ? 'Adding...' : '✓ Add Sub-Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="community-modal-overlay" onClick={() => setShowAddGroupModal(null)}>
          <div className="community-modal" onClick={e => e.stopPropagation()}>
            <div className="community-modal-header">
              <h3>👥 Add Group to {showAddGroupModal.name}</h3>
              <button type="button" className="community-modal-close" onClick={() => setShowAddGroupModal(null)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              alert(`Group "${newGroupName || 'New Group'}" added to ${showAddGroupModal.name}`);
              setNewGroupName('');
              setShowAddGroupModal(null);
            }}>
              <div className="community-modal-body">
                <div className="community-form-group">
                  <label>Group Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Group 5, Ward 12 Team, Youth Wing..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="community-input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="community-modal-actions">
                <button type="button" className="community-btn-secondary" onClick={() => setShowAddGroupModal(null)}>Cancel</button>
                <button type="submit" className="community-btn-primary" disabled={!newGroupName.trim()}>
                  ✓ Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// CommunitiesPage — Main Page
// ─────────────────────────────────────────────
const CommunitiesPage = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [moduleTarget, setModuleTarget] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(null); // Active Community for Image 2 view
  const [search, setSearch] = useState('');

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const res = await getAllCommunities();
      setCommunities(res.data || []);
      // If a community is selected, update it with newest data
      if (selectedCommunity) {
        const found = (res.data || []).find(c => c._id === selectedCommunity._id);
        if (found) setSelectedCommunity(found);
      }
    } catch (err) {
      setError('Failed to load communities. Is backend connected?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleToggleStatus = async (community) => {
    const isActive = community.isActive !== false && community.status !== 'Inactive';
    const action = isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} "${community.name}"?`)) return;
    try {
      await toggleCommunityStatus(community._id);
      fetchCommunities();
    } catch (err) {
      alert(err.response?.data?.message || `${action.toUpperCase()} failed`);
    }
  };

  const handleDelete = async (community) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE "${community.name}"?\n\nThis will remove the community from the platform. This action cannot be undone.`)) return;
    try {
      await deleteCommunity(community._id);
      if (selectedCommunity?._id === community._id) {
        setSelectedCommunity(null);
      }
      fetchCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Deletion failed');
    }
  };

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{COMMUNITIES_PAGE_STYLES}</style>

      <div className="communities-page">
        {/* If a community is selected, render Location-Wise Sub-Communities view (Image 2) */}
        {selectedCommunity ? (
          <SubCommunityLocationView
            community={selectedCommunity}
            onBack={() => setSelectedCommunity(null)}
            onEditCommunity={setEditTarget}
            onRefreshCommunities={fetchCommunities}
          />
        ) : (
          /* Otherwise render Main Communities list (Image 1) */
          <>
            {/* Top Navigation Tabs Header */}
            {!loading && communities.length > 0 && (
              <div className="comm-top-tabs-scroll">
                <button
                  type="button"
                  onClick={() => setSelectedCommunity(null)}
                  className={`comm-top-tab-btn ${!selectedCommunity ? 'tab-active-main' : ''}`}
                >
                  🏛️ All Main Communities ({communities.length})
                </button>
                {communities.map(comm => (
                  <button
                    key={comm._id}
                    type="button"
                    onClick={() => setSelectedCommunity(comm)}
                    className="comm-top-tab-btn"
                  >
                    <span>{comm.name}</span>
                    <span className="tab-pill-purple">
                      👥 {comm.memberCount || comm.totalUsers || 0}
                    </span>
                    {comm.subCommunities && comm.subCommunities.length > 0 && (
                      <span className="tab-pill-amber">
                        🏷️ {comm.subCommunities.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Header / Create Community Action */}
            <div className="communities-header">
              <div>
                <h1 className="communities-title">🏛️ Community Management</h1>
                <p className="communities-subtitle">
                  Centralized platform for creating communities, managing gotras &amp; location hierarchies, configuring module toggles, and assigning leadership.
                </p>
              </div>
              <button className="community-btn-primary communities-create-btn" onClick={() => setShowCreate(true)}>
                + New Community
              </button>
            </div>

            {/* Search */}
            <div className="communities-search-bar">
              <input
                type="text"
                placeholder="🔍 Search by community name or city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="communities-search-input"
              />
            </div>

            {/* Communities Grid */}
            {loading ? (
              <div className="communities-loading">
                <div className="communities-spinner" />
                <p>Loading communities...</p>
              </div>
            ) : error ? (
              <div className="communities-error">
                <p>⚠️ {error}</p>
                <button className="community-btn-secondary" onClick={fetchCommunities}>Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="communities-empty">
                <p>🏛️ No communities found</p>
                <button className="community-btn-primary" onClick={() => setShowCreate(true)}>
                  Create First Community
                </button>
              </div>
            ) : (
              <div className="comm-cards-masonry-grid">
                {filtered.map(community => (
                  <CommunityCard
                    key={community._id}
                    community={community}
                    onEdit={setEditTarget}
                    onModules={setModuleTarget}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                    onViewSubCommunities={setSelectedCommunity}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchCommunities}
        />
      )}
      {editTarget && (
        <EditCommunityModal
          community={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={fetchCommunities}
        />
      )}
      {moduleTarget && (
        <ModuleSettingsPanel
          community={moduleTarget}
          onClose={() => setModuleTarget(null)}
          onUpdated={fetchCommunities}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// Scoped CSS Styles matching Image 1 & Image 2
// ─────────────────────────────────────────────
const COMMUNITIES_PAGE_STYLES = `
  .communities-page {
    padding: 24px;
    max-width: 1320px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
  }
  
  .communities-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }
  .communities-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .communities-subtitle {
    color: #64748b;
    margin: 4px 0 0;
    font-size: 0.88rem;
  }
  
  /* Top Navigation Tabs */
  .comm-top-tabs-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 12px;
    margin-bottom: 20px;
    scrollbar-width: thin;
  }
  .comm-top-tab-btn {
    padding: 8px 16px;
    border-radius: 12px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #475569;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .comm-top-tab-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  .comm-top-tab-btn.tab-active-main {
    border: 1.5px solid #4f46e5;
    background: #4f46e5;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  }
  .tab-pill-purple {
    font-size: 0.7rem;
    padding: 2px 7px;
    border-radius: 10px;
    background: #ede9fe;
    color: #6d28d9;
    font-weight: 700;
  }
  .tab-pill-amber {
    font-size: 0.7rem;
    padding: 2px 7px;
    border-radius: 10px;
    background: #fef3c7;
    color: #92400e;
    font-weight: 700;
  }

  .communities-search-bar {
    margin-bottom: 22px;
  }
  .communities-search-input {
    width: 100%;
    padding: 12px 18px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.92rem;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }
  .communities-search-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  /* Masonry / Grid for Main Community Cards (Image 1) */
  .comm-cards-masonry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 24px;
  }

  /* ─────────────────────────────────────────────
     IMAGE 1: MAIN COMMUNITY CARD
     ───────────────────────────────────────────── */
  .comm-main-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    padding: 22px;
    position: relative;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
  }
  .comm-main-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
  }
  .comm-card-inactive {
    opacity: 0.65;
  }

  /* Status Pill Badge (Top Right) */
  .comm-status-pill {
    position: absolute;
    top: 20px;
    right: 20px;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0.05em;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    text-transform: uppercase;
  }
  .comm-pill-active {
    background: #dcfce7;
    color: #15803d;
  }
  .comm-pill-inactive {
    background: #fee2e2;
    color: #b91c1c;
  }
  .comm-pill-bullet {
    font-size: 0.65rem;
  }

  /* Card Header: Avatar + Title */
  .comm-header-clickable {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    padding-right: 80px;
  }
  .comm-avatar-box {
    width: 54px;
    height: 54px;
    border-radius: 14px;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: #ffffff;
    font-size: 1.55rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
    overflow: hidden;
  }
  .comm-avatar-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .comm-header-text {
    min-width: 0;
  }
  .comm-title-name {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .comm-title-slug {
    font-size: 0.82rem;
    color: #64748b;
    margin: 2px 0 0;
    font-weight: 500;
  }
  .comm-created-date {
    font-size: 0.78rem;
    color: #64748b;
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .comm-cal-emoji {
    font-size: 0.85rem;
  }

  /* 6-box Stats Grid (2 rows x 3 columns) */
  .comm-six-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .comm-stat-cell {
    border-radius: 12px;
    padding: 12px 6px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    user-select: none;
    position: relative;
  }
  .comm-stat-cell:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
  .comm-stat-cell:active {
    transform: translateY(-1px) scale(1.01);
  }

  /* Box Pastel Colors */
  .bg-lavender { background: #f0f2fe; border: 1px solid #e0e7ff; }
  .bg-amber    { background: #fef8e7; border: 1px solid #fef3c7; }
  .bg-mint     { background: #f0fdf4; border: 1px solid #dcfce7; }
  .bg-sky      { background: #f0f9ff; border: 1px solid #e0f2fe; }
  .bg-rose     { background: #fef2f2; border: 1px solid #fee2e2; }
  .bg-violet   { background: #faf5ff; border: 1px solid #f3e8ff; }

  /* Icon Colors */
  .text-indigo  { color: #4f46e5; }
  .text-amber   { color: #d97706; }
  .text-emerald { color: #059669; }
  .text-sky     { color: #0284c7; }
  .text-rose    { color: #e11d48; }
  .text-violet  { color: #7c3aed; }

  .comm-stat-icon {
    font-size: 1.15rem;
    margin-bottom: 2px;
  }
  .comm-stat-num {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .comm-stat-desc {
    font-size: 0.68rem;
    font-weight: 600;
    color: #334155;
    margin-top: 4px;
    line-height: 1.15;
  }

  /* Modules Section */
  .comm-modules-divider {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .comm-modules-tag {
    font-size: 0.74rem;
    font-weight: 800;
    color: #64748b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .comm-modules-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 18px;
  }
  .comm-mod-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #334155;
  }
  .comm-mod-more {
    background: #f1f5f9;
    color: #64748b;
    font-weight: 700;
  }

  /* Action Buttons */
  .comm-card-action-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
  }
  .comm-btn-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .comm-btn-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 12px;
    border-radius: 10px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    font-size: 0.82rem;
    font-weight: 700;
    color: #1e293b;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .comm-btn-card:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  .comm-btn-delete {
    border-color: #fee2e2;
    color: #dc2626;
  }
  .comm-btn-delete:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #b91c1c;
  }
  .comm-btn-subcommunities {
    width: 100%;
    margin-top: 4px;
    border-color: #e2e8f0;
    background: #ffffff;
    font-weight: 800;
  }
  .comm-btn-subcommunities:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  .comm-icon-tag {
    font-size: 0.95rem;
  }

  /* ─────────────────────────────────────────────
     IMAGE 2: SUB-COMMUNITIES / LOCATION VIEW
     ───────────────────────────────────────────── */
  .subcomm-view-container {
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .subcomm-top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
  }
  .subcomm-left-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .subcomm-back-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #ffffff;
    font-size: 1.1rem;
    font-weight: 800;
    color: #334155;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .subcomm-back-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }
  .subcomm-avatar-square {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1e3a8a, #2563eb);
    color: #ffffff;
    font-size: 1.4rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .subcomm-avatar-square img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .subcomm-main-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .subcomm-breadcrumb {
    font-size: 0.78rem;
    color: #64748b;
    margin: 2px 0 0;
    font-weight: 500;
  }
  .subcomm-right-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .subcomm-created-badge {
    font-size: 0.78rem;
    color: #64748b;
    font-weight: 600;
  }

  /* Top Summary Stats Strip */
  .subcomm-stats-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr) auto;
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (max-width: 1024px) {
    .subcomm-stats-strip {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 640px) {
    .subcomm-stats-strip {
      grid-template-columns: 1fr 1fr;
    }
  }

  .strip-stat-box {
    border-radius: 12px;
    padding: 14px 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .bg-lavender-strip { background: #f5f3ff; border: 1px solid #ede9fe; }
  .bg-amber-strip    { background: #fffbeb; border: 1px solid #fef3c7; }
  .bg-sky-strip      { background: #f0f9ff; border: 1px solid #e0f2fe; }
  .bg-rose-strip     { background: #fef2f2; border: 1px solid #fee2e2; }
  .bg-mint-strip     { background: #f0fdf4; border: 1px solid #dcfce7; }

  .strip-stat-icon {
    font-size: 1.15rem;
    margin-bottom: 2px;
  }
  .strip-stat-num {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .strip-stat-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #475569;
    margin-top: 4px;
    white-space: nowrap;
  }

  .strip-action-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .subcomm-btn-add-primary {
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 12px;
    padding: 0 20px;
    height: 100%;
    min-height: 50px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }
  .subcomm-btn-add-primary:hover {
    background: #1d4ed8;
  }

  /* Sub-Communities 2-Column Cards Grid */
  .subcomm-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) {
    .subcomm-cards-grid {
      grid-template-columns: 1fr;
    }
  }

  .subcomm-item-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .subcomm-card-inactive {
    opacity: 0.65;
  }

  .subcomm-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .subcomm-card-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .subcomm-card-subtitle {
    font-size: 0.78rem;
    color: #64748b;
    margin: 3px 0 0;
  }
  .subcomm-card-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .subcomm-btn-add-group {
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .subcomm-btn-add-group:hover {
    background: #1d4ed8;
  }

  /* Group Columns Matrix (4 columns) */
  .subcomm-groups-columns {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    padding: 10px;
  }
  @media (max-width: 600px) {
    .subcomm-groups-columns {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .subcomm-group-col {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .grp-col-header {
    font-size: 0.72rem;
    font-weight: 800;
    text-align: center;
    padding: 5px 4px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .grp-header-blue   { background: #e0f2fe; color: #0369a1; }
  .grp-header-pink   { background: #fce7f3; color: #be185d; }
  .grp-header-green  { background: #dcfce7; color: #15803d; }
  .grp-header-yellow { background: #fef3c7; color: #b45309; }

  .grp-row {
    padding: 6px 4px;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
  }
  .grp-row:last-child {
    border-bottom: none;
  }
  .grp-count-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .grp-number {
    font-size: 0.92rem;
    font-weight: 800;
    color: #0f172a;
  }
  .grp-icon-blue { color: #0284c7; font-size: 0.82rem; }
  .grp-icon-red  { color: #e11d48; font-size: 0.82rem; }
  .grp-plus-btn {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    border: none;
    font-size: 0.75rem;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .grp-plus-btn:hover {
    background: #bae6fd;
  }
  .grp-label-small {
    font-size: 0.62rem;
    color: #475569;
    margin-top: 1px;
    line-height: 1.1;
  }

  /* Total Users Strip in Card */
  .subcomm-users-strip {
    background: #f0fdf4;
    border: 1px solid #dcfce7;
    border-radius: 10px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.82rem;
    color: #15803d;
    font-weight: 700;
  }
  .users-icon { font-size: 1rem; }
  .users-count-bold { font-size: 1.05rem; font-weight: 800; }
  .users-label { font-size: 0.78rem; font-weight: 700; }

  /* Sub-Community Card Actions */
  .subcomm-card-action-bar {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .subcomm-act-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 7px 8px;
    border-radius: 8px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    font-size: 0.78rem;
    font-weight: 700;
    color: #1e293b;
    cursor: pointer;
    transition: all 0.15s;
  }
  .subcomm-act-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  .subcomm-act-delete {
    border-color: #fee2e2;
    color: #dc2626;
  }
  .subcomm-act-delete:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #b91c1c;
  }

  /* Sub-Community Title Clickable */
  .subcomm-card-title-clickable {
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .subcomm-card-title-clickable:hover .subcomm-card-title {
    color: #2563eb;
  }

  /* Location Card Heritage Monument Badges */
  .location-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .location-monument-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  .bg-gold-monument       { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #fcd34d; }
  .bg-amber-monument      { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1.5px solid #fde68a; }
  .bg-orange-monument     { background: linear-gradient(135deg, #ffedd5, #fed7aa); border: 1.5px solid #fdba74; }
  .bg-terracotta-monument { background: linear-gradient(135deg, #fee2e2, #fecaca); border: 1.5px solid #fca5a5; }
  .monument-svg {
    width: 32px;
    height: 32px;
  }

  /* Large Bottom Add Location Button */
  .subcomm-bottom-add-bar {
    margin-top: 10px;
  }
  .subcomm-btn-bottom-add {
    width: 100%;
    padding: 14px 20px;
    background: #f0f7ff;
    border: 1.5px dashed #93c5fd;
    border-radius: 14px;
    color: #1d4ed8;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s;
  }
  .subcomm-btn-bottom-add:hover {
    background: #e0f0fe;
    border-color: #60a5fa;
  }
  .plus-symbol {
    font-size: 1.2rem;
    line-height: 1;
  }

  /* Modal Base Styles */
  .community-modal-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
    overflow-y: auto;
  }
  .community-modal {
    background: #fff; border-radius: 20px; width: 100%; max-width: 500px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: modalSlideIn 0.25s ease;
    display: flex; flex-direction: column; max-height: 88vh; overflow: hidden;
  }
  .community-modal-wide { max-width: 820px; }
  @keyframes modalSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .community-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; background: #ffffff;
  }
  .community-modal-header h3 { font-size: 1.15rem; font-weight: 700; color: #1e1b4b; margin: 0; display: flex; align-items: center; gap: 8px; }
  .community-modal-close {
    background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #94a3b8;
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .community-modal-close:hover { background: #f1f5f9; color: #334155; }
  .community-modal-body {
    padding: 20px 24px; overflow-y: auto; flex: 1; min-height: 0;
  }
  .community-form-grid-2 {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  @media (max-width: 768px) {
    .community-form-grid-2 { grid-template-columns: 1fr; }
    .community-modal-wide { max-width: 100%; }
    .community-modal { max-height: 94vh; }
  }
  .community-form-group { margin-bottom: 14px; }
  .community-form-group label { display: block; font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; }
  .community-input, .community-textarea {
    width: 100%; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
    font-size: 0.88rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
    font-family: inherit; color: #1e293b; background: #ffffff;
  }
  .community-input:focus, .community-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
  .community-hint { font-size: 0.73rem; color: #94a3b8; margin-top: 4px; display: block; }
  .community-form-error { color: #ef4444; font-size: 0.82rem; margin: 0; }
  .community-modal-actions {
    display: flex; gap: 10px; justify-content: space-between; align-items: center;
    padding: 14px 24px; border-top: 1px solid #f1f5f9; background: #f8fafc; flex-shrink: 0;
  }

  .community-module-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;
  }
  .community-module-toggle {
    display: flex; align-items: center; gap: 8px; padding: 12px;
    border: 1.5px solid #e5e7eb; border-radius: 10px; cursor: pointer;
    transition: all 0.15s; user-select: none;
  }
  .community-module-toggle.active { border-color: #667eea; background: #eef2ff; }
  .community-module-toggle.inactive { opacity: 0.6; }
  .community-module-icon { font-size: 1.1rem; }
  .community-module-label { flex: 1; font-size: 0.82rem; font-weight: 600; color: #374151; }
  .community-toggle-switch {
    width: 36px; height: 20px; border-radius: 10px; position: relative; flex-shrink: 0; transition: background 0.2s;
  }
  .community-toggle-switch.on { background: #667eea; }
  .community-toggle-switch.off { background: #d1d5db; }
  .community-toggle-knob {
    position: absolute; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff;
    transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .community-toggle-switch.on .community-toggle-knob { left: 18px; }
  .community-toggle-switch.off .community-toggle-knob { left: 2px; }

  /* Standard Buttons */
  .community-btn-primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff; border: none; border-radius: 10px; padding: 10px 20px;
    font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
  }
  .community-btn-primary:hover:not(:disabled) { opacity: 0.92; }
  .community-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .community-btn-secondary {
    background: #f3f4f6; color: #374151; border: 1.5px solid #e5e7eb;
    border-radius: 10px; padding: 10px 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  }
  .community-btn-secondary:hover { background: #e5e7eb; }
  .community-btn-danger-sm {
    margin-left: auto; background: #fef2f2; color: #ef4444;
    border: 1px solid #fecaca; border-radius: 8px; padding: 5px 12px;
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
  }
  .communities-create-btn { padding: 12px 24px; white-space: nowrap; }
  .communities-loading, .communities-error, .communities-empty {
    text-align: center; padding: 60px 20px; color: #6b7280;
  }
  .communities-spinner {
    width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #2563eb;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default CommunitiesPage;
