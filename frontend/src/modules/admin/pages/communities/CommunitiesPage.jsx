import React, { useState, useEffect } from 'react';
import { cityService } from '../../services/cityService';
import {
  getAllCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  assignHeadToCommunity,
  removeHeadFromCommunity,
  updateCommunitySettings,
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
// CreateCommunityModal
// ─────────────────────────────────────────────
const CreateCommunityModal = ({ onClose, onCreated }) => {
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    // Fetch available cities when modal opens
    const fetchCities = async () => {
      try {
        const cities = await cityService.fetchCities();
        setAvailableCities(cities.filter(c => c.status === 'Active'));
      } catch (err) {
        console.error('Failed to load cities for community assignment', err);
      }
    };
    fetchCities();
  }, []);

  const [form, setForm] = useState({
    name: '',
    description: '',
    cityIds: [],
    logoUrl: '',
    bannerUrl: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <div className="community-modal community-modal-wide" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="community-modal-header">
          <h3>🏛️ Create New Community</h3>
          <button className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          
          <div className="community-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="community-form-group">
              <label>Community Name *</label>
              <input
                type="text"
                placeholder="e.g. Namdev Samaj"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="community-input"
              />
            </div>
            <div className="community-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Assigned Cities * (Select multiple if needed)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableCities.length > 0 ? (
                  availableCities.map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => toggleCity(city.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
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
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-dashed border-gray-300">
                    No active cities available. Please create cities in City Management first.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="community-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="community-form-group">
              <label>Community Logo</label>
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
                style={{ padding: '8px' }}
              />
              {form.logoUrl && form.logoUrl.startsWith('data:image') && (
                <div className="mt-1 text-xs text-brand-primary">Logo selected</div>
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
          </div>

          <div className="community-form-group">
            <label>Description</label>
            <textarea
              placeholder="Write description about this community..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="community-textarea"
              rows={2}
            />
          </div>

          {error && <p className="community-form-error">⚠️ {error}</p>}
          <div className="community-modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="community-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="community-btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '✓ Create Community'}
            </button>
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

  useEffect(() => {
    // Fetch available cities when modal opens
    const fetchCities = async () => {
      try {
        const cities = await cityService.fetchCities();
        setAvailableCities(cities.filter(c => c.status === 'Active'));
      } catch (err) {
        console.error('Failed to load cities for community assignment', err);
      }
    };
    fetchCities();
  }, []);

  const [form, setForm] = useState({
    name: community.name || '',
    description: community.description || '',
    city: community.city || '',
    cityIds: community.cityIds || [],
    logoUrl: community.logoUrl || '',
    bannerUrl: community.bannerUrl || '',
    isActive: community.isActive !== undefined ? community.isActive : true,
    headId: community.headId?._id || community.headId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <h3>✏️ Edit Community Details</h3>
          <button className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="community-form-group">
            <label>Community Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="community-input"
            />
          </div>

          <div className="community-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <div className="community-form-group">
              <label>Assigned Cities * (Select multiple if needed)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableCities.length > 0 ? (
                  availableCities.map(city => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => toggleCity(city.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
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
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-dashed border-gray-300">
                    No active cities available. Please create cities in City Management first.
                  </div>
                )}
              </div>
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
          </div>

          <div className="community-form-group">
            <label>Community Logo</label>
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
              style={{ padding: '8px' }}
            />
            {form.logoUrl && (
              <div className="mt-1 text-xs text-brand-primary truncate">
                {form.logoUrl.startsWith('data:image') ? 'New logo selected' : 'Current logo: ' + form.logoUrl}
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
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-28">
                <img src={form.bannerUrl} alt="Banner Preview" className="w-full h-24 object-cover" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>

          <div className="community-form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="community-textarea"
              rows={3}
            />
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
              {community.headId && (
                <option value={community.headId._id || community.headId}>
                  Current: {community.headId.name || community.headId}
                </option>
              )}
              {/* Note: In a production setting, this would fetch a list of eligible users with the 'head' role from userService */}
            </select>
            <small className="community-hint">
              ℹ️ Select an eligible user to assign as the Community Head.
            </small>
          </div>

          {error && <p className="community-form-error">⚠️ {error}</p>}
          <div className="community-modal-actions">
            <button type="button" className="community-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="community-btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
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
          <h3>⚙️ Module Settings — {community.name}</h3>
          <button className="community-modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="community-settings-subtitle">
          Control which modules are enabled for this community.
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
        <div className="community-modal-actions">
          <button className="community-btn-secondary" onClick={onClose}>Close</button>
          <button className="community-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CommunityCard
// ─────────────────────────────────────────────
const CommunityCard = ({ community, onEdit, onModules, onDelete }) => {
  const head = community.headId;
  const enabledModules = MODULE_FLAGS.filter(m => community.settings?.[m.key]);

  return (
    <div className={`community-card ${!community.isActive ? 'community-card-inactive' : ''}`}>
      {/* Status badge */}
      <div className={`community-status-badge ${community.isActive ? 'active' : 'inactive'}`}>
        {community.isActive ? '● Active' : '○ Inactive'}
      </div>

      {/* Community Logo + Name */}
      <div className="community-card-header">
        <div className="community-logo">
          {community.logoUrl
            ? <img src={community.logoUrl} alt={community.name} />
            : <span>{community.name.charAt(0).toUpperCase()}</span>}
        </div>
        <div>
          <h3 className="community-card-name">{community.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            {community.city && <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: '700' }}>📍 {community.city}</span>}
            {community.slug && <p className="community-card-slug" style={{ margin: 0 }}>/{community.slug}</p>}
          </div>
        </div>
      </div>

      {/* Created Date */}
      <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '-4px 0 12px' }}>
        📅 Created: {new Date(community.createdAt).toLocaleDateString()}
      </p>

      {/* Stats */}
      <div className="community-card-stats">
        <div className="community-stat">
          <span className="community-stat-value">{community.memberCount || 0}</span>
          <span className="community-stat-label">Members</span>
        </div>
        <div className="community-stat">
          <span className="community-stat-value">{enabledModules.length}</span>
          <span className="community-stat-label">Modules Active</span>
        </div>
      </div>

      {/* Head Info */}
      <div className="community-head-section">
        <span className="community-section-label">Community Head</span>
        {head ? (
          <div className="community-head-info">
            <div className="community-head-avatar-sm">
              {head.avatar
                ? <img src={head.avatar} alt={head.name} />
                : <span>{(head.name || 'H').charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <p className="community-head-name-sm">{head.name}</p>
              <p className="community-head-email-sm">{head.email}</p>
            </div>
          </div>
        ) : (
          <p className="community-no-head">⚠️ No Head assigned</p>
        )}
      </div>

      {/* Active Modules */}
      {enabledModules.length > 0 && (
        <div className="community-modules-preview">
          {enabledModules.slice(0, 5).map(m => (
            <span key={m.key} className="community-module-chip">{m.icon} {m.label}</span>
          ))}
          {enabledModules.length > 5 && (
            <span className="community-module-chip-more">+{enabledModules.length - 5}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="community-card-actions">
        <button className="community-action-btn" onClick={() => onEdit(community)} title="Edit Details">
          ✏️ Edit Details
        </button>
        <button className="community-action-btn" onClick={() => onModules(community)} title="Module Settings">
          ⚙️ Modules
        </button>
        <button className="community-action-btn community-action-danger" onClick={() => onDelete(community)} title="Deactivate">
          🗑️ Deactivate
        </button>
      </div>
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
  const [search, setSearch] = useState('');

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const res = await getAllCommunities();
      setCommunities(res.data || []);
    } catch (err) {
      setError('Failed to load communities. Is backend connected?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommunities(); }, []);

  const handleDelete = async (community) => {
    if (!window.confirm(`Are you sure you want to deactivate "${community.name}"?`)) return;
    try {
      await deleteCommunity(community._id);
      fetchCommunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Deactivation failed');
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
        {/* Header */}
        <div className="communities-header">
          <div>
            <h1 className="communities-title">🏛️ Community Management</h1>
            <p className="communities-subtitle">
              Centralized platform for creating communities, configuring module toggles, and assigning heads.
            </p>
          </div>
          <button className="community-btn-primary communities-create-btn" onClick={() => setShowCreate(true)}>
            + New Community
          </button>
        </div>

        {/* Stats Bar */}
        <div className="communities-stats-bar">
          <div className="communities-stat-item">
            <span className="communities-stat-number">{communities.length}</span>
            <span className="communities-stat-label">Total Communities</span>
          </div>
          <div className="communities-stat-item">
            <span className="communities-stat-number">{communities.filter(c => c.isActive).length}</span>
            <span className="communities-stat-label">Active</span>
          </div>
          <div className="communities-stat-item">
            <span className="communities-stat-number">{communities.filter(c => c.headId).length}</span>
            <span className="communities-stat-label">Head Assigned</span>
          </div>
          <div className="communities-stat-item">
            <span className="communities-stat-number">{communities.reduce((sum, c) => sum + (c.memberCount || 0), 0)}</span>
            <span className="communities-stat-label">Total Members</span>
          </div>
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

        {/* Content */}
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
          <div className="communities-grid">
            {filtered.map(community => (
              <CommunityCard
                key={community._id}
                community={community}
                onEdit={setEditTarget}
                onModules={setModuleTarget}
                onDelete={handleDelete}
              />
            ))}
          </div>
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
// Inline Styles (scoped)
// ─────────────────────────────────────────────
const COMMUNITIES_PAGE_STYLES = `
  .communities-page {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Sora', sans-serif;
  }
  .communities-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .communities-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
  }
  .communities-subtitle {
    color: #6b7280;
    margin: 4px 0 0;
    font-size: 0.9rem;
  }
  .communities-stats-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .communities-stat-item {
    background: linear-gradient(135deg, #667eea22, #764ba222);
    border: 1px solid #667eea33;
    border-radius: 12px;
    padding: 14px 20px;
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
  .communities-stat-number {
    display: block;
    font-size: 1.6rem;
    font-weight: 700;
    color: #667eea;
  }
  .communities-stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .communities-search-bar {
    margin-bottom: 20px;
  }
  .communities-search-input {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .communities-search-input:focus { border-color: #667eea; }
  .communities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .community-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    border: 1.5px solid #e5e7eb;
    position: relative;
    transition: box-shadow 0.2s, transform 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .community-card:hover {
    box-shadow: 0 8px 24px rgba(102,126,234,0.15);
    transform: translateY(-2px);
  }
  .community-card-inactive { opacity: 0.6; }
  .community-status-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .community-status-badge.active { background: #d1fae5; color: #065f46; }
  .community-status-badge.inactive { background: #fee2e2; color: #991b1b; }
  .community-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .community-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 700;
    color: #fff;
    overflow: hidden;
    flex-shrink: 0;
  }
  .community-logo img { width: 100%; height: 100%; object-fit: cover; }
  .community-card-name { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin: 0; }
  .community-card-slug { font-size: 0.75rem; color: #9ca3af; margin: 2px 0 0; }
  .community-card-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 14px;
  }
  .community-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #f9fafb;
    border-radius: 8px;
    padding: 8px 16px;
    flex: 1;
  }
  .community-stat-value { font-size: 1.2rem; font-weight: 700; color: #667eea; }
  .community-stat-label { font-size: 0.7rem; color: #6b7280; }
  .community-head-section { margin-bottom: 12px; }
  .community-section-label { font-size: 0.75rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .community-head-info { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
  .community-head-avatar-sm {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #f093fb, #f5576c);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  }
  .community-head-avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
  .community-head-name-sm { font-size: 0.9rem; font-weight: 600; color: #1a1a2e; margin: 0; }
  .community-head-email-sm { font-size: 0.75rem; color: #6b7280; margin: 0; }
  .community-no-head { font-size: 0.82rem; color: #d97706; margin: 6px 0 0; }
  .community-modules-preview { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .community-module-chip {
    background: #ede9fe; color: #6d28d9;
    font-size: 0.7rem; padding: 3px 8px; border-radius: 20px; font-weight: 500;
  }
  .community-module-chip-more {
    background: #e5e7eb; color: #6b7280;
    font-size: 0.7rem; padding: 3px 8px; border-radius: 20px;
  }
  .community-card-actions {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #f3f4f6;
  }
  .community-action-btn {
    flex: 1;
    padding: 8px 4px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
  }
  .community-action-btn:hover { background: #f3f4f6; border-color: #667eea; color: #667eea; }
  .community-action-danger:hover { background: #fef2f2; border-color: #ef4444; color: #ef4444; }

  /* Modal */
  .community-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;
  }
  .community-modal {
    background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 440px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.2); animation: modalSlideIn 0.25s ease;
  }
  .community-modal-wide { max-width: 560px; }
  @keyframes modalSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .community-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px;
  }
  .community-modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
  .community-modal-close {
    background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #6b7280;
    width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  }
  .community-modal-close:hover { background: #f3f4f6; }
  .community-form-group { margin-bottom: 16px; }
  .community-form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .community-input, .community-textarea {
    width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px;
    font-size: 0.9rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;
    font-family: inherit;
  }
  .community-input:focus, .community-textarea:focus { border-color: #667eea; }
  .community-input-mono { font-family: 'Courier New', monospace; font-size: 0.82rem; }
  .community-hint { font-size: 0.75rem; color: #9ca3af; margin-top: 4px; display: block; }
  .community-form-error { color: #ef4444; font-size: 0.82rem; margin: 8px 0; }
  .community-modal-divider { text-align: center; color: #9ca3af; font-size: 0.82rem; margin: 12px 0; position: relative; }
  .community-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .community-current-head {
    display: flex; align-items: center; gap: 12px; background: #f0fdf4;
    border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 16px;
  }
  .community-head-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  }
  .community-head-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .community-head-name { font-size: 0.9rem; font-weight: 700; color: #1a1a2e; margin: 0; }
  .community-head-email { font-size: 0.78rem; color: #6b7280; margin: 2px 0 0; }
  .community-settings-subtitle { font-size: 0.85rem; color: #6b7280; margin-bottom: 16px; }
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

  /* Buttons */
  .community-btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff; border: none; border-radius: 10px; padding: 10px 20px;
    font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
  }
  .community-btn-primary:hover:not(:disabled) { opacity: 0.9; }
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
    width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #667eea;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default CommunitiesPage;
