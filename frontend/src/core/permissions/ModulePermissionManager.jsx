/**
 * ModulePermissionManager
 * Assign Head-panel modules to the users directly under the logged-in administrator.
 * Used by the Admin panel (Master Admin → Community Heads) and the Head panel
 * (Community Head → Local Heads / Sub-Heads, Local Head → their Sub-Heads).
 *
 * Only modules the administrator holds are shown, and the server re-validates
 * every save (modules must be a subset of the administrator's own modules).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Shield, Users, Save, RotateCcw, History, ChevronLeft, Loader2, Layers,
  CheckCircle2, AlertCircle, Info, ArrowDownToLine, Lock
} from 'lucide-react';
import { modulePermissionApi } from './modulePermissionApi';

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;
const sameSet = (a, b) => a.length === b.length && a.every(k => b.includes(k));

const StatCard = ({ label, value, tone }) => (
  <div className={`rounded-xl border px-3 py-2.5 ${tone}`}>
    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
    <p className="text-xl font-black leading-tight mt-0.5">{value}</p>
  </div>
);

const ModulePermissionManager = ({ title = 'Module Permissions', subtitle }) => {
  const [me, setMe] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [myModules, setMyModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [tab, setTab] = useState('assign');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [showEditorMobile, setShowEditorMobile] = useState(false);

  const [mode, setMode] = useState('inherit');           // 'inherit' | 'custom'
  const [draft, setDraft] = useState([]);                 // module keys when mode === 'custom'
  const [moduleSearch, setModuleSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);              // { type: 'success' | 'error', text, details? }

  const [audit, setAudit] = useState({ entries: [], loading: false, error: '' });

  const labelOf = useCallback((key) => catalog.find(m => m.key === key)?.label || key, [catalog]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    const res = await modulePermissionApi.getSubordinates();
    setUsers(res.data?.data?.users || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const meRes = await modulePermissionApi.getMyAccess();
      const { catalog: cat = [], modules = [], ...rest } = meRes.data?.data || {};
      setCatalog(cat);
      setMyModules(modules);
      setMe(rest);
      await loadUsers();
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load module permissions.'));
    } finally {
      setLoading(false);
    }
  }, [loadUsers]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadAudit = useCallback(async () => {
    setAudit(a => ({ ...a, loading: true, error: '' }));
    try {
      const res = await modulePermissionApi.getAuditLog({ limit: 100 });
      setAudit({ entries: res.data?.data?.entries || [], loading: false, error: '' });
    } catch (err) {
      setAudit({ entries: [], loading: false, error: errorMessage(err, 'Could not load the change history.') });
    }
  }, []);

  useEffect(() => { if (tab === 'audit') loadAudit(); }, [tab, loadAudit]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const selected = users.find(u => u._id === selectedId) || null;
  const savedMode = selected?.restricted ? 'custom' : 'inherit';
  const savedModules = useMemo(
    () => (selected?.restricted ? selected.assignedModules.filter(k => myModules.includes(k)) : myModules),
    [selected, myModules]
  );
  const draftModules = mode === 'inherit' ? myModules : draft;
  const isDirty = !!selected && (mode !== savedMode || (mode === 'custom' && !sameSet(draft, savedModules)));

  const resetDraft = useCallback((user) => {
    setMode(user?.restricted ? 'custom' : 'inherit');
    setDraft(user?.restricted ? user.assignedModules.filter(k => myModules.includes(k)) : [...myModules]);
  }, [myModules]);

  const selectUser = (user) => {
    if (isDirty && user._id !== selectedId && !window.confirm('Discard unsaved changes for this user?')) return;
    setSelectedId(user._id);
    resetDraft(user);
    setNotice(null);
    setShowEditorMobile(true);
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const roleOptions = useMemo(() => [...new Set(users.map(u => u.roleLabel))], [users]);
  const visibleUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter(u =>
      (roleFilter === 'all' || u.roleLabel === roleFilter) &&
      (!q || [u.name, u.email, u.phone, u.city, u.designation, u.roleLabel].some(v => (v || '').toString().toLowerCase().includes(q))));
  }, [users, userSearch, roleFilter]);

  // Only the modules this administrator holds can be managed
  const manageable = useMemo(() => catalog.filter(m => myModules.includes(m.key)), [catalog, myModules]);
  const categories = useMemo(() => [...new Set(manageable.map(m => m.category))], [manageable]);
  const visibleModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    return manageable.filter(m =>
      (categoryFilter === 'all' || m.category === categoryFilter) &&
      (!q || m.label.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)));
  }, [manageable, moduleSearch, categoryFilter]);

  // ── Editing ───────────────────────────────────────────────────────────────
  const toggleModule = (key) => {
    if (mode !== 'custom') return;
    setDraft(d => (d.includes(key) ? d.filter(k => k !== key) : [...d, key]));
  };
  const setVisible = (checked) => {
    if (mode !== 'custom') return;
    const keys = visibleModules.map(m => m.key);
    setDraft(d => (checked ? [...new Set([...d, ...keys])] : d.filter(k => !keys.includes(k))));
  };
  const switchMode = (next) => {
    if (next === mode) return;
    if (next === 'custom') setDraft(mode === 'inherit' ? [...myModules] : draft);
    setMode(next);
  };

  const save = async () => {
    if (!selected || !isDirty) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = mode === 'inherit'
        ? await modulePermissionApi.inheritAll(selected._id)
        : await modulePermissionApi.assignModules(selected._id, draft);
      const cascade = res.data?.data?.cascade || [];
      setNotice({
        type: 'success',
        text: res.data?.message || 'Module access updated.',
        details: cascade.map(c => `${c.name} (${c.roleLabel}) lost: ${c.removed.map(labelOf).join(', ')}`)
      });
      const updated = res.data?.data?.user;
      setUsers(list => list.map(u => (u._id === updated?._id ? updated : u)));
      if (updated) resetDraft(updated);
      window.dispatchEvent(new Event('module-access:changed'));
      if (tab === 'audit') loadAudit();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not save module access.') });
      if (err?.response?.status === 403) loadAll(); // my own access may have changed
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> Loading module permissions…
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white border border-rose-100 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto text-rose-500 mb-2" size={28} />
        <p className="text-sm font-semibold text-slate-800">{loadError}</p>
        <button onClick={loadAll} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Try again</button>
      </div>
    );
  }

  const assignedCount = selected ? draftModules.length : 0;

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="text-indigo-600" size={24} /> {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {subtitle || 'Choose which modules each person directly under you can use. You can only give modules you have yourself.'}
          </p>
        </div>
        <div className="inline-flex bg-slate-100 rounded-xl p-1 self-start">
          {[{ id: 'assign', label: 'Assign', icon: Layers }, { id: 'audit', label: 'Change history', icon: History }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Where my modules come from */}
      <div className="flex items-start gap-2 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-indigo-900">
        <ArrowDownToLine size={15} className="shrink-0 mt-0.5 text-indigo-500" />
        {me?.isMasterAdmin ? (
          <span>As <b>Master Admin</b> you hold every module and assign them to Community Heads.</span>
        ) : (
          <span>
            Your {myModules.length} module{myModules.length === 1 ? '' : 's'} are inherited from{' '}
            <b>{me?.parent?.name}</b> ({me?.parent?.roleLabel}). If they remove one, it is removed from everyone below you too.
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <StatCard label="Total modules" value={catalog.length} tone="bg-white border-slate-200 text-slate-800" />
        <StatCard label="Available to you" value={myModules.length} tone="bg-indigo-50 border-indigo-100 text-indigo-800" />
        <StatCard label={selected ? `Assigned to ${selected.name.split(' ')[0]}` : 'Assigned'} value={selected ? assignedCount : '—'} tone="bg-emerald-50 border-emerald-100 text-emerald-800" />
        <StatCard label="Remaining assignable" value={selected ? myModules.length - assignedCount : '—'} tone="bg-amber-50 border-amber-100 text-amber-800" />
      </div>

      {tab === 'audit' ? (
        <AuditList audit={audit} labelOf={labelOf} onRetry={loadAudit} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* ── Users ── */}
          <section className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${showEditorMobile ? 'hidden lg:block' : ''}`}>
            <div className="p-3 border-b border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} /> People under you ({users.length})
              </p>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, phone, city…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              {roleOptions.length > 1 && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400"
                >
                  <option value="all">All roles</option>
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {visibleUsers.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-400">
                  {users.length ? 'No one matches your search.' : 'Nobody reports to you yet.'}
                </p>
              )}
              {visibleUsers.map(u => (
                <div key={u._id} className={`p-3 flex items-center gap-3 ${u._id === selectedId ? 'bg-indigo-50/60' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.roleLabel}{u.city ? ` · ${u.city}` : ''}</p>
                    <p className="text-[11px] mt-0.5">
                      {u.restricted
                        ? <span className="text-emerald-700 font-semibold">{u.effectiveModules.length} module{u.effectiveModules.length === 1 ? '' : 's'}</span>
                        : <span className="text-indigo-600 font-semibold">Inherits all of yours</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => selectUser(u)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Assign Permissions
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Editor ── */}
          <section className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${showEditorMobile ? '' : 'hidden lg:block'}`}>
            {!selected ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <Layers className="mx-auto mb-2" size={28} />
                Pick someone on the left and press <b>Assign Permissions</b>.
              </div>
            ) : (
              <>
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center gap-2">
                  <button onClick={() => setShowEditorMobile(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100" aria-label="Back">
                    <ChevronLeft size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 truncate">{selected.name}</p>
                    <p className="text-[11px] text-slate-500">{selected.roleLabel}{selected.designation ? ` · ${selected.designation}` : ''}</p>
                  </div>
                  {isDirty && <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Unsaved</span>}
                </div>

                <div className="p-3 sm:p-4 space-y-3">
                  {/* Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'inherit', title: 'Everything I have', text: 'Gets all your modules now and any you receive later.' },
                      { id: 'custom', title: 'Choose modules', text: 'Only the modules you tick below.' }
                    ].map(o => (
                      <button
                        key={o.id}
                        onClick={() => switchMode(o.id)}
                        className={`text-left rounded-xl border p-3 transition-colors ${mode === o.id ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <p className="text-sm font-bold text-slate-900">{o.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{o.text}</p>
                      </button>
                    ))}
                  </div>

                  {/* Module filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={moduleSearch}
                        onChange={(e) => setModuleSearch(e.target.value)}
                        placeholder="Search modules…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-indigo-400"
                    >
                      <option value="all">All categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {mode === 'custom' && visibleModules.length > 0 && (
                    <div className="flex gap-3 text-xs font-bold">
                      <button onClick={() => setVisible(true)} className="text-indigo-600 hover:underline">Select all shown</button>
                      <button onClick={() => setVisible(false)} className="text-slate-500 hover:underline">Clear shown</button>
                    </div>
                  )}

                  {/* Modules */}
                  {manageable.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 flex items-center gap-2">
                      <Lock size={16} /> You have no modules to delegate yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[52vh] overflow-y-auto pr-1">
                      {visibleModules.map(m => {
                        const checked = draftModules.includes(m.key);
                        const hadBefore = selected.effectiveModules.includes(m.key);
                        const change = checked && !hadBefore ? 'added' : !checked && hadBefore ? 'removed' : null;
                        return (
                          <label
                            key={m.key}
                            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${mode === 'custom' ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default'} ${checked ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={mode !== 'custom'}
                              onChange={() => toggleModule(m.key)}
                              className="mt-0.5 w-4 h-4 accent-indigo-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-bold text-slate-900">{m.label}</span>
                                {mode === 'inherit' && <span className="text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Inherited</span>}
                                {change === 'added' && <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Will add</span>}
                                {change === 'removed' && <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">Will remove</span>}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{m.category}</p>
                            </div>
                          </label>
                        );
                      })}
                      {visibleModules.length === 0 && <p className="text-sm text-slate-400 p-2">No modules match.</p>}
                    </div>
                  )}

                  {notice && (
                    <div className={`rounded-xl px-3 py-2.5 text-sm flex gap-2 ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                      {notice.type === 'success' ? <CheckCircle2 size={17} className="shrink-0 mt-0.5" /> : <AlertCircle size={17} className="shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-semibold">{notice.text}</p>
                        {notice.details?.map(d => <p key={d} className="text-xs mt-1 opacity-90">{d}</p>)}
                      </div>
                    </div>
                  )}

                  {mode === 'custom' && savedModules.some(k => !draft.includes(k)) && (
                    <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                      <Info size={13} className="shrink-0 mt-0.5" />
                      Modules you remove are also removed from everyone {selected.name.split(' ')[0]} has given them to.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button
                      onClick={() => resetDraft(selected)}
                      disabled={!isDirty || saving}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40"
                    >
                      <RotateCcw size={15} /> Reset
                    </button>
                    <button
                      onClick={save}
                      disabled={!isDirty || saving}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-40"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const ACTION_LABEL = { assign: 'Assigned', inherit_all: 'Set to inherit all', cascade_revoke: 'Auto-removed' };

const AuditList = ({ audit, labelOf, onRetry }) => {
  if (audit.loading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>;
  }
  if (audit.error) {
    return (
      <div className="bg-white border border-rose-100 rounded-2xl p-6 text-center text-sm text-rose-700">
        {audit.error} <button onClick={onRetry} className="underline font-semibold ml-1">Retry</button>
      </div>
    );
  }
  if (!audit.entries.length) {
    return <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400">No permission changes yet.</div>;
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
      {audit.entries.map(e => (
        <div key={e._id} className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${e.action === 'cascade_revoke' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'}`}>
              {ACTION_LABEL[e.action] || e.action}
            </span>
            <span className="font-bold text-slate-900">{e.targetName}</span>
            <span className="text-slate-400">by</span>
            <span className="font-semibold text-slate-700">{e.actorName}</span>
            <span className="text-[11px] text-slate-400">({e.actorRole})</span>
            <span className="text-[11px] text-slate-400 sm:ml-auto">{new Date(e.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {e.added?.map(k => <span key={`a${k}`} className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">+ {labelOf(k)}</span>)}
            {e.removed?.map(k => <span key={`r${k}`} className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">− {labelOf(k)}</span>)}
            {!e.added?.length && !e.removed?.length && <span className="text-[11px] text-slate-400">No effective change</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModulePermissionManager;
